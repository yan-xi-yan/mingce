// Publication cadence belongs to the running collector, not to schedule plans.
export const DEFAULT_PUBLICATION_SECONDS=300;
export function publicationSeconds(record={}){const n=Number(record.versionIntervalSeconds??record.task?.versionIntervalSeconds??DEFAULT_PUBLICATION_SECONDS);return Number.isInteger(n)&&n>=60&&n<=86400?n:DEFAULT_PUBLICATION_SECONDS;}
export function validatePublicationSeconds(value){const n=Number(value??DEFAULT_PUBLICATION_SECONDS);if(!Number.isInteger(n)||n<60||n>86400)throw Error('版本发布间隔需为 60～86400 秒的整数');return n;}
export function intervalLabel(record){const n=publicationSeconds(record);return n%60===0?n/60+' 分钟':n+' 秒';}
export function nextPublication(run,now){
 if(run.status!=='RUNNING'||run.phase!=='SYNCING')return null;
 const syncAt=Date.parse(run.syncStartedAt||run.start),interval=publicationSeconds(run)*1000;
 if(!Number.isFinite(syncAt))return null;
 const previous=run.publications?.at(-1);
 // Legacy one-off runs resume from their last real publication, without replaying old windows.
 const anchor=previous?Date.parse(previous.windowEnd||previous.publishedAt):run.outputCommitted?Date.parse(run.objects?.find(o=>o.publishedAt)?.publishedAt||run.syncStartedAt||run.start):syncAt;
 const initial=!previous&&!run.outputCommitted&&run.task?.cdc?.['snapshot.mode']!=='no_data';
 const count=initial?1:Math.max(1,Math.floor((now-anchor)/interval));
 const end=initial?syncAt:anchor+interval*count;
 return now>=end?{kind:initial?'INITIAL':'WINDOW',mergedWindows:count,windowStart:new Date(initial?Date.parse(run.start):anchor).toISOString(),windowEnd:new Date(end).toISOString()}:null;
}
