# CHANGELOG

本文件记录本项目（PersonalAssistantAgent / Kit）每次文件增删改查的变更，写清「为什么改」和「改了什么」。版本号以项目根 `VERSION` 文件为唯一权威（当前版本条目待 VERSION 文件确定后对齐）。

## [Unreleased]

### 变更（P3 架构图五处措辞修订：Harness 口径 + 表述泛化）

- **为什么改**：用户实看后提五项——①「双端点切换」改「多端点切换」（桥实际支持的不止两个端点，双端点是当前用法，表述泛化）；②「思考档位 max」改「思考档位调节」（标签说的是能力是可调，不是固定 max）；③「Claude Code 当操作界面」改「Claude Code 作为主力Harness」、④ 底部「Claude Code 界面不变」改「Claude Code Harness 不变」（对外口径统一用 Harness，与「界面」的日常含义区分）；⑤ 发布当天说明「桥的默认模型就从 5.2 切到 5.3，无缝切换」改第一人称陈述「我就把桥的默认模型从 5.2 切到了 5.3」（去掉宣传腔）。
- **改了什么**：`tmp/xhs-glm53/p3-bridge.svg` 五处文本——副标「Claude Code 当操作界面」→「Claude Code 作为主力Harness」、右上胶囊「思考档位 max」→「思考档位调节」、右下胶囊「双端点切换」→「多端点切换」、说明卡小字「桥的默认模型就从 5.2 切到 5.3，无缝切换」→「我就把桥的默认模型从 5.2 切到了 5.3」、底部提示「Claude Code 界面不变」→「Claude Code Harness 不变」。Chrome headless 重渲染 PNG，视觉核验五处文字逐字正确、无溢出截断，左右四枚胶囊标签与其它文字无重叠。

### 修复（TraeCode 换 JWT 仍 400：环境变量注入的代理绕过了 proxyMode，改配 VSCode `http.noProxy`）

- **为什么改**：杀掉旧 ai-server 后重试登录，仍在最后一步 `refreshJwtToken error: 400`（明文 HTTP 撞代理）。深挖发现换 JWT 的请求不走 ai-server 的 TTNet 通道（新 server 日志 16 条全 `via_proxy:false` 却仍失败），而是扩展宿主（exthost）里另一条 axios 路径——它吃的是**进程环境变量** `HTTPS_PROXY`。而 exthost 进程环境里的 `HTTP_PROXY/HTTPS_PROXY=127.0.0.1:1087`、`NO_PROXY` 仅默认三项，来源不是 shell（VSCode 主进程由 launchd 启动、无这些变量），而是 **VSCode `http.proxySupport` 读系统代理后给扩展进程注入的环境变量**，注入时丢掉了系统 ExceptionsList 里的 `*.cn`。TraeCode 的 `trae.advanced.proxyMode` 只管 TTNet 通道，管不到这条 axios 路径；其捆绑 HTTP 栈会读 `no_proxy`/`NO_PROXY` 环境变量做豁免（解混淆确认）。验证闭环：curl 模拟「明文 POST 打代理端口 + Host 头」精确复现同款 400；`NO_PROXY` 覆盖 `api.trae.com.cn` 后同请求直连成功（到达 Trae API 网关返回业务层 JSON）。
- **改了什么**：① `~/.zshrc` 的 `NO_PROXY` 追加 `.trae.com.cn,.trae.cn,.marscode.com,.marscode.cn,.byted.org,.zijieapi.com`（管终端启动的进程）；② VSCode 用户设置新增 `http.proxy: http://127.0.0.1:1087` + `http.noProxy: [.trae.com.cn, .trae.cn, .trae.ai, .marscode.com, .marscode.cn, .byted.org, .zijieapi.com]`（用户设置优先于系统代理，VSCode 按它给扩展进程注入环境变量，`.cn` 等豁免不再丢失）。需彻底重启 VSCode 使 exthost 拿到新环境变量。


