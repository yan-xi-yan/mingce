"""Read-only export of verified lab evidence + Spark History APIs for the UI.

Usage: python3 scripts/import-real-runs.py /path/to/jdbc-iceberg-validation
Does not submit jobs or modify the lab. Fails atomically if API collection fails.
"""
import argparse
import io
import zipfile
import concurrent.futures
import datetime as dt
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
NAMES = {
    'crud': '订单 CRUD 与时间旅行验证', 'writer-a': '并发写入 A',
    'writer-b': '并发写入 B', 'activity-recovery': 'Worker 故障恢复',
    'commit-then-fail': '提交成功后故障验证', 'business-retry': '业务幂等重试',
    'cancel': '运行取消验证', 'verify-before-restart': '重启前数据校验',
    'verify-after-restart': '重启后持久化校验',
}


def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def millis(value):
    if not value:
        return None
    return int(dt.datetime.fromisoformat(value.replace('GMT', '+00:00').replace('Z', '+00:00')).timestamp() * 1000)


def scrub(value):
    # Credentials never belong in the display artifact, including log excerpts.
    value = re.sub(r'(?i)((?:password|secret(?:[._-]?key)?|access[._-]?key|token|credential)\s*[=:]\s*)[^\s,;]+', r'\1[REDACTED]', value)
    return re.sub(r'(https?://)[^\s/@]+:[^\s/@]+@', r'\1[REDACTED]@', value)


