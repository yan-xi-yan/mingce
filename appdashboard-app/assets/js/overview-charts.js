// Chart options copied from AppDashboard Pro dashboard-projects.html.
// Only business series, labels and accessible descriptions are supplied by the app.
let charts=[];
export function disposeOverviewCharts(){for(const chart of charts)chart.destroy();charts=[];}
export function mountOverviewCharts(stats){
if(!stats.total)return;
      // Get CSS custom properties
      const style = getComputedStyle(document.documentElement);
      const accentColor = style.getPropertyValue('--accent-color').trim();
      const successColor = style.getPropertyValue('--success-color').trim();
      const warningColor = style.getPropertyValue('--warning-color').trim();
      const dangerColor = style.getPropertyValue('--danger-color').trim();
      const infoColor = style.getPropertyValue('--info-color').trim();
      const mutedColor = style.getPropertyValue('--muted-color').trim();
      const borderColor = style.getPropertyValue('--border-color').trim();
      // Project Progress Chart
      const projectProgressOptions = {
        series: [],
        chart: {
          type: 'bar',
          height: 320,
          stacked: true,
          toolbar: {
            show: false
          }
        },
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 4,
            columnWidth: '55%'
          }
        },
        dataLabels: {
          enabled: false
        },
        colors: [successColor, accentColor, warningColor],
        xaxis: {
          categories: [],
          axisBorder: {
            show: false
          },
          axisTicks: {
            show: false
          },
          labels: {
            style: {
              colors: mutedColor
            }
          }
        },
        yaxis: {
          labels: {
            style: {
              colors: mutedColor
            }
          }
        },
        grid: {
          borderColor: borderColor,
          strokeDashArray: 4
        },
        legend: {
          position: 'top',
          horizontalAlign: 'right'
        }
      };

      // Task Distribution Chart
      const taskDistributionOptions = {
        series: [],
        chart: {
          type: 'donut',
          height: 240
        },
        labels: [],
        colors: [successColor, accentColor, warningColor, dangerColor],
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total Tasks',
                  formatter: function() {
                    return String(stats.total);
                  }
                }
              }
            }
          }
        },
        dataLabels: {
          enabled: false
        },
        legend: {
          show: false
        },
        stroke: {
          width: 0
        }
      };


projectProgressOptions.series=stats.groups.map(g=>({name:g.label,data:stats.days.map(d=>d.counts[g.key])}));
projectProgressOptions.colors=stats.groups.map(g=>style.getPropertyValue(g.color).trim());
projectProgressOptions.xaxis.categories=stats.days.map(d=>d.label);
projectProgressOptions.yaxis.min=0;
projectProgressOptions.yaxis.forceNiceScale=true;
projectProgressOptions.yaxis.labels.formatter=value=>Number.isInteger(value)?String(value):'';
projectProgressOptions.chart.animations={enabled:false};
taskDistributionOptions.series=stats.groups.map(g=>g.count);
taskDistributionOptions.labels=stats.groups.map(g=>g.label);
taskDistributionOptions.colors=projectProgressOptions.colors;
taskDistributionOptions.plotOptions.pie.donut.labels.total.label='运行次数';
taskDistributionOptions.plotOptions.pie.donut.labels.total.formatter=()=>String(stats.total);
taskDistributionOptions.chart.animations={enabled:false};
for(const [selector,options]of [['#projectProgressChart',projectProgressOptions],['#taskDistributionChart',taskDistributionOptions]]){const chart=new ApexCharts(document.querySelector(selector),options);charts.push(chart);chart.render();}
}