### 修复（TraeCode 登录走到「网页认证转圈」：后台 ai-server 子进程残留旧代理配置）

- **为什么改**：上一条 no_proxy 修复后登录能跳转网页了，但网页端一直「认证中」转圈。排查插件日志发现授权流程其实走完了大半：`ExtensionUriHandler handleUri` → `login successfully`（已拿到 refresh_token），卡在最后一步「refresh_token 换 JWT」——`refreshJwtToken error: Request failed with status code 400`，响应头又见 `proxy-connection: keep-alive`（这个请求又走了代理），插件随即 `deleteAllInfo` 清掉登录信息判定失败，网页端等不到确认永远转圈。根因：发起该请求的不是插件本体，而是后台 ai-server 子进程（`aiServerMainV2.js` / `ai-agent` / `ckg_server`，23:18 启动）；这些进程在 VSCode reload window 后**不会重启**，插件只是重连旧 server，旧进程仍带着改配置前的 `system` 代理设置 → 明文 HTTPS 撞代理 400。
- **改了什么**：杀掉 4 个旧 ai-server 后台进程（`kill` PID 1693/1707/1706/1705），插件自动以新配置重新拉起全新 server（23:47 启动，新 ckg 端口 52812）。验证新 `ai-agent` 日志：全部请求 `via_proxy:false`（16 条全直连）、10 成功 0 失败。经验教训：TraeCode 的 `trae.advanced.proxyMode` 改完后，仅 reload window 不够——后台 `~/.marscode` 的 ai-server 进程要一并杀掉重启才会应用新代理配置（也可彻底退出 VSCode 再重开）。


### 修复（TraeCode VSCE 无法登录：插件走系统代理时 HTTPS 被明文转发）

- **为什么改**：用户装好 TraeCode（marscode.marscode-extension v1.7.8，VS Code Marketplace）后点登录无反应。排查 `~/.marscode/logs/` 客户端日志，四个登录接口（api.trae.com.cn / api.marscode.com / 企业版 cn / 企业版 sg 的 `GetLoginGuidance`）全部报 `400 Bad Request — "The plain HTTP request was sent to HTTPS port" (Tengine)`。根因链：本机系统 HTTP/HTTPS 代理指向 `127.0.0.1:1087`（xray，ProxyToolkit）→ 插件 `trae.advanced.proxyMode` 默认 `system` 跟系统代理 → 插件的 TTNet 网络栈把 HTTPS 请求以明文 HTTP 发给代理（不走标准 CONNECT 隧道）→ 源站拒绝。旁证：curl 走同一代理用标准 CONNECT 是 200（xray 本身正常，是插件代理实现的缺陷）；绕过代理直连 cn 区接口也是 200（直连可用）。另：插件没有公开文档说明 proxyMode 取值，从 extension.js 解混淆得到取值为 `no_proxy` / `manual` / `system`。
- **改了什么**：VSCode 用户设置（`~/Library/Application Support/Code/User/settings.json`）新增 `"trae.advanced.proxyMode": "no_proxy"`，让插件绕过系统代理直连（Trae 域名在国内直连可用，PAC 分流里本就走 DIRECT）。该文件是本机配置、不在任何 git 仓库，此处仅记录变更过程。


### 变更（P6 上手 3 步：仓库指引精确到 owner/repo + 舰队→团队）

- **为什么改**：用户要求两处措辞修订——① 步骤 2 小字「GitHub 搜 CC-BRIDGE」指代不精确（GitHub 搜 CC-BRIDGE 会出一堆同名结果），改为「GitHub 搜 xhqing/CC-Bridge」精确到 owner/repo；② 底部关注引导「AI Agent 舰队连载」的「舰队」是内部叫法，改为「团队」对齐对外措辞统一（2026-08-16 起 fleet → team，与 P4 修订同批）。
- **改了什么**：`tmp/xhs-glm53/p6-start.svg` 两处文本——「GitHub 搜 CC-BRIDGE，本地一条命令启动」→「GitHub 搜 xhqing/CC-Bridge，本地一条命令启动」（CC-Bridge 大小写按仓库名实际写法）；「关注我，看 AI Agent 舰队连载」→「关注我，看 AI Agent 团队连载」。Chrome headless 重渲染 PNG，视觉核验两行文字逐字正确。

