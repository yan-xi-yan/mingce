# 明策 · AppDashboard Pro 原生前端

使用 HTML + Bootstrap + 普通 JavaScript。直接加载提供的 AppDashboard Pro 原始样式、Bootstrap CSS/JS、Bootstrap Icons 和模板主脚本，无需 React、Vite、TypeScript、打包或安装依赖。

## 启动

在本目录执行：

```powershell
node server.mjs
```

访问 http://127.0.0.1:3004/ 。也可执行 `npm run dev`，或使用任意静态服务器托管本目录。不要通过 file:// 打开，浏览器 ES Modules 需要 HTTP 服务。

发布时直接复制 `index.html` 和 `assets/`，无需构建。`server.mjs` 只是零依赖的本地静态服务器，不是业务后端。

## 代码

- `index.html`：原生 HTML 页面结构，包含模板导航、页头和标准 Bootstrap modal。
- `assets/css/main.css`：提供的 AppDashboard Pro 原始样式。
- `assets/vendor/bootstrap/`：提供的 Bootstrap 原始 CSS/JS；弹窗、页签使用官方插件及 data-bs 属性。
- `assets/vendor/bootstrap-icons/`：提供的原始图标文件。
- `assets/js/template-main.js`：模板原始主脚本，直接处理侧栏折叠等交互。
- `assets/css/workspace.css`：仅包含电脑端业务网格、间距、最小宽度、文本换行与隐藏布局规则，不覆盖组件颜色、字体、边框、阴影或内边距。
- `assets/js/app.js`：普通 DOM 事件、页面导航、列表和资源详情。
- `assets/js/resource-navigation.js`：资源详情 URL、原生链接及列表返回地址。
- `assets/js/editors.js`：原生 form、FormData、输入校验和保存事件，无 JSX 或虚拟 DOM。
- `assets/js/source-picker.js`：沿用原 `08-选择源表.html` / `采集对象配置.js` 的左表右字段操作，使用原模板列表组、表格、页签、复选框和输入组。
- `assets/js/source-catalog.js`：从原采集对象页面沿用的示例元数据及样例行，源表字段目录共用此数据源。
- `assets/js/domain/`：纯 JavaScript 业务规则，保留权限、项目隔离、发布校验和演示执行机制。
- `assets/js/schedule-engine.js`：原有调度时间计算。

模板原始文件保留 BootstrapMade 的版权和许可注释。界面使用模板的 btn、card、table、form-control、form-select、badge、modal、nav-tabs 等代码。

统计卡直接采用模板 `dashboard-projects.html` 的 `widget-stat` 结构；采集步骤条采用 `forms-wizard.html` 的 `wizard-steps` 结构；状态标签采用 `badge-soft-*`。业务内容和事件绑定由普通 JavaScript 填充。

## 业务流程

已对照远端 `origin/main` 最新提交 `9cadf1032003a1e257a4599be5b1aa1964e4fea5`（2026-10-19）适配交互逻辑，继续使用当前 AppDashboard Pro 原始组件：

- `73c9a1e` / `015dbab`：采集配置与运行历史分开；按任务和运行编号查看阶段、源表输出、关键事件；停止具体运行须确认。新启动保存配置快照，后续配置修改不改变该次运行。
- `1c4a398`：数据集列表通过名称统一进入详情，移除列表操作列。字段、版本、来源使用同一个数据集标识，来源任务按生产任务标识解析。空手动数据集为“待录入”，无版本；CSV 导入生成版本 1，支持首行含义、字段名称/类型确认和全部数据校验。
- `6f81274`：代码列表按配置状态筛选、按修改时间排序，显示修改人；详情提供任务配置、开发与代码包、运行记录。保存输入输出配置可形成草稿，上传并保存代码包后就绪，可直接运行或调度；名称/说明修改保持就绪，既有输入输出绑定保留。
- `9cadf10`：调度触发记录分开显示处理结果、运行编号和执行结果；未创建运行时不显示伪编号，已提交记录可打开具体运行。

代码任务的模板及原代码包下载保留在任务上下文内。转换流程页面和配置保持原有范围。

代码任务支持多个输入和多个输出，沿用原 HTML 的输入绑定表与输出声明表，每项使用独立代码引用名称。旧单输出记录自动兼容。全部绑定合法且引用名称不重复后，才可下载开发模板。输出可逐项新建或绑定有写入权且未占用的加工数据集；已有数据需确认更新并保留历史版本。保存只创建待产出目标；成功运行分别更新所有输出版本。绑定变更使旧代码包失效；解除绑定保留已有数据与版本。任务运行期间不可修改配置。

