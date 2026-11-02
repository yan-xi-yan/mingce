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

导航分为平台工作台和项目工作区。平台层提供全部项目、组织管理；进入项目后只显示项目功能。顶部左侧项目名称使用模板 `components-dropdowns.html` 的下拉组件切换项目及返回工作台；侧栏底部使用原有 `sidebar-toggle` 及模板脚本收缩导航。右上角恢复模板 `index.html` 的 `header-action dropdown user-dropdown`、图片头像和姓名/当前组织结构（角色保留在账号下拉菜单）；示例头像文件原样复制，非用户真实照片。浏览器后退和直接链接保留项目上下文。

组件选用约束：优先寻找原模板现成组件及结构，不用徽标等其他组件替代原有人物头像，不重写组件外观。新增业务仅调整内容、数据绑定与必要布局。浅灰蓝页面背景 `#f4f7fb`、白色卡片及阴影来自原始 `main.css`；业务首页的卡片数量和排列属于项目组合，并非原模板整页复制。

成员与组织列表、成员配置预览采用原模板 `users.html` 的 `.page-users .users-person` 结构，图片原样复制自模板，属于示例头像。`people.js` 维护同一成员的头像映射，右上角账号同步使用。复选框采用 `forms-elements.html` 的 input + `.form-check-label` 结构；数据集详情使用 Bootstrap 原生页签插件，采集步骤使用原模板 wizard。

连接、采集任务、数据集、代码任务、调度计划及运行记录的名称/编号统一进入主内容区的独立详情页，不再使用详情弹窗。URL 记录项目、资源、详情页签和历史版本，支持直接访问、新标签页打开、刷新及浏览器前进/后退；返回列表恢复查询条件，返回上级详情保留页签和详情筛选。资源之间的引用使用相同入口。连接详情可创建采集任务；任务详情可编辑、发布、运行、创建预选任务的调度，以及打开输出数据集。运行记录、数据血缘和调度详情支持跳转到关联资源。详情操作反馈显示在页面内，编辑表单错误在表单弹窗内反馈；新建保存后提供具体资源详情和列表入口。从详情进入编辑，保存或取消后回到原详情，并保留页签、筛选和返回路径；列表刷新保留搜索条件。复杂表单使用原版 Bootstrap `modal-xl`、`modal-dialog-scrollable` 与独立的 `modal-footer` 操作区（直接采用 `components-modal.html` 的结构），未添加组件外观覆盖。

1. 创建项目 → 进入项目工作区。
2. 新建连接 → 测试配置 → 保存。密码不写入浏览器存储。
3. 新建采集任务 → 选择连接 → 选择源表、字段并命名输出数据集 → 配置 JDBC / CDC 规则后保存。
4. 保存草稿 → 校验发布 → 运行 → 生成输出数据集和版本。持续采集单独启动、停止。
5. 数据集支持 CSV 导入、手动录入、预览、字段、版本、来源与下游、按权限下载。
6. 代码任务保存输入输出配置后下载开发模板，在本地开发并上传 ZIP 原文件到当前浏览器 IndexedDB。代码包保存后就绪，可模拟运行；名称与说明修改保留就绪状态。任务详情的“开发与代码包”页签支持下载原包，遵循项目下载权限。旧任务只有文件名时需重新上传。
7. 已就绪代码任务、已发布批次任务可配置定时或上游更新触发，使用原模板卡片和单选框选择。定时到点使用可用输入，不等待上游更新；上游触发监听平台输入数据集的新版本，可选任一或全部更新，并实时预览条件。采集任务仅支持定时。新计划停用，启用后等待未来触发，不补跑历史时间或停用期间的更新。
8. 项目成员角色与下载授权独立管理。组织管理可切换已加入的组织，并调整当前组织的项目创建资格。

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

## 组织切换

组织管理顶部显示当前组织、身份、成员数和可访问项目数；“切换组织”使用 Bootstrap 下拉列表展示已加入组织与当前标记。右上角姓名下方始终显示当前组织，账号菜单提供组织管理入口。切换保持登录身份不变，刷新后保留当前标签页的组织选择。