### 变更（P4 团队墙：措辞修订 + 九宫格中文 Title 溢出卡片下缘修复）

- **为什么改**：用户实看后提四项——①「舰队」改「团队」（面向小红书受众，舰队是内部叫法，与 2026-08-16 起 fleet → team 的措辞统一同向）；②「agent」改「AI Agent」（完整称呼）；③ 底部「搜索 Agent 名字即可找到」改为直给仓库地址「https://github.com/xhqing」（省一步搜索）；④ 下半部九宫格 9 个 agent 的中文 Title 超出背景框。溢出根因：小卡高 130px，但 Title 基线在卡顶 +138px（首行卡底 y=830、Title 基线 y=838），布局天生越界 8px，与 P2 溢出同源（SVG 文本不自动避让，行基线须按卡片边界实算）。
- **改了什么**：`tmp/xhs-glm53/p4-fleet.svg`——① 页眉标题「它在我舰队里的位置」→「它在我团队里的位置」，aria-label 同步；② 副标「各有职责的 agent」→「各有职责的 AI Agent」；③ 底部提示「仓库都在 GitHub @xhqing，搜索 Agent 名字即可找到」→「仓库都在 https://github.com/xhqing」；④ 九宫格与行 4 卡片重排：卡高 130→140px，内容上收并微缩（emoji 40→38、名字 28→26、Title 20→18，三行基线改为卡顶 +56/+100/+128），四行卡 y=700/870/1040/1210（行距 30px），最后一行底边 1350、仍在画布（1440）内。Chrome headless 重渲染 PNG，视觉核验：标题/副标/底部地址逐字正确，九宫格 9 卡与行 4 两卡文字全部落在卡片内部。

### 变更（措辞统一 fleet → team：`.commit-cache.md` 缓存标记跟随全局统一）

- **为什么改**：用户 2026-08-16 已把 xhqing 主页 README 的自称从「舰队 / fleet」改为「团队 / team」，全局元规范与 commit skill 已同步改（2026-08-21，记录见 CapabilityManagerAgent CHANGELOG），本仓 `.commit-cache.md` 缓存标记里的「fleet visitors 徽章」是同一批存量；2026-08-21 用户裁定全量存量一次清零、统一为团队 / team。
- **改了什么**：`.commit-cache.md` 1 处缓存标记「fleet visitors 徽章属允许例外」→「团队 Visitors 徽章属允许例外」（顺手首字母大写对齐）。仅改措辞，检测逻辑、徽章均不变。

### 修复（P2–P6 五张 PNG 的 emoji 全渲染成黑色剪影）

- **为什么改**：用户实看发现 p2–p6 五张 PNG 里所有 emoji 图标都是全黑、看不出是什么。根因：这批 PNG 原先用 `rsvg-convert` 渲染，而 rsvg-convert 不支持彩色 emoji 字体（Apple Color Emoji 是 CBDT/sbix 位图字体），SVG 里未指定字体族的 emoji 文字元素被回退到单色符号字体，于是每个 emoji 都渲染成黑色实心剪影（黑方块、黑盾牌、黑桥等）。经 Chrome headless 渲染同一份 SVG 对照，emoji 全部正常显示彩色，确认是渲染器问题而非 SVG 本身问题。
- **改了什么**：`tmp/xhs-glm53/` 下 p2-model / p3-bridge / p4-fleet / p5-experience / p6-start 五张 PNG 改用 Chrome headless（`--screenshot --window-size=1080,1440`）从对应 SVG 重新渲染（SVG 源文件未动，p1-cover 无 emoji 不需重渲）。逐张裁剪 emoji 区域做视觉验证：p2 盾牌 🛡️ 银灰底橙红斜纹、p3 夜景桥 🌉 橙色桥身、p4 全部 14 个 agent 图标彩色、p5 绿色对勾 ✅、p6 黄黑条纹蜜蜂 🐝，全部正常彩色，尺寸仍为 1080×1440。经验教训：SVG 含 emoji 时渲染 PNG 不能用 rsvg-convert（不支持彩色 emoji 字体），要用 Chrome headless 或其它支持彩色 emoji 字体的渲染器。