数据集“来源与去向”参考 main 的横向三列依赖结构：生产来源 → 当前数据集 → 直接使用方，并显示下游任务的输出去向和关系明细。使用模板 card、list-group、Bootstrap 网格及图标；没有添加图谱外观 CSS。关系按当前项目中的任务输入、生产任务标识与输出绑定解析，缺失资源保留描述而不生成伪链接。文件导入、手动录入、没有下游的情况分别展示。关联资源可以逐级查看，并通过返回按钮恢复原数据集页签、版本和滚动位置。

导航分为平台工作台和项目工作区。平台层提供全部项目、组织管理；进入项目后只显示项目功能。顶部左侧项目名称使用模板 `components-dropdowns.html` 的下拉组件切换项目及返回工作台；侧栏底部使用原有 `sidebar-toggle` 及模板脚本收缩导航。右上角恢复模板 `index.html` 的 `header-action dropdown user-dropdown`、图片头像和姓名/角色结构；示例头像文件原样复制，非用户真实照片。浏览器后退和直接链接保留项目上下文。

组件选用约束：优先寻找原模板现成组件及结构，不用徽标等其他组件替代原有人物头像，不重写组件外观。新增业务仅调整内容、数据绑定与必要布局。浅灰蓝页面背景 `#f4f7fb`、白色卡片及阴影来自原始 `main.css`；业务首页的卡片数量和排列属于项目组合，并非原模板整页复制。

成员与组织列表、成员配置预览采用原模板 `users.html` 的 `.page-users .users-person` 结构，图片原样复制自模板，属于示例头像。`people.js` 维护同一成员的头像映射，右上角账号同步使用。复选框采用 `forms-elements.html` 的 input + `.form-check-label` 结构；数据集详情使用 Bootstrap 原生页签插件，采集步骤使用原模板 wizard。

连接、采集任务、数据集、代码任务、调度计划及运行记录的名称/编号统一进入主内容区的独立详情页，不再使用详情弹窗。URL 记录项目、资源、详情页签和历史版本，支持直接访问、新标签页打开、刷新及浏览器前进/后退；返回列表恢复查询条件，返回上级详情保留页签和详情筛选。资源之间的引用使用相同入口。连接详情可创建采集任务；任务详情可编辑、发布、运行、创建预选任务的调度，以及打开输出数据集。运行记录、数据血缘和调度详情支持跳转到关联资源。详情操作反馈显示在页面内，编辑表单错误在表单弹窗内反馈；新建保存后提供具体资源详情和列表入口。从详情进入编辑，保存或取消后回到原详情，并保留页签、筛选和返回路径；列表刷新保留搜索条件。复杂表单使用原版 Bootstrap `modal-xl`、`modal-dialog-scrollable` 与独立的 `modal-footer` 操作区（直接采用 `components-modal.html` 的结构），未添加组件外观覆盖。

1. 创建项目 → 进入项目工作区。
2. 新建连接 → 测试配置 → 保存。密码不写入浏览器存储。
3. 新建采集任务 → 选择连接、源表和字段 → 设置规则与输出。
4. 保存草稿 → 校验发布 → 运行 → 生成输出数据集和版本。持续采集单独启动、停止。
5. 数据集支持 CSV 导入、手动录入、预览、字段、版本、来源与下游、按权限下载。
6. 代码任务保存输入输出配置后下载开发模板，在本地开发并上传 ZIP 原文件到当前浏览器 IndexedDB。代码包保存后就绪，可模拟运行；名称与说明修改保留就绪状态。任务详情的“开发与代码包”页签支持下载原包，遵循项目下载权限。旧任务只有文件名时需重新上传。
7. 已就绪代码任务、已发布批次任务可配置定时或上游更新触发，使用原模板卡片和单选框选择。定时到点使用可用输入，不等待上游更新；上游触发监听平台输入数据集的新版本，可选任一或全部更新，并实时预览条件。采集任务仅支持定时。新计划停用，启用后等待未来触发，不补跑历史时间或停用期间的更新。
8. 项目成员角色与下载授权独立管理。组织管理可调整项目创建资格。

成员与权限恢复旧版 Access 的权限预览思路：成员表不设搜索框，直接展示查看、配置运行、成员管理和下载能力；“成员权限预览”可选择组织成员查看当前项目的实际权限，不修改登录身份。另提供角色权限说明和已有权限变更记录，均使用原模板 Bootstrap tabs/table/select/badge。权限由当前 `cap(project, member)` 计算，归档限制和独立下载授权同步反映。