def collect(lab, history):
    validation = read(lab / 'evidence/validation.json')
    assert validation['passed'], 'Only import a completed verified suite'
    captured = dt.datetime.now(dt.timezone.utc).isoformat()
    namespace = validation['namespace']
    snapshots = []
    for path in sorted((lab / 'data/inspection' / namespace).glob('*-current-metadata.json')):
        table = 'lake.' + namespace + '.' + path.name.removesuffix('-current-metadata.json')
        for s in read(path).get('snapshots', []):
            summary = s.get('summary', {})
            snapshots.append({
                'applicationId': summary.get('spark.app.id') or summary.get('app-id'),
                'name': table, 'snapshotId': str(s['snapshot-id']),
                'parentSnapshotId': str(s['parent-snapshot-id']) if s.get('parent-snapshot-id') else None,
                'committedAt': s['timestamp-ms'], 'operation': summary.get('operation'),
                'physicalRecords': summary.get('total-records'),
            })
    records = []
    for scenario, build in validation['builds'].items():
        folder = lab / 'data/runs' / build
        temporal, metadata = read(folder / 'temporal.json'), read(folder / 'metadata.json')
        application = read(folder / 'application.json')['application_id']
        base = history.rstrip('/') + '/api/v1/applications/' + application

        def api(path):
            with urllib.request.urlopen(base + path, timeout=20) as response:
                return json.load(response)

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            app, jobs, stages, executors, environment, sql = list(pool.map(api, ['', '/jobs', '/stages', '/allexecutors', '/environment', '/sql']))
        # Stage parent relationships come from event logs, never from timestamp guesses.
        with urllib.request.urlopen(base + '/logs', timeout=30) as response:
            archive = zipfile.ZipFile(io.BytesIO(response.read()))
        stage_info = {}
        for entry in archive.infolist():
            if entry.is_dir(): continue
            for line in archive.read(entry).splitlines():
                try: event = json.loads(line)
                except (ValueError, UnicodeDecodeError): continue
                infos = event.get('Stage Infos', []) if event.get('Event') == 'SparkListenerJobStart' else [event['Stage Info']] if 'Stage Info' in event else []
                for info in infos:
                    stage_info[(info['Stage ID'], info['Stage Attempt ID'])] = info
        attempt = app['attempts'][-1]
        app_start = attempt['startTimeEpoch']

        def stage_tasks(stage):
            if not stage.get('submissionTime'):
                return []
            result = []
            while True:
                page = api('/stages/%s/%s/taskList?offset=%s&length=1000' % (stage['stageId'], stage['attemptId'], len(result)))
                result.extend(page)
                if len(page) < 1000:
                    return result

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            task_lists = list(pool.map(stage_tasks, stages))
        normalized_stages, task_intervals = [], []
        for stage, tasks in zip(stages, task_lists):
            start, end = millis(stage.get('submissionTime')), millis(stage.get('completionTime'))
            for task in tasks:
                launch = millis(task.get('launchTime'))
                # Missing ends remain missing; cancelled tasks are not fabricated as complete.
                if launch is not None and task.get('duration') is not None and task.get('status') != 'RUNNING':
                    task_intervals.append((launch - app_start, launch - app_start + task['duration']))
            normalized_stages.append({
                'id': str(stage['stageId']) + '.' + str(stage['attemptId']),
                'stageId': stage['stageId'], 'attemptId': stage['attemptId'],
                'name': stage.get('name'), 'status': stage['status'],
                'startMs': start - app_start if start is not None else None,
                'durationMs': end - start if start is not None and end is not None else None,
                'taskRuntimeMs': sum(t['duration'] for t in tasks) if tasks and all(t.get('duration') is not None and t.get('status') != 'RUNNING' for t in tasks) else None,
                'completedTasks': stage.get('numCompleteTasks'), 'totalTasks': stage.get('numTasks'),
                'shuffleWriteBytes': stage.get('shuffleWriteBytes'), 'diskSpillBytes': stage.get('diskBytesSpilled'),
                'parentIds': stage_info.get((stage['stageId'], stage['attemptId']), {}).get('Parent IDs'),
                'tasks': [{'id': t['taskId'], 'attempt': t['attempt'], 'status': t['status'], 'executorId': t['executorId'], 'durationMs': t.get('duration'), 'peakMemoryBytes': t.get('taskMetrics', {}).get('peakExecutionMemory'), 'diskSpillBytes': t.get('taskMetrics', {}).get('diskBytesSpilled'), 'inputRecords': t.get('taskMetrics', {}).get('inputMetrics', {}).get('recordsRead'), 'inputBytes': t.get('taskMetrics', {}).get('inputMetrics', {}).get('bytesRead'), 'shuffleReadBytes': sum(t.get('taskMetrics', {}).get('shuffleReadMetrics', {}).get(k, 0) for k in ['remoteBytesRead', 'localBytesRead']) if t.get('taskMetrics') else None} for t in tasks],
            })
        deltas = {}
        for start, end in task_intervals:
            deltas[start] = deltas.get(start, 0) + 1
            deltas[end] = deltas.get(end, 0) - 1
        concurrency, active = [], 0
        for time, delta in sorted(deltas.items()):
            active += delta
            concurrency.append({'timeMs': time, 'activeTasks': active})
        finished_tasks = sum(len(ts) for ts in task_lists) == len(task_intervals)
        runtime = read(folder / 'runtime.json', {})
        result = read(folder / 'result.json', {})
        own_snapshots = sorted([s for s in snapshots if s['applicationId'] == application], key=lambda s:s['committedAt'])
        events = []
        for event in read(folder / 'temporal-history.json', {}).get('events', []):
            kind = event['eventType'].removeprefix('EVENT_TYPE_')
            events.append({'time': millis(event['eventTime']), 'level': 'ERROR' if 'FAILED' in kind else 'INFO', 'message': kind})
        config = {k: scrub(str(v)) for k, v in environment.get('sparkProperties', []) if k in {
            'spark.app.name', 'spark.master', 'spark.driver.memory', 'spark.executor.memory',
            'spark.executor.cores', 'spark.cores.max', 'spark.sql.shuffle.partitions',
            'spark.sql.adaptive.enabled', 'spark.eventLog.enabled', 'spark.eventLog.dir',
            'spark.sql.extensions', 'spark.submit.deployMode', 'spark.serializer'}}
        log = (folder / 'driver.log').read_text(errors='replace') if (folder / 'driver.log').exists() else ''
        reason = {'commit-then-fail': '预期故障：Iceberg 已提交，随后任务失败；已提交快照仍保留。', 'cancel': '预期取消：应用已退出，实验确认 Executor 资源释放。', 'activity-recovery': 'Worker 恢复后 Activity 重试，实验确认仅启动一个 Spark 应用。'}.get(scenario)
        representative = max((s for s in sql if s.get('planDescription')), key=lambda s: s.get('duration') or 0, default={})
        records.append({
            'id': build, 'name': NAMES.get(scenario, scenario), 'taskId': 'lab-' + scenario,
            'type': 'code', 'runMode': 'LAB', 'trigger': 'LAB', 'demo': False, 'readOnly': True,
            'status': {'COMPLETED': 'SUCCEEDED', 'CANCELED': 'CANCELLED'}.get(temporal['status'], temporal['status']),
            'start': millis(temporal['start']), 'end': millis(temporal.get('close')),
            'startedAt': app_start, 'reason': reason,
            'inputs': [], 'outputs': [], 'icebergSnapshots': own_snapshots, 'events': events,
            'provenance': {'kind': 'VERIFIED_LAB', 'capturedAt': captured, 'suite': 'JDBC Catalog + Iceberg + SeaweedFS', 'sources': ['Temporal Event History', 'Spark History Server REST + event log', 'Iceberg table metadata', 'Runner driver.log'], 'workflowId': temporal['workflow_id'], 'temporalRunId': temporal['run_id'], 'activityId': metadata.get('activity_id'), 'activityAttempt': metadata.get('attempt'), 'codeHash': metadata.get('code_hash'), 'exitCode': result.get('exit_code'), 'evidencePath': 'data/runs/' + build, 'snapshotCoverage': '仅展示元数据中明确关联本 Application ID 的快照；未匹配不代表没有写入。'},
            'spark': {
                'applicationId': application, 'uiUrl': history.rstrip('/') + '/history/' + application + '/jobs/',
                'durationMs': attempt.get('duration'), 'applicationEndedAt': attempt.get('endTimeEpoch') if attempt.get('completed') else None,
                'taskRuntimeMs': sum(end-start for start,end in task_intervals) if finished_tasks else None,
                'shuffleWriteBytes': sum(s.get('shuffleWriteBytes', 0) for s in stages),
                'diskSpillBytes': sum(s.get('diskBytesSpilled', 0) for s in stages),
                'concurrencyComplete': finished_tasks, 'concurrency': concurrency,
                'stages': sorted(normalized_stages, key=lambda s:(s['stageId'],s['attemptId'])),
                'jobs': [{'id': j['jobId'], 'name': j['name'], 'status': j['status'], 'stageIds': j['stageIds']} for j in jobs],
                'queryPlan': representative.get('planDescription'), 'queryPlanExecutionId': representative.get('id'),
                'sqlExecutions': [{'id': s['id'], 'description': s['description'], 'plan': s.get('planDescription'), 'jobIds': s.get('successJobIds', [])+s.get('failedJobIds', [])+s.get('runningJobIds', [])} for s in sql],
                'executors': [{'id': x['id'], 'host': x.get('hostPort'), 'active': False if attempt.get('completed') else x.get('isActive'), 'cores': x.get('totalCores'), 'completedTasks': x.get('completedTasks'), 'peakMemoryBytes': x.get('peakMemoryMetrics', {}).get('JVMHeapMemory') or None, 'startedAt': millis(x.get('addTime')), 'endedAt': millis(x.get('removeTime'))} for x in executors],
                'config': config, 'dependencies': [{'name': k, 'version': v} for k,v in runtime.items()],
                'logs': scrub(log[-18000:]), 'logLabel': 'Driver 日志（末尾节选）',
                'metricNote': '累计 Task 耗时按已结束 attempt 的 wall duration 求和；并行度 = 累计耗时 / 首个 Stage 到最后一个 Stage 的计算跨度。Stage ID 使用 stage.attempt，依赖来自事件日志。未记录的内存峰值显示 —。',
            },
        })
        print(build, application, 'jobs', len(jobs), 'tasks', sum(map(len,task_lists)), 'snapshots', len(own_snapshots))
    return {'schemaVersion': 1, 'project': '供应链分析', 'organizationId': 'east', 'capturedAt': captured, 'runs': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('lab', type=pathlib.Path)
    parser.add_argument('--history', default='http://127.0.0.1:18180')
    args = parser.parse_args()
    data = collect(args.lab, args.history)
    target = ROOT / 'appdashboard-app/assets/data/real-runs.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n')
    temporary.replace(target)
    print('Exported', len(data['runs']), 'runs;', target.stat().st_size, 'bytes')