### 修复（P2 模型速览卡：小字溢出卡片右缘、大数字与标题重叠）

- **为什么改**：用户实看发现 P2 图文字跑出方框。根因两处——① 卡 1 小字「智谱内部基准 Z.ai Code Bench，对比 GLM-5.2」起点 x=560 太靠右，文字实际宽度超出卡片右缘（x=1000）；② 卡 2 大数字「28.3」（104px，右端约 x=592）与右侧起点 x=560 的标题「终端任务得分（约 6 倍）」横向交叠约 32px。经验教训：SVG 文本不自动换行也不自动避让，中文行宽不能目测，须按字号 × 字数实测（PingFang SC 每个中文字宽 ≈ 字号值）。
- **改了什么**：`tmp/xhs-glm53/p2-model.svg` 重排四张卡布局——统一「左数字区（x=140 起，宽 ≤450）+ 右文字列（x=480 起）」两栏，所有小字换短表述（「Z.ai Code Bench · 对比 GLM-5.2」「Terminal-Bench 3.0：4.6 → 28.3」「最大输出 128K · 思考强制开启」「low / high / max 三档推理强度」）；卡 2 大数字改为「×6」消重叠、原始分数 4.6 → 28.3 移入小字行。重渲染 PNG 并做像素级验证：四张卡右缘外（x>1005）零文字级亮像素（>230），卡内文字最右端距卡边 89–225px，大数字与右列间隔区干净。

### 新增（小红书图文帖方案：GLM-5.3 使用体验 + 开源作品分享，临时产物）

- **为什么**：用户要发一篇小红书图文分享帖，主题为 GLM-5.3（智谱 2026-08-14 发布）的使用体验与基于它做出的开源作品；先经三轮对内容口径的修订（Victor 去掉市场地域词、Markowitz 改单干与泛化评估表述、撤下网络运维 agent、Tinker 改按需打补丁、删与闭源模型对比的两句、封面副标改为「我把它用于我开源的 14 个 AI Agent」、体验清单只留优点），定稿后用户指示「开工」产出配图。
- **改了什么**：在 `tmp/xhs-glm53/` 下产出 6 张 1080×1440（3:4 竖版）SVG 卡片及 rsvg-convert 渲染的 PNG——P1 封面（标题 + 副标 + 发布日期角标）、P2 模型速览（+50% / 4.6→28.3 / 1M 三大数字卡 + 安全能力涌现卡，标注数据来源为智谱官方文档）、P3 CC-Bridge 架构图（Claude Code → 本地桥 → z.ai / 智谱双端点）、P4 Agent 舰队作品墙（4 张主打卡 + 9 宫格 + 「…共 14 个」收口）、P5 真实体感（三条 ✅ 优点 + 互动引导）、P6 上手 3 步 + 关注引导。配色统一为靛蓝深底渐变 + 青→紫渐变强调色（fleet 风格），已渲染 PNG 并经视觉核验（文字无溢出截断、中文与 emoji 渲染正常、网格对齐）。`tmp/` 已在 `.gitignore`，不入库。

### 变更（Visitors 徽章更名 Visits/day (14d)：alt 文本与 xhqing 集中统计新 label 对齐）