当前为本地前端业务演示，未接入后端。连接测试不访问真实数据库，源表为演示目录，代码和转换执行模拟版本流转。CSV 在浏览器解析，代码包原文件仅保存在当前浏览器，不上传服务器。页面关闭后不执行后台调度。

项目和业务状态存于当前标签页 sessionStorage，授权存于 localStorage。沿用独立的 mingce.appdashboard 存储，避免覆盖原有项目版本。离开未保存表单时会提示。

## 验证

执行 `node scripts/verify-code-many-to-many.cjs` 检查多输入、多输出、引用名称、动态输出行、模板下载校验及声明、各输出版本、绑定变更后代码包失效和解除绑定的数据保留。旧 verify-code-bindings.cjs 为已废弃的一对一交互验收。

执行 `node scripts/verify-dataset-lineage.cjs` 检查横向来源/去向、来源连接和源表、全部直接使用方及输出跳转、返回上下文、失效来源、文件来源、三个电脑端宽度和旧就绪任务兼容性。`verify-primary-chain.cjs` 还会在真实演示运行产生 v1/v2/v3 后核对依赖关系，并往返输入与输出数据集。

源表列表复用 `components-list-group.html` 的 `stretched-link` 整行点击方式：点击表名或行内空白，加入采集范围并显示字段；再次点击已选表仅切换查看，保留字段配置；复选框负责取消选择。使用原 Bootstrap 定位与层级工具类，无新增组件 CSS。执行 `node scripts/verify-source-row-click.cjs` 检查整行边缘/表名/键盘选择、取消、搜索与步骤返回后的状态及保存结果；`verify-source-picker.cjs` 继续检查表/字段搜索、搜索结果批量操作、多表选择保留、仅看已选、样例预览、空字段校验、持续采集主键及保存回显。

表单弹窗复用 `components-modal.html` 的 Scrollable Modal 和 Bootstrap `h-100`：按表单类型设置稳定高度，保留模板顶部间距，标题与底部操作固定，动态内容在正文内滚动。采集步骤切换、字段增减、文件预览及校验提示不会改变弹窗位置；“放弃修改”提示沿用当前表单框架，继续编辑后恢复正文滚动位置、焦点与文件选择。独立的移除/停止确认保留原模板紧凑居中样式。业务 CSS 仅新增弹窗布局高度，原组件颜色、圆角、阴影、间距及插件文件不变。执行 `node scripts/verify-modal-stability.cjs` 检查 8 类表单、动态分支、确认返回、3 种桌面高度与窗口缩放前后的标题/底栏坐标。

执行 `node scripts/verify-main-sync.cjs` 验证上述 main 交互适配的完整链路；执行 `node scripts/verify-main-sync-edges.cjs` 检查 CSV 首行/重复字段/类型错误、采集配置快照及只读权限。测试均使用独立浏览器会话。

项目概览采用原模板 `dashboard-projects.html` 的统计卡、8:4 双图表网格、ApexCharts 堆叠柱图与环形图配置。图表库从原模板直接复制；配色使用原 CSS 变量，图例使用原样式表的 `chart-legend-item` / `chart-legend-color`。两图统一统计北京时间最近 7 个自然日内提交的现有运行（含持续采集），按当前状态分组；没有记录时展示空状态，不填入模板示例数字。图表随运行状态刷新，离开概览时销毁实例。

执行 `node scripts/verify-overview-charts.cjs` 检查原图表库哈希、日期边界、统计数量、空状态、图例、最近运行以及导航/刷新后的图表生命周期。测试数据只写入独立测试浏览器会话。

```powershell
node check.mjs
```

检查入口、静态资源和 JavaScript 语法。

在仓库根目录执行 `node scripts/verify-appdashboard.cjs`，需要 Playwright 和 Edge；可用 PLAYWRIGHT_MODULE 指定 Playwright 路径。覆盖完整业务链路、权限、密码不持久化、刷新恢复和 1280/1440/1920 电脑端布局，并确认原版 Bootstrap 插件加载且没有 React/Vite 网络请求。

执行 `node scripts/verify-appdashboard-template.cjs` 对照提供的原模板：比对原始资源的 SHA-256，核对弹窗、底栏、表单、步骤条和详情页签等组件计算样式，并限制业务 CSS 只包含布局属性。可用 `APPDASHBOARD_TEMPLATE` 指定原模板的 `assets` 目录。