演示组织包括“数据研发部”（原有 6 位成员）和“业务运营部”（张敏、李明、周航；李明为管理员）。原有项目仍归属数据研发部，不搬迁数据；业务运营部初始为空，可创建自己的项目。新增项目记录 organizationId / organization；旧项目无组织字段时兼容归入数据研发部。项目列表、项目切换列表、组织成员与创建资格随组织更新；历史链接属于其他组织时提示切换组织。项目名称继续沿用现有演示版的全局唯一约束。

组织选择使用按账号区分的 sessionStorage；创建资格使用按组织区分的 localStorage，原 east 存储键保持兼容。成员身份由 organizations.js 的演示成员关系提供。正式接入需要由后端提供成员关系和资源授权；浏览器筛选不构成安全隔离。

设计边界参考 [Palantir Organizations and spaces](https://www.palantir.com/docs/foundry/security/orgs-and-spaces)：组织访问要求与项目授权分别处理。本页面的飞书式组织切换是本产品的交互设计，并非复刻 Palantir 的界面。

验证：在仓库根目录执行 `node scripts/verify-organizations.mjs`，覆盖组织成员资格、角色与创建资格分离、旧存储兼容、项目归属过滤、非法切换及账号间选择隔离。浏览器已验证组织切换、刷新保留、账号快捷入口、项目工作台范围、跨组织旧链接提示和切回原组织。

## 新建数据连接：两步向导

1. **选择 Source**：使用原模板 plan-card 单选卡片列出 MySQL、PostgreSQL（pgsql）、Oracle、SQL Server。新建时不预选，选择后可进入下一步。
2. **数据连接配置**：显示选定来源与当前项目，填写连接名称、用途说明（选填）、主机、端口、数据库（Oracle 为 Service Name）、用户名和密码。测试后保存；支持上一步和重新选择 Source，已填内容保留。

类型切换时自动替换默认端口（3306、5432、1521、1433），保留手动设置的自定义端口；切换类型使测试失效。编辑已有连接直接进入第二步，密码为空且不回显；改变来源类型需提供对应凭据。连接与具体采集对象分离，不在向导中加入选表、同步模式或输出数据集步骤。

继续使用现有本地模拟测试，不访问真实数据库，保存记录中不包含密码。现有 connectorType 和 database 存储字段保持兼容；Oracle 的 Service Name 在演示模型中存于 database 字段。

参考：[飞书调研文档 P00 数据接入](https://hffeipai.feishu.cn/docx/Y3TLdMVOGo5IfuxZO6ucUJKDnah#doxcn9bbXGKhRWflbScu3r67Zfg)、[Palantir Set up a source](https://www.palantir.com/docs/foundry/data-connection/set-up-source)、[Palantir 学习课程](https://learn.palantir.com/deep-dive-data-connection/1864431)。课程正文要求注册登录，本次读取公开课程目录；另查看官方历史页面的连接方式卡片截图作为选择卡片参考，并以当前 Source 文档核对流程。两步合并为本产品的简化设计。

验证：仓库根目录执行 `node scripts/verify-connection-wizard.mjs` 与 `node appdashboard-app/check.mjs`。浏览器已验证未选来源禁止继续、四种来源及默认端口、Oracle 字段、返回保留数据、端口校验、测试前禁止保存、修改配置使测试失效、保存和编辑回读。浏览器保存测试在独立标签页进行。


### 采集配置三步向导（2026-10-28）

按最新页面规划将采集向导收敛为三步：① 选择连接（任务名称及来源）；② 源表、字段与输出；③ 采集规则。移除「确认输出」。第二步保留左侧源表列表、右侧字段/预览工作区，在每张表的字段上方命名对应 Dataset，并在下方汇总全部输出；名称在进入下一步时校验空值、长度、重复及已有数据集占用。取消选表保留未提交编辑值，重新勾选恢复；保存只保留所选表。

第三步采用模板选择卡片切换 JDBC / CDC，详细参数在下方分区展示，右侧显示来源和多个输出摘要。复用原模板卡片、步骤条、表单、Choices、列表与固定底栏，不改 vendor 样式。

- JDBC：全量 / 递增读取、Snapshot / Append 写入方式、逐表 SQL（留空自动生成）、逐表递增字段与初始游标、每批读取行数、查询超时。递增读取强制 Append；游标需已选、非空且单调递增，不能等同 CDC。自定义 SQL 只作前端基础格式检查，实际解析、只读权限、返回列及参数绑定须由后端验证。
- CDC：首次快照 initial / no_data、逻辑源标识 topic.prefix；MySQL server ID；PostgreSQL pgoutput、复制槽、Publication 和创建模式；Oracle LogMiner、CDB/数据库及 PDB；SQL Server 复用连接的 database.names。按源 Schema 与所选表生成转义后的 table.include.list，自动保留主键，提供批大小、队列容量、轮询和心跳参数。
- 参数保存与详情回显一致；旧记录按 mode 初始化。兼容原 mode（full/incremental/continuous），运行仍保存完整配置快照。活动采集方式之外的参数不写入记录。保存、发布、启动均校验新配置；旧演示任务不强制补填新参数。
- 本地项目内检查 topic.prefix、同连接 server ID / slot 重复；跨项目、跨连接别名及真实数据库上的唯一性、源库权限、日志设置、表存在性均需后端最终校验。
- 配置对象不是可直接部署的 Kafka Connect JSON。连接凭据、connector.class、字段映射、位点存储与 schema history 后端由运行服务组装，Oracle Service Name 与 database.dbname 分开处理。页面目前不执行 JDBC SQL 或启动真实 Debezium；演示运行也不解释这些参数。

参考：用户指定飞书「P00 数据接入：创建同步并生成输入 Dataset」；可访问的 [Palantir JDBC 同步截图](https://www.palantir.com/docs/resources/foundry/data-connection/data-connection-batch-sync-azure-sql.png)、[同步配置说明](https://www.palantir.com/docs/foundry/data-connection/set-up-sync)、[JDBC 游标约束](https://www.palantir.com/docs/foundry/data-connection/syncs-troubleshooting)，以及 Debezium stable 官方连接器说明：[MySQL](https://debezium.io/documentation/reference/stable/connectors/mysql.html)、[PostgreSQL](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)、[Oracle](https://debezium.io/documentation/reference/stable/connectors/oracle.html)、[SQL Server](https://debezium.io/documentation/reference/stable/connectors/sqlserver.html)。本次 blob 图片受浏览器策略限制，飞书页面重开时连接失败，因此布局以官方可访问截图为依据。

验证：`node scripts/verify-collection-config.mjs` 覆盖多输出、逐表游标、SQL 参数、四种 CDC 配置、主键保留、保存回读、旧配置迁移及运行快照；`node appdashboard-app/check.mjs` 检查语法与资源。浏览器交互通过 CUA 验证三步流程、多输出命名、JDBC 保存与详情、CDC 参数切换及错误提示。

### 数据集详情重设计（2026-10-28）

页面参考 [Palantir Dataset Preview](https://www.palantir.com/docs/foundry/dataset-preview/overview) 的顶部页签、左侧 About / Columns 信息栏和右侧工作区；沿用原模板卡片、表格、Choices、日期选择器和 Bootstrap 页签。包含 Preview、History、Details、Compare、Time Travel，并保留 Lineage。

- Preview：版本切换、按值/字段搜索、按字段升降序排序、字段显示开关、样例字段统计及分页。所有计算只针对已载入数据，展示全量行数和载入行数，避免把样例作为全量结果。
- History：已提交版本与当前生产任务的运行记录，提交/失败状态汇总，左侧记录选择、右侧元信息及运行链接；支持打开版本、进入时间旅行、与最新版本比较。未关联版本的运行不冒充已提交事务。
- Details：当前所选版本的 Schema（可搜索）、数据集 ID、负责人/项目/生产来源等元数据与来源连接。没有物理文件清单或存储统计时明确说明未接入，不虚构文件。
- Compare：同数据集版本或当前项目内另一个数据集的版本比较；展示字段新增、移除、类型变化及行/单元格差异。选择关联键时校验两侧已载入行的非空与唯一性；不指定键时按整行多重集合比较，保留重复行数量语义。数据/结构缺失时分别禁用对应差异计算。
- Time Travel：参考 [Palantir Time Travel](https://www.palantir.com/docs/foundry/dataset-preview/time-travel)，仅提供单版本视图；横向蓝色滑轨、时间刻度、可点击版本节点与选中时间提示，支持拖动及键盘切换、前后版本、按北京时间定位此前最新提交、打开该版本的 Preview，以及返回最新版本。版本范围对比统一在 Compare 中进行。仅读取快照，不执行回滚，也不提供未接入的 SQL 查询或 Bisect 搜索。
- URL 保留页签与所选版本；关联资源跳转返回保留比较条件/筛选状态。历史 CSV 下载使用所选版本的 schema/data，缺失快照禁止下载；既有下载权限继续生效。旧 tab=schema / versions 链接分别映射至 Details / History。
- 内置订单样例提供明确标注的 v10 / v11 / v12 历史，包含字段新增、样例行新增/删除和单元格更新。只对内置回退数据生效，不覆盖 sessionStorage 的用户记录。源数据总量大于已载入数据时，比较结果显示为样例差异。

`dataset-versions.js` 为无 DOM 的快照/比较模块；`dataset-explorer.js` 管理只读浏览状态和界面。验证：`node scripts/verify-dataset-explorer.mjs` 覆盖不存在/缺失/空快照、时间边界、主键及整行比较、重复与空值、字段变化、类型排序、分页和转义；`node appdashboard-app/check.mjs` 检查资源与语法。浏览器通过 CUA 验证五个页签、唯一键提示、时间定位、历史筛选、版本范围及关联跳转返回。旧 Windows Playwright 页面脚本的原页签名称属于改版前界面，本轮未运行。

### 代码包与隔离测试（2026-10-28）

- 新建 / 编辑代码任务仅配置输入输出；创建后直接进入「开发与代码包」。上传入口只在此标签页，专用弹窗不会修改输入输出绑定。
- 上传并保存 ZIP 后可测试、重新测试和取消测试。提交时固定当前最新输入版本、完整任务配置和代码包引用；运行中禁止修改任务及重复提交。
- `runMode: TEST` 仅允许手动代码任务。临时结果保存于运行记录 `testResults`，完成和取消均不调用输出发布，不递增数据集版本、不触发下游版本事件。旧包 / 配置测试结果有明确提示。
- 当前仍为浏览器生命周期演示，不执行 ZIP 内的 Python。临时样例来自首个输入，页面明确标识；不能视为代码正确性验证。
- 运行记录点击任务或编号打开详情。先打开 Build report（运行概况、进度、执行节点、输入与产出），再通过计算节点的 Spark details 进入独立详情页；包含 Overview、Query plan、Graph、Executors、Environment、Dependencies、Debug information；输入链接指向接受运行时的具体版本。
- Spark 数据入口为 `run.spark`：`applicationId`, `uiUrl`, `durationMs`, `taskRuntimeMs`, `shuffleWriteBytes`, `diskSpillBytes`, `stages`, `jobs`, `concurrency`, `executors`, `sqlExecutions`, `queryPlan`, `config`, `dependencies`, `logs`。指标缺失显示「—」和空状态，不伪造测量值。`concurrency` 使用 `timeMs/activeTasks`；stage 使用 `startMs/durationMs/taskRuntimeMs/parentIds/tasks`。真实执行、Spark REST / Event Log 采集、History Server 和 JVM 诊断后端尚未接入。
- 参照：https://www.palantir.com/docs/foundry/optimizing-pipelines/understand-spark-details/ 与 https://www.palantir.com/docs/foundry/optimizing-pipelines/spark-ui/ 。Spark UI 仅在执行服务提供有效 HTTP(S) URL 时可打开，不猜测端口或链接。
- 验证：`node scripts/verify-code-tests.mjs` 覆盖测试隔离、最新输入 / 历史快照、取消、重复提交、正式发布、下游事件隔离、上传范围与安全渲染；浏览器实际验证创建、上传、测试结果、运行详情和返回导航。

### 持续采集的版本发布窗口（2026-10-28）

- 持续采集不进入 Schedule 目标列表。运行实例保持运行，每隔 `versionIntervalSeconds` 发布一次数据集版本；CDC 配置中可设 60～86400 秒，默认 300 秒。
- 初始快照先发布基线；`no_data` 从首个窗口开始。一次运行包含多条 `publications`，每条记录窗口起止、实际发布时间、状态及各输出版本；数据集快照同步保存 `runId/publication`。
- 发布间隔固定在启动配置中。窗口边界为左闭右开，重复 tick 不重复发布；停止后不发布，失败不增加版本。浏览器挂起恢复时合并过期窗口发布一次，避免虚构大量后台采集；真实 Debezium 和提交服务仍待接入。
- 持续采集运行详情独立展示「采集概览 / 版本发布记录 / 运行事件」，不展示 Spark 或调度计划控件。历史仅记录最近输出时明确提示缺少逐窗口明细。
- 数据集 History 展示版本对应的窗口；任务运行计数按运行 ID 去重。内置订单明细 v10/v11/v12 示例关联同一运行，分别为初始快照和两个 5 分钟窗口。
- 验证：`node scripts/verify-continuous-versions.mjs`，覆盖周期边界、重复 tick、单运行多版本、固定配置、挂起合并、停止、发布失败与调度隔离。


## 真实运行记录展示

“供应链分析 / 运行记录”载入 `assets/data/real-runs.json`，包含 JDBC Catalog + Iceberg 实验正式套件的 9 次历史运行。它们以“真实实验”标识，独立于 sessionStorage 中的模拟执行，不可重跑或修改。其他项目和组织不会加载这些记录。

数据来自 Temporal 历史文件、Spark 4.1.3 History Server REST、Iceberg 元数据和 Driver 日志。页面展示采集时间、原始标识和来源；关闭实验容器后快照仍可查看，但 Spark UI 外链需要 History Server 在线。运行失败不代表 Iceberg 没有提交。Snapshot ID 按字符串保存，不等同于平台版本号。SQL 物理记录数与有效行数分开理解。

刷新展示快照（只读采集，不提交作业、不修改实验）：

```sh
python3 scripts/import-real-runs.py /path/to/jdbc-iceberg-validation
node scripts/verify-real-runs.mjs
```

导入器只选择验收套件中的运行，从 History Server 分页读取 Tasks；所有请求成功后才原子替换展示文件。配置采用白名单，日志仅保留脱敏后的末尾节选。Stage 父依赖从 Spark event log 获取；缺失输入版本、Executor 退出时间和未上报内存不作补造。取消任务的并发曲线只使用有完整起止时间的 Tasks。CDC 周期发布与真实 TEST 执行不属于这批数据。


Spark details 使用 `detail=spark` 独立路由，支持返回运行报告、刷新和浏览器前进后退。Overview 合并 Stage 时间线、依赖、共享时间轴的 Task 并发图和可展开的 Stage / Task 明细。Graph 使用真实 Stage Parent IDs，不从时间先后推导依赖。Job duration 与 Application duration 区分：首个 Stage 开始到最后一个 Stage 完成的跨度才用于并行度；未结束的跨度保留为空。当前 JVM Snapshot 采集服务未接入，按钮禁用且解释原因。

### 代码包版本管理

「开发与代码包」以 ZIP 上传为单位管理版本，不包含在线文件编辑。每次上传保存递增 v1、v2…，保留文件名、大小、上传时间、上传人、说明和输入输出绑定签名；上传后设为当前版本。历史版本可下载、设为当前，切换不新增上传版本、不执行任务、不发布数据集版本。已有运行固定引用提交时的代码包 ID 与版本号；版本表展示每个包最近的测试记录。运行中禁止上传或切换，不兼容当前输入输出绑定的历史包仅可下载。旧包仅能恢复现存包的信息，无法恢复先前未记录的上传历史。

代码包仍存储于浏览器 IndexedDB，版本元数据沿用项目本地存储。验证：`node scripts/verify-code-package-versions.mjs`、`node scripts/verify-code-tests.mjs`。

### 基于源表结构变化创建新数据集

数据集详情右上角提供「基于此创建新数据集」和「检查源表结构」。新页面继承来源连接、源表、采集方式及规则，展示当前 Iceberg Schema 与来源字段的删除 / 新增 / 类型差异，允许设置新名称、字段和采集参数。只支持有明确源表绑定的采集数据集；加工和手动数据集不会虚构来源。

创建操作保存独立数据集定义与采集任务草稿，不复制历史版本、运行位点、调度计划或下游绑定。新 CDC 任务使用独立 topic prefix、复制槽 / server ID 和 initial 基线。实际部署时 server ID 仍需由源集群范围的分配服务确认唯一。首次成功采集才生成 v1。

JDBC 批次、CDC 初始基线和版本窗口在 `commitOutputs` 写入之前检查所有输出。已采集列从源表消失，或元数据读取失败，整批输出停止发布，版本号及旧快照保持不变。数据集及失败运行报告展示原因并提供创建入口。原本未采集的源列删除不触发该数据集的删列告警。源表类型变化只展示差异，尚未实现生产类型兼容策略。

**当前边界：** `schema-evolution.js` 为明确标注的浏览器本地演示适配器，比较保存的 Dataset Schema 与静态 source catalog；没有访问真实数据库或 Iceberg Catalog。页面折叠项「演示源表变化」可在当前会话模拟删除列 / 恢复，不修改任何真实源表。后端接入时需以连接 ID + 完整表标识获取字段、主键、元数据指纹和权限错误，再在发布事务内读取当前 Iceberg Schema 并复检，不能以浏览器检查替代服务端拦截。重命名不通过名称相似度自动判定。

验证：`node scripts/verify-schema-evolution.mjs`（从仓库根目录），覆盖 JDBC / CDC 拦截、多输出原子性、元数据失败、旧版本保留、结构二次变更、独立创建及首次 v1。

### 采集方式与数据选择（2026-10-30）

采集向导固定为三步：选择连接与采集方式 → 选择数据与配置输出 → 采集规则。第一步选择 JDBC 或 CDC；切换连接清空数据选择，保留采集方式。

- JDBC 每张源表可独立选择图形化或 SQL 模式。图形化勾选字段；SQL 中配置字段、别名、表达式和过滤条件。切换模式保留查询草稿，保存图形化配置时不会执行保留的 SQL 草稿。第三步只配置读取、写入和高级参数，并展示查询摘要。
- CDC 整表采集全部字段，只读显示字段名称、类型和主键；每张源表命名一个输出。字段裁剪与表达式放到下游转换。快照、连接器参数和版本发布间隔仍在第三步配置。新建衍生数据集也遵循整表采集规则。
- 保存所确认的完整源表元数据，CDC 发布检查以已接受的完整源表结构为基准；即使某列曾被旧配置排除，源端删除该列也会拦截。成功发布后记录本版本接受的结构，保留历史快照。
- JDBC 图形化使用选中字段及游标依赖检查结构。任意 SQL 的结果结构、查询依赖解析和执行需要后端查询元数据服务；当前页面允许保存 SQL 配置，明确显示“待解析”，不会把源表示例当作 SQL 结果，也不会模拟发布未验证的 SQL 输出。
- 元数据仍来自本地演示适配器；选择后源表结构若发生变化，保存要求返回上一步重新确认。

验证：`node scripts/verify-collection-selection.mjs`、`node scripts/verify-collection-config.mjs`、`node scripts/verify-schema-evolution.mjs`。