- **为什么改**：用户要求（2026-08-17）访问量徽章名需表达「最近半月日均访问量」口径——xhqing 集中统计侧的 badge JSON label 已从 `Visitors` 改为 `Visits/day (14d)`（`Visits/day` 是 shields.io 表达日均的惯例写法、`(14d)` 标注 14 天滚动窗口），各仓 README 的徽章 alt 文本同步对齐，避免 alt 与徽章实际显示文字脱节。
- **改了什么**：README 徽章区 `alt="Visitors"` → `alt="Visits/day (14d)"`，仅改 alt 文本，endpoint URL、数据源、徽章口径均不变（口径改动记 xhqing 仓库 CHANGELOG，本仓只改 alt）。

## [1.0.0] - 2026-08-10

### 变更（Visitors 徽章 alt 文本首字母大写：README 访问量徽章命名统一）

- **为什么改**：用户指令（2026-08-16）「Visitors 徽章全局统一，首字母大写」——配合全局 `~/.claude/CLAUDE.md`「徽章英文首字母必须大写」新规，集中统计上线时挂的访问量徽章 `alt="visitors"` 为小写存量，与 badge JSON label（`Visits/day`）及大写规范不一致，本次一次收口。
- **改了什么**：README（EN/CN）徽章区 visitors 徽章 `alt="visitors"` → `alt="Visitors"`，仅改 alt 显示文本，endpoint URL 与数据源不变。

### 变更（README 徽章组合合规修正，2026-08-16 `/commit` 第 9l 步）

- **为什么改**：README 徽章行含 `Last Commit` 动态徽章（`img.shields.io/github/last-commit/...`），违反 2026-08-16 新立的徽章组合规矩——标准徽章固定为 License / Version / Type 三枚静态徽章，不得含 GitHub 动态数值 / 时间徽章；且此前缺 Version 徽章，标准三枚不齐。
- **改了什么**：README（EN/CN）徽章行——删除 Last Commit 动态徽章，新增 Version 静态徽章（`Version-1.0.0-blue`，版本号取 VERSION 文件）；License / Type 两枚原样保留，visitors 访问量徽章（fleet 例外，指向 `xhqing/xhqing` traffic/badges/）保留未动。修正后徽章组合：License / Version / Type + visitors。

### 新增（README 访问量徽章——舰队集中式访问统计）

- **为什么改**：全舰队上线集中式「真去重」访问统计（图片徽章方案无法去重，走官方 Traffic API 路线）：统计集中部署在 xhqing 仓库（`scripts/update_traffic.py` + 每日 GitHub Action），各 fleet 仓库只需在 README 挂徽章、零运行负担。
- **改了什么**：README（EN/CN）徽章区新增 visitors 徽章（shields.io endpoint 指向 `xhqing/xhqing` 仓库 `traffic/badges/<repo>.json`，由每日采集的官方 Traffic API 数据更新）。徽章数字含义：按日去重访客的累计（GitHub 只提供每日 uniques，跨天不去重），自 2026-08-16 起累计。

### 移除

- **移除与全局重复的通用能力副本**（2026-08-09，按全局新规则「通用能力开源单一出口」统一清理）：删除 `.claude/skills/anysearch/`、`.claude/skills/find-skill/`、`.claude/commands/install-skill.md` 与 `.claude/rules/` 通用三件套（file-operation-priority-rules / tmp-dir-for-artifacts / verify-before-report）；`.gitignore` 去 find-skill 忽略条目。**为什么**：通用能力开源分发已统一由 CapabilityManagerAgent（Prometheus）的 `claude/` 镜像承担，新建项目不再放置副本（副本易过期分叉）；本项目的 `.claude/CLAUDE.md` 相应更新为「通用能力从全局 `~/.claude/` 或该镜像获取」。
- **移除 AutoMemory 相关配置**（2026-08-10，用户清理）：删除 `.claude/settings.json`（memory hooks 配置）与 `.claude/hooks/` 两个脚本（mark_memory_write.py / check_memory_and_prompt.py）。**为什么**：全局 AutoMemory 已禁用（2026-07-20 立），hooks 依赖的机制不再生效，清理机器残留。

### 新增

