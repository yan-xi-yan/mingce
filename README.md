# 明策 · 数据治理平台前端原型

纯 HTML、CSS、JavaScript 交互演示，无需安装前端依赖或构建。当前未接入后端，连接测试、任务运行和权限操作均为演示。

## 本地运行

在本目录启动静态服务：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

浏览器打开 http://localhost:8000/，入口 `index.html` 会跳转到项目列表。也可以直接打开 `index.html`，建议协作时统一使用静态服务。

## 文件说明

- `01-` 至 `26-`：项目、数据连接、采集、代码任务和调度主流程。
- `补充-*.html`、`数据集-*.html`：补充页面与不同状态。
- `项目成员与权限.html`、`组织与角色.html`、`权限效果预览.html`：权限相关页面。
- `统一界面.css`、`统一交互.js`：公共样式和交互。
- 其他 CSS、JavaScript：对应业务模块的样式和交互；修改页面时请一起保留。
- PNG：部分页面参考截图，修改后可能需要重新生成。

## 协作修改

从仓库默认分支创建个人分支，修改完成后提交 Pull Request。不要直接覆盖他人的改动。

保留文件名和相对路径；部分页面共用脚本，修改公共文件后请检查相关页面。页面业务数据为示例，部分状态保存在浏览器 localStorage/sessionStorage 中；需要重置演示时可清除本地站点数据。

检查入口、页面跳转、表单与主要按钮，并确认浏览器控制台无新增错误。请勿在原型中填写或提交真实密码、令牌和生产数据。

## 项目工作区交互

项目入口统一进入“项目概览.html”。左侧导航在资源列表和编辑页中保持一致，按数据接入、数据开发、运行管理、项目资料组织。公共交互层为“工作区导航.js”和“工作区体验.css”；不替换原有资源、权限及调度模块。

访问管理是独立控制台入口，分为组织成员、项目授权与权限效果预览；选择授权项目只改变当前查看范围，原有角色、授权规则和权限检查保持不变。项目工作标签支持关闭、拖动排序、Alt + 左右键排序和项目间隔离，sessionStorage 仅记录路由，不缓存表单内容；离开编辑页前会检查本次是否有输入并提示未保存修改。

新建项目入口通过 localStorage 的 mingce-project-index-v1 保留，仅用于本地演示。清除站点数据会移除这些入口。资源状态仍沿用原有脚本的存储方式。

启动静态服务后，可使用安装了 Playwright 和 Edge 的 Node 环境运行 node scripts/verify-workspace.cjs。也可通过 PLAYWRIGHT_MODULE 环境变量指定 Playwright 模块位置。检查覆盖所有 HTML 页面的脚本错误、项目创建与重新进入、标签排序/关闭/隔离、授权范围切换、成员添加及页面重新渲染、未保存编辑保护和移动端首页布局。截图输出到 artifacts/ux（不提交）。

交互参考：[Ant Design Tabs](https://ant.design/components/tabs/)、[Ant Design Pro](https://github.com/ant-design/ant-design-pro/blob/master/src/app.tsx)、[TDesign Tabs 源码](https://github.com/Tencent/tdesign-react/blob/develop/packages/components/tabs/Tabs.tsx)、[腾讯云访问管理](https://cloud.tencent.com/document/product/598/32738)、[阿里云资源组与授权](https://www.alibabacloud.com/help/en/resource-management/resource-group/product-overview/resource-group-overview)。当前实现保留无构建的 HTML 架构，借鉴组件交互方式，未引入 React 或 UI 组件运行时。

## 业务流程回归

在静态服务运行时执行 `node scripts/verify-workflow.cjs`（Playwright 模块选择同上）。覆盖创建项目、连接校验/测试/保存/再次进入、选择真实的当前项目连接、逐表字段选择、任务与输出重名提示、上一步保留输入、任务列表恢复，以及已有已发布任务的调度预览/保存/启用/再次进入。

“流程衔接.js”负责前端流程提示、选择与列表衔接。数据连接列表只在 sessionStorage 保存名称和测试状态，不保存密码或访问配置；采集任务索引只引用原有会话配置。新项目不显示其他项目的示例连接与已发布任务。校验与发布仍是原型未实现能力，未发布任务不会被伪装成已发布任务来配置调度。

## 视觉风格方案

打开 `方案对比.html` 查看同一页面的三套视觉风格：`view=graphite`（石墨深色）、`view=azure`（钴蓝企业）、`view=minimal`（极简浅色）。`view=baseline` 返回当前认可版。右上角可切换，当前浏览器标签内会保持所选风格。

`界面方案.css` 仅覆盖配色、字体、间距和控件外观；`界面方案.js` 只提供风格选择和链接参数延续，不重排导航、不替换业务页面、不修改资源或权限状态。实际页面截图保存在 `版本预览/`。

`node scripts/verify-styles.cjs` 检查各风格下全部页面、导航一致性、搜索、权限弹窗和移动布局。设置 `UI_VARIANT=graphite|azure|minimal` 可使用 `verify-workflow.cjs` 运行对应风格的完整业务交互回归。所有版本均保留原有发布与调度条件。