执行 `node scripts/verify-workspace-navigation.cjs` 检查平台与项目导航隔离、项目切换、账号菜单键盘关闭、返回工作台、浏览器后退和刷新恢复。

执行 `node scripts/verify-resource-journey.cjs` 检查跨资源创建、详情内发布运行、预选调度任务、输出和血缘回查、弹窗错误定位、文件选择重置，以及列表搜索保留。

执行 `node scripts/verify-template-surfaces.cjs` 巡检 12 个页面、8 个创建表单、6 类资源详情和数据集的 4 个页签，验证成员头像原图、成员预览及账号头像一致性。

执行 `node scripts/verify-schedule-choice.cjs` 验证触发方式切换、采集任务限制、条件预览、选择保留、编辑回显与等待状态。执行 `node scripts/verify-primary-chain.cjs` 验证连接、采集、原始数据集、代码任务和输出数据集的主链路，以及手动、上游和定时执行。

资源列表筛选：数据连接、采集任务、数据集、代码任务、调度计划、运行记录使用原模板 form-control / form-select / btn 样式，支持组合查询、Enter 查询和重置。运行记录支持北京时间日期范围。筛选按当前项目及页面分别保留于当前页面会话，成员页仍不显示搜索框。验证：node scripts/verify-list-filters.cjs。

多输出运行与调度验证：node scripts/verify-code-multi-runtime.cjs（混合新建/已有输出、版本保留、运行期间编辑限制、全部上游更新触发、多个输出去向与循环依赖校验）。

2026-10-21 页面交互复核（参考 origin/main 9cadf10）：连接详情分为连接配置、关联采集任务；采集详情展示来源、采集规则、逐表字段与输出目标；代码详情以表格展示输入绑定和输出声明，开发与代码包独立成页签；调度详情分为计划配置、触发记录，展示执行身份、规则、范围、并发处理、下一次触发和启用行为。详情统一使用独立页面和原模板返回按钮，关联资源逐级返回；运行输出跳转到本次产生的具体数据版本。此轮仅调整页面信息与操作流程，不扩展业务执行规则。

独立详情页回归：`node scripts/verify-detail-pages.cjs`，覆盖各资源详情 URL、页签刷新、关联资源逐级返回、列表已查询条件与未提交条件恢复、新标签直接访问、资源不存在与权限限制，以及未保存编辑的后退取消/放弃和完整历史记录。配合 `verify-guided-workflow.cjs`、`verify-discard-dialog.cjs`、`verify-list-filters.cjs`、`verify-appdashboard-template.cjs` 验证。

完整交互巡检：`node scripts/verify-guided-workflow.cjs` 在独立浏览器的新项目内，从 PostgreSQL 连接创建、测试与编辑开始，经过多表采集、发布运行、数据版本与来源往返、多输入多输出代码任务、模板下载、ZIP 上传与下载、调度创建/编辑/启停及触发记录回查；另外覆盖持续采集的停止确认和取消。全部经页面交互完成，不使用用户当前会话。

本轮修复：从连接详情创建采集任务、从任务详情创建调度后，直接进入新资源详情并保留父级返回路径；筛选后的运行记录继续刷新，保留筛选值、页签、滚动位置与输入焦点；动态表单切换保留控件焦点，采集步骤切换回到顶部；持续采集确认文案与实际操作一致；历史数据预览显示所选版本号。沿用原模板弹窗、页签、表格、按钮和表单，未修改组件外观或转换流程。

文件上传统一使用原模板 `forms-upload.html` 的 Compact Dropzone 和 File List（`upload-dropzone-compact`、`upload-file-item`），没有添加上传组件 CSS。CSV 导入、代码任务新建/编辑/替换均支持点击、键盘选择和拖拽单个文件，展示文件名、大小和处理状态，提供移除及重新选择；保留 CSV 解析、ZIP 存储、输入输出绑定变化后的代码包失效规则。`node scripts/verify-template-uploads.cjs` 验证选择/拖拽、移除、错误处理、表单保留、导入和代码包替换下载；`verify-appdashboard-template.cjs` 额外比对上传区及文件列表的 9 个组件样式。

所有列表及采集/代码任务详情的筛选下拉统一使用原模板 `forms-select.html` 的 `data-choices` 结构与初始化配置，接入代码位于 `assets/js/filter-selects.js`。Choices.js、其 CSS 和模板 main.css 原文件保持不变；组件 DOM 全部由原插件生成，不追加菜单宽度、定位、内边距或截断类。来源字段使用模板可搜索单选，其他筛选使用基础单选；较长来源名称通过筛选栏的列宽布局容纳。返回与刷新通过插件 API 同步选中项，详情重置明确恢复“全部”。

