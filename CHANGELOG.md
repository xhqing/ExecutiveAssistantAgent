# CHANGELOG

本文件记录本项目（PersonalAssistantAgent / Kit）每次文件增删改查的变更，写清「为什么改」和「改了什么」。版本号以项目根 `VERSION` 文件为唯一权威（当前版本条目待 VERSION 文件确定后对齐）。

## [Unreleased]

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