- **新增 `VERSION` 文件（1.0.0）**：项目标配缺失，由 `/commit` 第 9m 步按规则补齐（版本号取值：无 package.json / 主 manifest / 已有版本标题 → 取默认 `1.0.0`）。**为什么**：VERSION 是项目版本号唯一权威（全局规则「版本信息一致性」，2026-07-19 立），此前的 CHANGELOG 顶部 `## Unreleased` 段缺少对应版本标题，待下次 `/commit` 第 9k 步自动对齐。
- **纳入子项目 xhqing（用户 GitHub 个人主页仓库）**（2026-08-10，用户指定「xhqing 这个以我的名字命名的项目作为你的子项目交给你负责」）：按「Agent 项目与子项目的 `.claude/` 超集关系」规则（2026-08-10 立）执行——在 `.claude/CLAUDE.md` 新增「子项目清单」节登记 xhqing；在 xhqing 项目新建 `.claude/CLAUDE.md`（Kit 的 CLAUDE.md 全文 + 顶部指代说明，指明适用对象为 xhqing 子项目）与 `.gitignore`（沿用 Kit 规则：运行时数据 docs/、artifacts/、本地配置 settings.local.json、tmp/、密钥兜底等）。**为什么**：xhqing 是用户的 GitHub 个人主页仓库（README 中英双语、含 Kit 拟人名署名），与 Kit 归属一致；纳入子项目后，用户只操作 xhqing 时也能加载 Kit 的完整规则。同步过程中因用户同步清理 Kit 的 `.claude/`（删 settings.json 与 hooks，见「移除」节），最终按清理后最新状态对齐：两个项目的 `.claude/` 均仅剩 CLAUDE.md，diff 验证一致。
- **新增 `docs/task-pool-bidding-sop.md`（任务池投标 SOP）**：经调研确定「AI 服务接单 + 任务池投标」为确定性最高的获客路径，把对话中沉淀的方法论固化为可执行文档，含每日 4 小时 SOP、三类单筛选标准、三份可复用标书模板、破冰与止损点、从一次性单转合约单的路径。文档存放于 `docs/`（.gitignore 忽略的本地业务数据目录，不随开源仓库公开）。
- **新增 `docs/task-pool-bidding-sop.md`（任务池投标 SOP）**：经调研确定「AI 服务接单 + 任务池投标」为确定性最高的获客路径，把对话中沉淀的方法论固化为可执行文档，含每日 4 小时 SOP、三类单筛选标准、三份可复用标书模板、破冰与止损点、从一次性单转合约单的路径。文档存放于 `docs/`（.gitignore 忽略的本地业务数据目录，不随开源仓库公开）。
- **新增 `CHANGELOG.md`**：项目标配文件缺失，按纪律补齐；本条目即本次变更记录。`VERSION` 文件暂未创建，版本条目待 VERSION 确定后对齐。
- **`docs/task-pool-bidding-sop.md` 更新**：把「每天扫 EigenFlux feed 一次」加进每日 SOP 表格（上午随刷单顺手做，≤10 分钟），并在第八节新增「EigenFlux 情报扫描」说明——定位为行业情报源 + 潜在线索池，明确判断标准（协作/知识交换类跳过，带预算/交付物才投入）与边界（不进主线 4 小时，避免分散精力）。
- **新增 `docs/bidding/bid-templates.md`（投标标书模板库）**：三类型标书完整版（AI 客服/自动化/小程序）+ 投标话术补充（破冰、报价异议、比稿拒绝、转维护）+ 避坑清单。与 SOP 配套，把对话中沉淀的标书从 200 字概要升级为可直接复用的完整模板。
- **新增 `docs/bidding/generate_bids.py`（批量生成标书脚本）**：从 CSV/JSON 任务列表批量生成三类型标书草稿，把单份标书时间从 30 分钟压到 5 分钟（只填需求信息、模板自动套用）；缺失字段自动填占位符保证不崩；支持 `--demo` 演示、`--out` 指定输出目录。
- **新增 `docs/bidding/tasks.example.csv`（任务列表样例）**：示范 CSV 格式，供真实投标时填写。