`node scripts/verify-all-filter-components.cjs` 对照实际打开的原模板页面，逐项检查 18 个列表下拉框的组件结构、计算样式、点击范围、选择/关闭/重置，并验证采集和代码详情筛选的刷新、页签切换、逐级返回与重置；覆盖 1280/1440/1920/2560 桌面宽度。`node scripts/verify-filter-selects.cjs` 继续验证搜索、键盘选择、无匹配项及组件生命周期。

2026-10-22 全量组件复核：创建、编辑、CSV 字段类型、代码任务输出绑定、调度规则和成员预览的下拉也统一接入 `forms-select.html` 的 Choices 初始化，沿用原版 Basic Select / Searchable Select。组件销毁按页面或编辑器分别处理，动态表单保留选中值与焦点；菜单中的 Esc 先关闭菜单，下一次才交给 Bootstrap 弹窗。表格里的下拉使用 Bootstrap `overflow-visible` 布局工具类，避免菜单被表格裁切；弹窗内依据可视空间调用 Choices 自带的向上/向下展开能力，避免底栏遮挡。两项均为布局与插件接入，不添加组件外观 CSS。

组件来源核对：

| 界面组件 | 原模板来源 |
| --- | --- |
| 下拉单选、可搜索选择 | `forms-select.html`、原版 Choices.js |
| 输入框、复选框、单选框 | `forms-elements.html` |
| 日期、24 小时时间、日期与时间选择 | `forms-pickers.html`、原版 Flatpickr |
| 创建编辑、放弃修改、移除成员确认 | `components-modal.html`、原版 Bootstrap Modal |
| 详情和权限页签 | `components-nav-tabs.html`、原版 Bootstrap Tab |
| CSV / ZIP 上传、文件列表 | `forms-upload.html` |
| 采集步骤条 | `forms-wizard.html` |
| 成员头像与姓名 | `users.html`、原版头像文件 |
| 概览统计卡和图表 | `dashboard-projects.html`、原版 ApexCharts |
| 卡片副标题、表格、按钮、徽标、空状态与导航 | 原模板 `main.css` 与 Bootstrap |

修复卡片副标题未使用 `card-subtitle`、移除成员仍使用原生 `confirm()`、成员预览选择后未更新权限内容的问题。业务数据与事件仍由应用负责；原模板 CSS、图标、头像和插件文件不变。转换流程本轮仅纳入组件检查，未变更业务规则。

`node scripts/verify-template-audit.cjs`（`verify-template-surfaces.cjs` 同入口）覆盖 12 个页面、8 个创建表单、6 个编辑表单、7 类详情页、13 个详情页签、成员权限页签，以及采集向导、CSV 字段、多个代码输出、全部时间规则与上游触发分支。检查模板菜单可点击、不被裁切、Esc 行为、禁用状态、取消后恢复、成员确认和四种桌面宽度。配合 `verify-appdashboard-template.cjs` 核对原文件哈希和 58 项计算样式，`verify-guided-workflow.cjs` 验证完整业务交互，`verify-template-uploads.cjs` 验证上传与文件下载。

日期／时间选择由基础表单的浏览器原生面板，替换为 `forms-pickers.html` 中的 Date、24-Hour Time、Date & Time：直接复制模板 Flatpickr 脚本和样式，复用原 input-group 与日历／时钟图标，无新增组件外观 CSS。按用户要求只选择到分钟，不提供秒输入；日期时间显示 `YYYY-MM-DD HH:mm`，保存仍为调度引擎使用的 `YYYY-MM-DDTHH:mm`。原有含秒配置在打开编辑时按分钟展示，保存后采用分钟精度。多个执行时间分别使用原版 Time Picker，增删后仍保存为原有逗号分隔格式。运行记录列表和任务详情的日期筛选同步替换，支持清空、重置和回显。

`node scripts/verify-template-date-pickers.cjs` 核对 Flatpickr 原文件哈希及面板计算样式，验证日期与时间点选、键盘、分钟精度、非法日期／秒输入、保存编辑、多执行时间、筛选重置和桌面弹窗内的位置及焦点。`verify-appdashboard-template.cjs` 现核对 11 个原版资源。弹窗关闭动画结束后再处理快速重新打开，避免旧弹窗的清理销毁新表单。
