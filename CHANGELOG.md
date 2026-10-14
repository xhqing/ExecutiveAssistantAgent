# CHANGELOG

本文件记录本项目（ExecutiveAssistantAgent / Kit）每次文件增删改查的变更，写清「为什么改」和「改了什么」。版本号以项目根 `VERSION` 文件为唯一权威（顶部条目版本号须与 `VERSION` 一致——release skill 的就绪判据；`[Unreleased]` 位于顶部表示有新内容待发版）。

## [Unreleased]

### 新增（.ignore：让搜索类工具不忽略 tmp/，pi 的 @ 补全可见 tmp 目录）

- **为什么改**：2026-10-14 用户反馈 pi 输入框输入 `@` 后搜不到 `tmp` 目录。查证：pi 的 `@` 模糊补全底层用 fd 搜索项目文件，fd 默认遵守 `.gitignore`，而 `tmp/` 正被本项目忽略，故不出现在补全列表。目标：补全能搜到 tmp 下的临时文件。
- **改了什么**：① 新增 `.ignore`（内容 `!tmp/` 白名单）——`.ignore` 是 fd / ripgrep / VS Code 搜索 / pi 自带 find、grep 共同读取的搜索类工具忽略文件（ripgrep 生态约定，git 不读），该白名单只影响搜索类工具（不再跳过 tmp/），不影响 git（tmp/ 仍被 `.gitignore` 忽略、不会误提交）；② `.gitignore` 增加一行忽略 `/.ignore` 自身——属本机使用偏好，不进仓库、不改变其他 clone 者的搜索行为。已实测：fd 用 pi 的完整参数组合能搜到 `tmp/`，`git check-ignore tmp/` 仍命中 `.gitignore`，`git status` 看不到 `.ignore`。

### 变更（子项目 CyberRipple、blog 取消维护；本地项目资料删除）

- **为什么改**：2026-10-14 用户决定——两个子项目取消、不再维护，本地项目资料删除；远端仓库保留为存档（CyberRipple 原未建远端仓库，其组织总览内容已并入 xhqing 主页 README；blog 的远端仓库与线上站点保留）。
- **改了什么**：① 本项目 `CLAUDE.md`（`AGENTS.md` 为其符号链接）「子项目清单」节移除 CyberRipple、blog 两条目，并加一行「已取消」说明；② 本地删除 `~/Developer/blog` 目录（删除前已核验干净且全部提交已推送；线上站点由 GitHub 托管、不受本地删除影响）；CyberRipple 本地目录暂留——其原未建远端仓库，备份方式（是否新建远端）待用户确认后再处理；③ 全局注册表 `agents-registry.md` 对应行同步删除（镜像同步记录见 CapabilityManagerAgent CHANGELOG）。

### 变更（xhs-mentor-scam 路径引用更正：仓库已移出本项目 tmp/video）

- **为什么改**：xhs-mentor-scam 仓库 2026-10-14 已从本项目 `tmp/video` 移至 `~/Developer/xhs-mentor-scam`（移库动作与脚本 / plist 路径修正记于该仓库自身 CHANGELOG），本项目侧与全局注册表中的路径引用未同步更正，属陈旧文档。
- **改了什么**：① 本项目 `CLAUDE.md`「子项目清单」节中 xhs-mentor-scam 条目的路径更新为 `/Users/xhq/Developer/xhs-mentor-scam`（标注移出 `tmp/`）；② 全局注册表对应行同步更正（镜像同步记录见 CapabilityManagerAgent CHANGELOG）。

### 修复（input-llm-dump：去掉每次重写的 latest.json、默认只留 5 份）

- **为什么改**：2026-10-14 测试发现 `latest.json` 每次请求都被重写，而它被 ai-edit-diff 的变更跟踪盯上，形成「重写 → 变更通知 → 通知触发新一轮请求 → 再次重写」的自我循环（每一轮都是真实模型调用；用户明确反馈「为什么还不停」）。另：此前定的「保留 5 份」没能进入运行中的 pi 进程（环境变量需进程重启才生效），dump 一直不限量。
- **改了什么**：① `.pi/extensions/input-llm-dump.ts` 去掉写 `latest.json`（找最新一份改用 `ls -t tmp/input-llm-dump/*.json | head -1`），从源头断掉循环；② `prune()` 默认值改为保留最近 5 份（`INPUT_LLM_DUMP_KEEP` 仍可覆盖，<=0 / 非数字 = 不限），`/reload` 后即生效、无需重启进程；③ 应急：已把现存 `latest.json` 置为只读（chmod 444）先止住写入循环，`/reload` 加载新代码后该陈旧文件可直接删除。

### 变更（项目级扩展改为 input-llm-dump：每次请求全量导出输入 LLM 的内容）

- **为什么改**：2026-10-14 用户指出 system-prompt-dump 只导出「系统提示词」，而每次请求输入 LLM 的还有完整对话历史、工具 schema、生成参数等——要看就得看每一次请求的全量输入。用户要求把扩展改造成 input-llm-dump：每次请求 dump 一次完整的输入内容。
- **改了什么**：① 原 `.pi/extensions/system-prompt-dump.ts` 重命名并重写为 `.pi/extensions/input-llm-dump.ts`——监听 `before_provider_request`（provider payload 组装完成、请求发出前），把 payload 原样 JSON 落盘到 `tmp/input-llm-dump/`：每次请求一份 `<本地时间戳>.json`（如 `2026-10-14T11-52-03-117.json`），另写固定路径 `latest.json`；写盘排队、不阻塞请求，失败静默忽略；设 `INPUT_LLM_DUMP_KEEP=<份数>` 可只保留最近 N 份，默认不限；② 不再写 `tmp/system-prompt.md`（系统提示词已含在 payload 的 messages 里）；③ 已用 Node 模拟钩子实测：落盘内容与 payload 一致、同毫秒请求不覆盖、KEEP 裁剪正常。

### 新增（项目级扩展 system-prompt-dump：导出当前完整系统提示词到 tmp/）

- **为什么改**：2026-10-13 用户问「pi 默认的系统提示词文件在哪里」——查证发现默认提示词硬编码在 pi 安装包的构建产物里（`dist/core/system-prompt.js`），完整提示词是运行时拼装的（默认身份段 + 工具清单 + 内置规则 + 文档指引 + 项目上下文 + skills + cwd），平时没有现成文件可看。用户要求写一个小扩展导出「当前实际生效的完整系统提示词」，便于核对。
- **改了什么**：① 新增项目级扩展 `.pi/extensions/system-prompt-dump.ts`——监听 `agent_start` 事件，把 `ctx.getSystemPrompt()` 的完整结果覆盖写入 `tmp/system-prompt.md`（写失败静默忽略、不阻塞会话）；② 已用 `pi -p` 实测：文件生成成功（80,907 字节、444 行），结构正确（preamble / tools / rules / docs / project_context / skills / cwd 齐全）。输出目录 `tmp/` 已被 .gitignore 忽略、不进 git。

### 新增（子项目 xhs-mentor-scam：小红书陪跑反诈视频项目，独立私有仓库）

- **为什么改**：用户 2026-10-13 指定——`tmp/video/` 下的视频项目材料新建独立 git 仓库并绑定 GitHub 私有远程（改动实时备份），项目归 Kit 负责。
- **改了什么**：① 本项目 `AGENTS.md` / `CLAUDE.md` 的「子项目清单」节新增 `xhs-mentor-scam` 条目（与全局 `~/.claude/docs/agents-registry.md` 子项目映射表及 CapabilityManagerAgent 镜像同步一致；镜像同步记录见 CapabilityManagerAgent CHANGELOG）；② 视频项目材料就地建为独立 git 仓库（`tmp/video/`，含配音稿 / 分场脚本 / 分镜清单 / 工作流 / 编辑器扩展源码 + 仓库脚手架），仓库自身变更记该仓库 CHANGELOG。

## [1.1.4] - 2026-10-13

### 变更（删除 scroll-reverser 项目级 skill——本机已改用 macOS 自带滚动方向设置）

- **为什么改**：2026-10-13 用户决定卸载 Scroll Reverser、改用系统自带「自然滚动」设置后（方向控制点只剩系统设置这一处），**用户明确指示删除该 skill**（原话：「这个 skill 可以删掉了，我知道在哪里设置了」）。skill 的维护对象已不存在，留着只会误导后续会话去查一个已卸载的第三方工具。
- **改了什么**：① 删除 `.pi/skills/scroll-reverser/` 整个目录（SKILL.md、references/guide.md、local/README.md、local/config.md——如需回溯可在 git 历史中找回）；② README 双版「内置能力 / Built-in skills」列表同步移除 scroll-reverser 条目。

## [1.1.3] - 2026-10-13

### 变更（scroll-reverser skill：补系统「自然滚动」值排查；本机改用系统设置并卸载 SR）

- **为什么改**：2026-10-13 用户再报「触控板滑动方向又反了」。排查确认不是 SR 故障——SR 进程、主开关、配置全部正常，根因是系统 `com.apple.swipescrolldirection`（自然滚动）被关掉：SR 的反转叠加在系统值之上，系统值一关、方向整体翻回系统默认，现象与 SR 失灵完全一样（原 skill 的排查流程没有这一步，容易漏判）。用户决定：不用鼠标、卸载 SR、改用 macOS 自带设置——系统自带「自然滚动」是全局单一开关（触控板与鼠标联动），本机只用触控板，系统自带完全够用。
- **改了什么**：① `.pi/skills/scroll-reverser/SKILL.md`——新增「与系统自带『自然滚动』设置的关系」节（全局单一开关、与 SR 的叠加反转机制）；第 4 步拆分「4a 系统值被改」先于「4b toggle 重置」；第 1 步补「先读 local/config.md 确认本机是否仍在使用 SR」。② `.pi/skills/scroll-reverser/local/config.md`（本机数据、gitignored）——记录系统侧应然值、2026-10-13 两次诊断修复记录、以及「已卸载 SR、改用系统设置」的新基线（系统「自然滚动」= 关闭）。③ 本机卸载 SR：退出 app → 登录项移除 → app 与缓存目录移入废纸篓（可恢复）→ 系统「自然滚动」写为关闭（= 用户偏好方向），偏好 plist 保留（重装可恢复旧配置）。

## [1.1.2] - 2026-10-12

### 变更（子项目规则修订：子项目不再携带智能体专属文件；4 个子项目随附文件已清理）

- **为什么改**：用户 2026-10-12 修订团队规则——智能体专属文件（`CLAUDE.md` / `AGENTS.md` / `.claude/` / 项目级 `.pi/`）从此只有 Agent 项目允许拥有，非 Agent 项目（含子项目）一律不得存在；后台开启 pi 会话（intercom / agent_call / agent_wake）只能以 Agent 项目根目录为工作目录。细则见全局 `~/.claude/docs/agents-registry.md`「智能体专属文件归属与子项目映射」节。本项目 4 个子项目此前按旧「超集」规则随附了本项目的智能体专属文件，需按新规清理。
- **改了什么**：① 本文件「子项目清单」节改为新规表述（去掉「`.claude/` 超集关系」，改为子项目不得携带智能体专属文件 + 后台会话以本项目根为工作目录）；② 清理 4 个子项目随附文件：xhqing `CLAUDE.md`、CyberRipple `.claude/CLAUDE.md`、blog `.claude/CLAUDE.md`、copybridge `CLAUDE.md` + `AGENTS.md`（均为本项目 CLAUDE.md 全文随附内容，删除无内容损失；各子项目 CHANGELOG 分别记录）。

## [1.1.1] - 2026-10-12

### 新增（tmp/tokenplus_discount.py：tokenplus.cn 模型折扣期限查询脚本）

- **为什么改**：2026-10-12 用户要求核实 tokenplus.cn 上「数据宝」服务商 DeepSeek V4.1 Flash 的优惠截止日期，并要一个可在终端自行反复运行的查询脚本；核查时发现「TokenPlus 优选」同款模型另有一条「v4.1最新优惠」也在有效期内，一并纳入脚本查询范围。
- **改了什么**：新建 `tmp/tokenplus_discount.py`（gitignored 临时工具，纯标准库、无第三方依赖）——先经 `/portal/api/v1/models` 搜索模型取得 model_service_id，再取 `/portal/api/v1/models/{id}/channels` 中各服务商的实时价格与折扣期限，终端输出「数据宝」「TokenPlus 优选」两家的折扣标签与名称、原价→折后价（非缓存输入 / 缓存命中 / 输出）、优惠起止时间与当前状态（含剩余时长）。运行命令：`python3 tmp/tokenplus_discount.py`。
- **验证**：2026-10-12 实测运行通过——数据宝「数据宝优惠」期限 2026-10-09 18:15 → 2026-11-01 00:00（北京时间）；TokenPlus 优选「v4.1最新优惠」期限 2026-10-11 14:33 → 2026-10-31 00:00（北京时间）。

## [1.1.0] - 2026-10-12

### 新增（项目级 skill：scroll-reverser 由全局迁入，成为 Kit 专属 skill）

- **为什么改**：2026-10-12 用户决定把 scroll-reverser skill 从全局通用能力（原先在 `~/.claude/skills/`、任何项目可用）转为本项目专属 skill——它维护的是本机这台 Mac 的滚动方向工具，归 EA 项目语义更贴切；迁移后不再占用全局能力、不再参与开源镜像同步链，后续维护随本仓库走。
- **改了什么**：① 迁入 `.pi/skills/scroll-reverser/`（SKILL.md、references/guide.md、local/README.md 入库；本机数据 `local/config.md` 由 `.gitignore` 忽略、不进仓库）；`.gitignore` 新增「项目级 skill 本机数据子目录」忽略规则（`.pi/skills/*/local/*`，保留 `README.md` 作结构说明）。② 全局下线：`~/.claude/skills/scroll-reverser/` 与 `~/.pi/agent/skills/scroll-reverser/` 已删除；开源镜像（CapabilityManagerAgent）中同步移除（其侧变更另记于该仓库 CHANGELOG）。③ README 双版「Built-in skills / 内置能力」节各新增一条。
- **验证**：迁移内容与源 diff 逐字节核验一致；`git check-ignore` 确认 `local/config.md` 被忽略、`local/README.md` 可入库。

## [1.0.5] - 2026-10-12

### 变更（临时测试文件归置：difftest.md 移入 tmp/）

- **为什么改**：2026-10-12 收尾巡检发现项目根遗留一个未跟踪的 `difftest.md`（2026-10-11 22:26 的 /diff 面板显示效果测试文件、「第二轮测试」版），按「临时产物一律放 tmp/」规矩归位，让仓库根恢复干净。
- **改了什么**：项目根 `difftest.md` → `tmp/difftest.md`（内容未动；tmp/ 中另有更早的同类测试文件 `tmp/diff-test.md`，两者并置备后续按需处置）。

## [1.0.4] - 2026-10-11

### 变更（子项目清单补登 copybridge）

- **为什么改**：2026-10-09 核对团队仓库 Visitors 徽章数据源时发现，copybridge（2026-10-08 建立的 macOS 剪贴板桥接工具，repo xhqing/copybridge）虽已开源并配有完整规范文件，但一直未登记进本项目的子项目清单（全局注册表超集映射表同日一并补登）；其访问量采集列表登记（xhqing 仓库采集脚本）已随同日变更完成。
- **改了什么**：`CLAUDE.md`「子项目清单」节在 blog 行后补一行 copybridge（macOS 剪贴板桥接工具；2026-10-08 建立、2026-10-09 补登记）；全局 `~/.claude/docs/agents-registry.md` 超集映射表同步加行（镜像同步记 CapabilityManagerAgent CHANGELOG）。

### 变更（README 增补「快速响应」工作原则条目）

- **为什么改**：README 的「工作原则」列表补充一条「快速响应」说明（琐碎、一次性的任务当场处理、不拖延），使原则列表与实际工作方式一致；本条为随 1.0.4 发版对 v1.0.3 之后入库改动的补记。
- **改了什么**：`README.md` / `README_cn.md` 工作原则段各增加一条 bullet——英文 "**Fast turnaround.** Small, one-off tasks get handled on the spot, not deferred."、中文「**快速响应**。琐碎、一次性的活当场搞定，不拖到下次。」（中英语义一致）。

## [1.0.3] - 2026-10-08

### 变更（tmp/codec-test/：在 VSCode 内出声的音频编码已实测确认）

- **为什么改**：上一条（1.0.2）的结论以「三个样本的实测结果为准」收尾，用户随即在 VSCode 里实测反馈：两个 MP4 样本（H.264 + MP3、H.264 + FLAC）**都有声音** ✓——「在编辑器内预览带声视频」的可行方案就此确认（webm 样本未反馈，预期不可播：库内无 matroska demuxer）。
- **改了什么**：回填实测结论，供以后参考——要在 VSCode 内预览出声，把音频转成 **MP3 或 FLAC 的 MP4**（视频流可 `-c:v copy` 无损保留：`ffmpeg -i 原.mp4 -c:v copy -c:a libmp3lame -b:a 128k 预览.mp4`，FLAC 换 `-c:a flac`）；原生 AAC 音轨的视频仍用系统播放器（QuickTime / IINA）看。

## [1.0.2] - 2026-10-08

### 新增（tmp/codec-test/：VSCode 内置播放器「有画面、没声音」的验证样本与排查结论）

- **为什么改**：用户 2026-10-08 问「VSCode 里打开 MP4 播放时没有声音，播放器下面的喇叭按钮点了也没反应」，排查确认根因是 **VSCode 自带的媒体解码库（`libffmpeg.dylib`）不含 AAC 解码器**——AAC 属收费许可的编码，VSCode 出于版权费用考虑只带了一部分解码器（官方答复见 issue #167685 / #329811，多年未修、明确为产品性限制）。因此：视频轨是 H.264（库里有）能正常播画面，音轨是 AAC（库里没有）无法解码，播放器就成了「有画面、没声音」；本文件本身没问题（同一文件用 QuickTime 播放正常，音量实测 -24.7dB 正常电平）。这与文件、系统音量、播放器按钮都无关——喇叭按钮只是播放器标配控件，背后没有解码出来的声音可调。
- **改了什么**：新建 `tmp/codec-test/`（gitignored，临时验证用）三个「视频流原样保留、只换音频编码」的样本：`mp3-audio.mp4`（H.264 + MP3）、`flac-audio.mp4`（H.264 + FLAC）、`vorbis-audio.webm`（VP8 + Vorbis），用于在 VSCode 里实测哪种音频编码能出声。
- **排查依据（供后续复用）**：VSCode 的 `libffmpeg.dylib` 出口符号表里只有 flac / h264 / mp3 / pcm / vorbis / vp8 解码器（无 aac / opus / vp9 / av1 / hevc），容器只支持 flac / mov(MP4) / mp3 / ogg / wav / raw（**无 matroska，即 .webm 文件预计连画面都播不了**）；对照同机其他 Electron 应用（Lark、夸克网盘）的同类库则带 `_ff_aac_decoder` 与 matroska。预览带 AAC 的视频请用系统播放器（QuickTime / IINA）；若必须在编辑器内预览出声，可把音频转成 **MP3 或 FLAC 的 MP4**（视频流可 `-c:v copy` 无损保留）——webm 路线不可行（缺 demuxer），最终以三个样本的实测结果为准。

### 变更（CHANGELOG 结构修复：补回 [1.0.1] 条目标题）

- **为什么改**：上一条编辑（写入 tmp/codec-test 条目）时误删了 `## [1.0.1] - 2026-10-07` 标题行，导致 1.0.1 的变更条目落进待发布段、文件顶部最新实际版本标题错退到 `[1.0.0]`。
- **改了什么**：补回 `## [1.0.1] - 2026-10-07` 标题行，termux-ssh 条目复归 1.0.1 段。

## [1.0.1] - 2026-10-07

### 变更（termux-ssh skill：补一条 Android 存储授权陷阱）

- **为什么改**：2026-10-06/07 排查「KeePassDX 打不开库、提示访问被文件管理器撤销」时定位到根因——**Android 的 SAF 只对「文件管理器创建的目录」做授权持久化** ✗，而该同步目录是当初用 Termux（SSH）建的：当场从文件管理器授权能打开、**下次从 App 列表进就失效**；把手机端 Syncthing 目录迁到用文件管理器创建的目录后恢复正常 ✓。这是用 SSH 操作手机会踩到的典型坑，而且症状容易误判成「库坏了 / 同步坏了」（本次就先后误判了三次：以为是 Argon2 版本、以为是 App 版本、以为是文件被替换），值得沉淀。
- **改了什么**：`.pi/skills/termux-ssh/SKILL.md`「走不通的路」表新增一行（Termux 建目录 → 别的 App 拿不到持久授权，要建的目录请让用户用文件管理器建）。
- **顺带**：① 本机 KeePass 设置说明写入 `~/Backup/KeePass/README.md`（**本机文件，不进仓库**，含资产位置 / 同步链路 / 恢复路径 / 踩过的坑）；② 剩余工作记入 `TODO.local.md`（T6 本机实时备份、T7 云端备份、T8 keyfile 冗余、T9 纸质卡、T10 演练提醒）。

## [1.0.0] - 2026-10-05

本版本为项目**首个正式版**：汇总项目建立至 2026-10-05 的全部变更——含项目更名（PersonalAssistantAgent → ExecutiveAssistantAgent）与角色定位调整（总经理助理 / 团队多面手）、三个子项目接管（xhqing / CyberRipple / blog）、CI 门禁与远端分支保护工作流落地、两个项目级 skill（language-partner / termux-ssh），以及多轮文档与合规清理。以下为完整变更条目。

### 新增（`.pi/skills/termux-ssh/`：Android 手机 SSH 操作流程 skill）

- **为什么改**：用户 2026-10-04 要求把当日「通过 SSH 操作手机（Termux）」的实战流程整理成项目级专属 skill，「下次操作手机可以少踩一些坑」。当日实战中真实踩到的坑：`termux-setup-storage` 不输 y 会中止且之后写 `/sdcard` 报 Permission denied；`authorized_keys` 用 heredoc 写会被拆行、只报 `Permission denied (publickey)` 难以定位；Termux 被系统冻结导致 `banner exchange` 超时 / 被杀导致 `Connection refused`；手机目录真实名字带前导空格（`" 我的文件"`）导致按中文名 `ls` 报 No such file；`Android/data/` 对 Termux 不可读；`pm list packages` 受包可见性过滤不可信。
- **改了什么**：新建 `termux-ssh` skill（SKILL.md 96 行 + `references/setup.md` 89 行，description 391/1024 字符、`check_description.py` 通过）：正文写「健康检查 → 三种失败形态对号入座 → 日常操作（找文件 / 取文件 / 校验 / 回写）→ 走不通的路 → 安全底线」，搭建细节与排错手册拆到 references；本机 IP、Termux 用户名一律用占位符（真实值只在 `~/.ssh/config` 的 `android` 别名里），符合「skill 内容纯净性」规矩。
- **顺带修正**：`README.md` / `README_cn.md` 的 skills 清单此前已过期（还列着 anysearch · find-skill，而它们早已按「通用能力单一出口」收归全局）——两版同步改为项目实际的两个 skill（`language-partner` · `termux-ssh`）。

### 新增（tmp/model-speed-test/probe_smooth.py：MiMo 流式粒度参数试探）

- **为什么改**：用户 2026-09-25 追问「mimo-v2.6-pro-ultraspeed 可以涓流输出吗」——需核查官方文档是否存在流式粒度参数，并实测验证。
- **改了什么**：新建 `probe_smooth.py`。结论：官方 API 文档只有 `stream: true/false` 一个开关、无任何粒度参数；实测 `stream_options.chunk_size=1`、`flush_interval_ms=5`、`stream_granularity=token` 三个候选参数全部被静默忽略（均为 24 块 / 间隔 62.5–62.8ms，与 baseline 一致）；结合官方博客（DFlash 块级并行推测解码）判定蹦块为服务端机制性行为，客户端参数无法改成涓流。另核查 pi TUI 无平滑渲染配置（bundle 里的 typewriter 为彩蛋动画组件，与流式渲染无关）。

### 新增（tmp/model-speed-test/probe_real.py：贴近 pi 真实场景的体感速度实验）

- **为什么改**：用户 2026-09-25 反馈体感上 MiMo-V2.6-Pro-UltraSpeed 比 deepseek-flash 输出更慢，与首版实测（纯解码速度 MiMo 快）矛盾——需补充贴近真实使用场景（长上下文 + 开思考 + 编码问题 + 走代理/直连双路径）的实验，定位体感差异来源。
- **改了什么**：新建 `probe_real.py`（测量到首流片段/到可见正文/渲染刷新频率/总时长）+ `real_results.json`。定位出三个体感差异来源：MiMo 正文以约 10 次/秒大块蹦出（约 150 字/块）而 deepseek 约 300 次/秒逐 token 潮流；MiMo 首 token 抖动大（0.9–12.3s，直连也有极端值）；开思考后正文被推后 3–5 秒（两家均如此，MiMo 思考段也蹦块）。解码速率仍是 MiMo 快（464–493 vs 212–229 tok/s），体感输在渲染平滑度与首字抖动。

### 新增（tmp/model-speed-test/：deepseek-flash 与 MiMo-V2.6-Pro-UltraSpeed 输出速度实测脚本与数据）

- **为什么改**：用户 2026-09-25 问「deepseek-flash 与 mimo-v2.6-pro-ultraspeed 哪个输出速度更快」，需要实测数据而非只凭宣传口径；顺带发现本机代理对两家 API 建连延迟影响不同，需一并验证。
- **改了什么**：新建 `tmp/model-speed-test/` 下 4 个脚本与结果 JSON（`bench_speed.py` 数字计数+usage 统计、`probe_stream.py` 流式到达节奏探测、`probe_prose.py` 中英文散文、`probe_prefill.py` 8k 长上下文 TTFT、`probe_dump.py` 原始流诊断）。实测结论（2026-09-25 晚，直连）：MiMo UltraSpeed 解码速度全面更快——中文散文 213 vs 131 tok/s（字符速率 304 vs 199 字符/s）、英文散文 293 vs 130 tok/s（1366 vs 628 字符/s）、数字内容约 1000 vs 420 tok/s；8k 输入 TTFT 两者相当（0.78 vs 0.60 s）。另发现两个环境坑：① 本机 HTTP 代理（127.0.0.1:1087）路由 Xiaomi 域名走境外，新建连接 TLS 多花约 1 s（直连无此开销）；② Python requests `iter_lines(decode_unicode=True)` 对无 charset 声明的流式中文会乱码/丢 chunk，须改为按字节读取后逐行 UTF-8 解码。原始数据见 `tmp/model-speed-test/*.json`。

### 变更（Agent 方向简历 PDF 重建：中英两份，清除失实表述）

- **为什么改**：同日两轮 md 修正（删 JavaScript / TypeScript、zcode-cli 归属如实化、删废弃 rules 目录表述）后，docs/resume/ 下已构建的 PDF 产物仍是 9 月 5 日旧版——继续用旧 PDF 投递会把失实表述带出去（TODO T5，橙色）。
- **改了什么**（2026-09-14）：md2pdf 工艺重建两份——中文版（default.css）、英文版（resume-en.css），排版定量验证全绿（A4 纵向、左右边距对称 6%/93%、各 2 页）；内容经 pandoc 中间 HTML 核对：失实表述 0 命中、修正后表述（协议对接/二次开发/CLAUDE.md 规则统一管理等）全部在场；已覆盖正式 PDF（md5 均已更新，体积与旧版相当）。T5 移入 TODO-archive.md。注：该工艺 Chrome 打印 PDF 无 pdftotext 文本层（新旧版一致），内容核对用 pandoc 中间 HTML 等价验证。

### 变更（Agent 方向简历二轮修正：zcode-cli 归属如实化 + 删废弃的 rules 目录表述）

- **为什么改**：用户 2026-09-14 澄清 zcode-cli 系他人开源项目的二次开发（上游 3.8.1 基线 + 43 个修补 commit），简历「周边工具链」原句把「app-server 协议逆向」归因于本人、主力仓库列表含 zcode-cli——均有夸大；另全局 `~/.claude/rules/` 目录已废弃删除，CapabilityManagerAgent 行「全局 skills / rules / CLAUDE.md 统一管理」表述指向不存在的功能。GitHub 查证：zcode-vsce 为 0.1.x 起步从零自研（initial commit 起 7 个功能 commit），保留主力仓库（待用户最终确认）。
- **改了什么**（2026-09-14）：`docs/resume/resume-agent.md` 与 `resume-agent-en.md` 各三处——① CapabilityManagerAgent 行改「全局 skills 与 CLAUDE.md 规则统一管理」；② 周边工具链句改「非官方 VSCode 扩展客户端（app-server 协议对接）与终端客户端（开源客户端二次开发、40+ 功能修补）」（删「协议逆向」归因）；③ 主力仓库列表删 zcode-cli、保留 zcode-vsce。PDF 重建待办 T5 不变。

### 新增（.pi/skills/language-partner：找语伴方案库 skill）

- **为什么改**：用户 2026-09-14 调研「练英语口语 + 视频沟通表达」的视频聊天软件，追问「方便找到想学中文的英语母语者」的渠道，并要求不限视频沟通、能线下更好，希望把调研结论沉淀为项目级 skill——下次说「找语伴」时直接给出靠谱方案，不再重新调研。
- **改了什么**：新建 `.pi/skills/language-partner/SKILL.md`（pi 项目级 skill 原生位置，项目受信任即加载）。内容：找语伴的本质（双向供需匹配）与供需现实（学英语的中国人远多于学中文的英语母语者，应主动去英文世界找）；四条路线渠道库——线上配对 App（HelloTalk / Tandem / Speaky 等）、社区发帖（Reddit r/language_exchange / Conversation Exchange / Discord）、线下场景（Meetup 城市语言交换、城市英语角（北京英语角实例）、大学语伴项目、线上转线下）、付费外教（Cambly / italki 保底）；实操技巧、安全注意、英文招募帖与 App 自我介绍两个交付物模板；末尾标注数据快照时间（2026-09）并指引实时核验时用 anysearch / agent-reach。

### 变更（Agent 方向简历（中/英）语言行删 JavaScript / TypeScript）

- **为什么改**：用户 2026-09-14 澄清不会 JavaScript / TypeScript，简历「语言与工程」行（`docs/resume/resume-agent.md` / `resume-agent-en.md`）此前误含该表述，属失实陈述。简历内已声明 AI 协作开发模式（代码实现大量由 AI 完成），zcode-cli 等 TS 仓库与「本人不手写 TS」自洽，仅删技能行即可、无需另加说明。表述源头为旧版算法简历技能表（`original.md` 存档内原有 JavaScript）——存档保留原样不动，但旧版算法简历 PDF（本机 Documents 下）如仍在用同样失实，已提醒用户。
- **改了什么**（2026-09-14）：两份简历第 13 行语言行删「JavaScript / TypeScript」（目录已被 .gitignore 忽略，改动不进 git）。已构建的 PDF 产物仍含旧表述，投前须重建——记 TODO T5。

### 变更（CLAUDE.md 删去「由 Claude Code 自动加载」说明句）

- **为什么改**：用户 2026-09-12 要求 CLAUDE.md 不再强调本文由 Claude Code 加载，团队全部项目的 CLAUDE.md 统一清理此类语句。
- **改了什么**（2026-09-12）：`CLAUDE.md` 开头角色定位行删去句尾「本文件由 Claude Code 在每次会话开头自动加载。」，角色描述本身保留。

### 变更（通用能力句式去 find-skill 提及）

- **为什么改**：全局 find-skill skill 已被用户删除（实际使用中从未用到），各处不再提及；本项目 CLAUDE.md 通用能力句式仍列着 find-skill，2026-09-12 联动清理。
- **改了什么**：`CLAUDE.md` 通用能力句式「（anysearch 实时搜索、find-skill 找 skill 等）」→「（anysearch 实时搜索等）」。子项目 blog、CyberRipple、xhqing 的同款句式已按超集规则同步（不另记其 CHANGELOG）。

### 新增（接管子项目 blog：个人博客仓库）

- **为什么改**：用户 2026-09-12 把 blog 仓库（github.com/xhqing/blog，docsify 静态博客，线上 xhqing.github.io/blog，2023 年起运行）交由 Kit 负责。按超集规则登记子项目、落地 Kit CLAUDE.md 内容、补齐项目标配。过程中发现既有子项目 xhqing / CyberRipple 的超集 `.claude/CLAUDE.md` 副本落后于权威源（仍引用已删除的 `~/.claude/rules/`、缺「子项目清单」节），一并按规则重新生成对齐。
- **改了什么**：① 本项目 `CLAUDE.md`（AGENTS.md 软链同源）子项目清单新增 blog 条目；② blog 本地克隆至 `/Users/xhq/Developer/blog`（原无本地副本），新建 `.claude/CLAUDE.md`（本项目 CLAUDE.md 正文全文 + 指代说明），补齐标配 `VERSION`（1.0.0）/ `CHANGELOG.md`，`.gitignore` 追加团队标准忽略项（`docs/` 为博客站点内容目录、不忽略）——均记 blog 自己的 CHANGELOG；③ xhqing / CyberRipple 超集 `.claude/CLAUDE.md` 重新生成，对齐当前权威源；④ 全局 `~/.claude/CLAUDE.md` 超集关系映射表新增 Kit → blog 行，并同步 CapabilityManagerAgent `claude/CLAUDE.md` 镜像（记 CapabilityManagerAgent CHANGELOG，本条不重复展开）。

### 变更（assets/logo.svg 副标题去中文）

- **为什么改**：全局规则新增「Logo / 图标资产文字一律用英文」（2026-09-12 用户立，起因 Swing 仓库 logo 副标题混入中文被指出）：logo 是面向全球读者的视觉标识，中文受众已有 README_cn.md 双语通道；且 SVG 中文依赖查看环境的字体回退，渲染不可控。本次为按新规批量清理存量。
- **改了什么**：`assets/logo.svg` 副标题「Executive Assistant · 总经理助理」→「Executive Assistant」。

### 变更（Kit 定位口径调整：多面手，找单找岗整体移交 Hopkins）

- **为什么改**：用户 2026-09-08 两步明确口径——① Kit 是用户的第一助理、团队多面手，介绍不再强调找单找岗（该职能不值一提）；② 找单接活找工作整体交给 Hopkins（ApplyOptimizerAgent）专门负责，原「Kit 发起、Hopkins 转化」的分工废止。
- **改了什么**：① `CLAUDE.md`（AGENTS.md 软链同源）四处——引语行、「你是谁」段（双头表述改多面手定位、历史注记更新）、「工作原则」第一条（「找单找岗接活是你的主动阵地」改「多面手是你的定位」+ 移交 Hopkins 表述）、「你的位置」（删「找单找岗发起人」）；② `README.md` / `README_cn.md`——引语与 Persona 行改多面手、「职责」节由「两头干活」改为「综合协调 + 分工衔接」（找单找岗条目删除、改为移交说明）；③ 子项目 xhqing / CyberRipple 超集 `.claude/CLAUDE.md` 再生成同步；④ 全局 `~/.claude/CLAUDE.md` 注册表 Kit 行、Hopkins 行（职责扩为工作接单全链路）、销售流水线段落同步更新，CapabilityManagerAgent 镜像同步（记其 CHANGELOG）；⑤ xhqing README 双语 Hopkins 条目改全链路专门负责（记 xhqing CHANGELOG）。

### 新增（接管子项目 CyberRipple：组织总览仓库）

- **为什么改**：用户 2026-09-08 把 CyberRipple 仓库（当天 Hopkins 会话产出的组织总览 README 中英双语初稿）交由 Kit 负责。按超集规则登记子项目、落地 Kit CLAUDE.md 内容、补齐项目标配。
- **改了什么**：① 本项目 `CLAUDE.md`（AGENTS.md 软链接同源）子项目清单新增 CyberRipple 条目；② 子项目内新建 `.claude/CLAUDE.md`（本项目 CLAUDE.md 正文全文 + 指代说明，方式与既有子项目 xhqing 一致，进 git）；③ 子项目补齐标配 `VERSION`（1.0.0）/ `CHANGELOG.md` / `.gitignore` / `LICENSE.md`（MIT）；④ 全局 `~/.claude/CLAUDE.md` 超集关系映射表新增 Kit → CyberRipple 行，并同步 CapabilityManagerAgent `claude/CLAUDE.md` 镜像（记 CapabilityManagerAgent CHANGELOG，本条不重复展开）。子项目 README 的名册括注删除（用户同轮指令）记 CyberRipple 自己的 CHANGELOG。

### 新增（CI 门禁与 main 分支保护：dev-workflow 工作流落地）

- **为什么改**：全团队统一门禁纪律（dev-workflow skill，2026-09-06）——main 必须永远绿，所有改动走「功能分支 → PR → CI 验证合并结果 → 绿灯合并」，把「改 A 坏 B」拦在合并进 main 之前；本项目此前无 CI、无分支保护，main 可被直推。本次为 `chore/rename-sync` 分支提交做准备时按 skill 第 0 步门禁自检发现三项缺口（无 CI、无保护、auto-merge 未开）并全部补齐。
- **改了什么**：远端 main 新增 `.github/workflows/ci.yml`（纯文档仓库极简模板：checkout + 空验证，job 名 `validate`，push main / pull_request / workflow_dispatch 三触发）；main 分支保护（required check `validate`、strict 模式、enforce_admins、0 approvals、禁 force push 与删除）；仓库 auto-merge 开关打开。过程中两件事：① gh 的 OAuth token 缺 `workflow` scope，GitHub 拦截其创建 `.github/workflows/` 文件（API 一律 404，经对照实验确证），已按用户拍板跑 `gh auth refresh -s workflow` 补齐；② skill 模板自带的 `run: echo "... repository: gate pass"` 是非法 YAML（plain scalar 含冒号空格，PyYAML 实测 ScannerError），首次 workflow 解析失败致 main 短暂红灯，经 PR #1 修复（`run` 值整体加单引号）——这也是本项目第一个走完整「PR → CI 绿 → squash 合并」链路的提交。排查 API 404 期间在远端 main 留下 6 个零净变化的测试 commit（用户拍板保留不清理）。本地分支 `chore/rename-sync` 已对齐最新 main。

### 变更（小组更名同步：任务池投标小组 → 工作接单小组）

- **为什么改**：用户 2026-09-06 拍板小组更名（「任务池投标」降为小组下的接单策略之一、与招聘平台求职并列），Kit 的对口表述须同步。「你是谁」段历史注记里的「任务池投标路线」是 2026-08-23 当时口径的演变记录，保留不改。
- **改了什么**：① `CLAUDE.md`（AGENTS.md 软链接同源）：工作原则第一条、「你的位置」的小组名两处；② `README.md` / `README_cn.md` 职责第一条 squad 名（task-pool bidding squad → work-intake squad）。子项目 xhqing 同步（记 xhqing CHANGELOG）。

### 变更（Hopkins 仓库更名引用同步：BidOptimizerAgent → ApplyOptimizerAgent，找单口径扩「找单找岗」）

- **为什么改**：电鸭平台岗位多为全职岗、有详细 JD、沟通需发简历——与 BOSS直聘求职同构，「投单」与「找工作」合流为同一条投递漏斗（2026-09-06 用户拍板），Hopkins 项目由 BidOptimizerAgent 更名 ApplyOptimizerAgent（Title「投递转化率优化师」、拟人名 Hopkins 保留）。Kit 的对口协作引用与「找单」口径须同步——入口描述从「在远程工作社区投标」扩为「在远程工作社区与招聘平台投递」。
- **改了什么**：① `CLAUDE.md`（AGENTS.md 软链接同源）：副标题「找单接活入口」→「找单找岗接活入口」、「你是谁」段投递渠道描述扩展并补口径演变注记、工作原则第一条改为「投递转化优化归 Hopkins（ApplyOptimizerAgent）」、「你的位置」改「找单找岗发起人」；② `README.md` / `README_cn.md` 职责第一条同步（gig & job hunting / 找单找岗接活）。子项目 xhqing 的同名内容同步改（记 xhqing CHANGELOG）。

### 变更（子项目清单 xhqing 本地路径更正）

- **为什么改**：Kit 会话为新建 TestEngineerAgent 做关联同步时（2026-09-06）实测发现，子项目清单登记的 xhqing 本地路径 `/Users/xhq/Documents/Projects/xhqing` 已不存在，仓库实际在 `/Users/xhq/Developer/xhqing`——登记与现实脱节会导致后续同步找错地方。
- **改了什么**：`CLAUDE.md` 子项目清单 xhqing 条目的本地路径更正为实际路径，并注明更正原因与日期。其余未动。

### 新增（CHANGELOG.local.md：敏感变更的本地记录文件）

- **为什么改**：涉及用户个人隐私的变更不适合写入公开 CHANGELOG——公开仓库任何人可见，且会进 git 历史。为这类变更建立本地专属记录文件，与公开 CHANGELOG 分流。
- **改了什么**：项目根新建 `CHANGELOG.local.md`（已加入 `.gitignore`，不进 git）；2026-08-29 起涉及个人隐私的变更只记该文件，公开 CHANGELOG 不再出现相关内容。

### 变更（清除 CHANGELOG 条目中的个人财务状况描述并重写 git 历史）

- **为什么改**：2026-08-26 安全检查发现，[1.0.0] 条目在记录新建投标 SOP 文档的原因时写入了用户个人财务状况描述（收入目标、本金状况、财务紧迫程度、职业投入状态四层表述），随公开仓库进入 git 历史。按全局规则「敏感信息禁止写入未被 .gitignore 忽略的文件」（2026-08-26 增补财务状况类型），已进入 git 历史的敏感内容须重写历史彻底清除。
- **改了什么**：用 `git filter-repo --replace-text` 重写全部 23 个 commit——把 [1.0.0] 条目开头的个人财务背景句整体替换为「经调研确定」（只保留业务动机，不写财务背景），该条目重复两行顺带去重为一行；重写后 `git push --force --all` 覆盖远程 main（旧 head f1f73d6 → 新 head 48381d3）。验证：本地全历史与远程 main 内容的财务词扫描均 0 命中，仓库无 fork、无 tag，无第三方残留渠道。全局 CLAUDE.md 同步增补「财务状况」敏感类型并同步 CapabilityManagerAgent 镜像（记 CapabilityManagerAgent CHANGELOG，本条不重复展开）。替换规则临时文件 `tmp/replacements.txt`（含敏感原文，置于 .gitignore 忽略的 tmp/）用后已删。本条为工作区记录，待下次 `/commit` 提交。

### 新增（AGENTS.md 软链接指向 CLAUDE.md）

- **为什么改**：CLAUDE.md 是 Claude Code 自动加载的项目指令文件，AGENTS.md 是其它 agent 工具（ZCode 等）识别的通用入口文件名——建软链接让两类工具共用同一份项目指令，不必维护两份内容。
- **改了什么**：项目根新建软链接 `AGENTS.md`（相对路径指向 `CLAUDE.md`，clone 后依然有效）。已验证链接可正常读取内容，git 以符号链接类型跟踪（2026-08-25）。

### 变更（更名 PersonalAssistantAgent → ExecutiveAssistantAgent：目录 / GitHub 仓库 / 双语 README / CLAUDE.md / logo 职称）

- **为什么改**：Kit 的 Title 已于 2026-08-23 由「个人助理」改为「总经理助理」，但项目名（本地目录 / GitHub 仓库 / 文档 / logo 职称）仍是 PersonalAssistantAgent（个人助理），名字与定位不符——用户要求把名字改成符合「总经理助理」的。总经理助理的标准英文职称是 Executive Assistant，按脚手架「目录名 = 职称 Title + Agent」规范定为 ExecutiveAssistantAgent；拟人名 Kit 不变。
- **改了什么**：本地目录与 GitHub 仓库（xhqing/ExecutiveAssistantAgent，旧名 URL 由 GitHub 自动重定向）均更名；仓库 About description 英文职称从 GM's Assistant 改为 Executive Assistant；`README.md` / `README_cn.md`（标题 / Visitors 徽章 URL / 版权署名链接）；`.claude/CLAUDE.md` 标题；`assets/logo.svg` 副标题「Assistant · 个人助理」→「Executive Assistant · 总经理助理」（顺带修正上轮 Title 改名时 logo 职称漏改）。关联同步：全局 `~/.claude/CLAUDE.md` 注册表 Kit 行与「超集关系映射」表仓库名更名（CapabilityManagerAgent `claude/CLAUDE.md` 镜像随全局对齐）；按超集规则更新 `xhqing/.claude/CLAUDE.md` 指代说明；xhqing 侧 README roster 链接 / 徽章、`traffic/badges/PersonalAssistantAgent.json` 更名、`scripts/update_traffic.py` 团队清单同步（细节记 xhqing 自己的 CHANGELOG）。

### 变更（Kit Title「个人助理」→「总经理助理」：CLAUDE.md + README 双语 + 超集同步 xhqing）

- **为什么改**：用户 2026-08-23 裁定团队重组为五个小组（新增财务与法务小组放 Justin；Hopkins 入任务池投标小组），Kit 改 Title 为「总经理助理」且不分组、直属用户——任务池投标小组的找单动作由 Kit 发起，投标转化优化归 Hopkins、合同收款归 Justin，职责由「处理琐碎事」扩展为「找单接活 + 综合协调」。
- **改了什么**：`.claude/CLAUDE.md`（你是谁 / 工作原则 / 你的位置三节重写，Title 与分工写明）；`README.md` / `README_cn.md`（引言与职责段改为两头干活：找单接活 + 综合协调）；按超集规则覆盖 `xhqing/.claude/CLAUDE.md`（子项目内容更新、原有指代说明保留）。

### 新增（docs/bidding/service-contract-template.md：软件开发服务合同模板）

- **为什么改**：电鸭接单路线确定后，交易保障缺落地件——电鸭无平台托管，需自制保障结构：分级签约（<2000 微信确认 / 2000～10000 电子合同 / >10000 盖章 PDF）+ 30/40/30 分期付款 + 「验收期视为通过」「尾款结清后转移源码」两条杀手条款 + 附件一《需求确认书》锁范围。
- **改了什么**：新建 `docs/bidding/service-contract-template.md`（docs/ 已被 .gitignore 忽略，属本地业务数据），含完整合同正文模板（填空处用【】标记）、附件一需求确认书模板、签署前检查清单、使用记录表。签约时复制填空、转 PDF、腾讯电子签（个人版每月 5 份免费、区块链存证）发起签署。（2026-08-23）

### 变更（P4 团队图删「全部开源」两处）

- **为什么改**：用户复核成图后要求删掉「全部开源」——开源与否不在本页信息重点（本页讲 GLM-5.3 在团队里的位置），且副标与右下收口卡两处重复出现。收口卡小字删后留白突兀，补一句「各有分工」回填卡片（呼应副标「各有职责」的表述）。
- **改了什么**：`tmp/xhs-glm53/p4-fleet.svg` 两处——副标「作为 14 个各有名字、各有职责的 AI Agent 的大脑，全部开源 🐝」→「作为 14 个各有名字、各有职责的 AI Agent 的大脑 🐝」；右下收口卡小字「全部开源」→「各有分工」。Chrome headless 重渲染 PNG，裁剪核验两处卡片文字正确。

### 变更（P6 上手图副标改写：Harness 口径对齐 P3）

- **为什么改**：用户复核成图后要求把「Claude Code 界面不变」改为「Claude Code 为主力 Harness 不变」——与 P3 底部提示同口径（对外统一用 Harness 表述、并点明主力地位），P6 原句的「界面」正是 P3 修订时淘汰的旧说法。
- **改了什么**：`tmp/xhs-glm53/p6-start.svg` 副标一句「Claude Code 界面不变，只换「大脑」」→「Claude Code 为主力 Harness 不变，只换「大脑」」。Chrome headless 重渲染 PNG，裁剪核验文字逐字正确、右端余量充足无溢出。

### 变更（P4 团队图副标改写：点明 GLM-5.3 是 Agent 团队的大脑）

- **为什么改**：用户复核成图后要求副标从「14 个各有名字、各有职责的 AI Agent」改为「作为 14 个各有名字、各有职责的 AI Agent 的大脑」——原句只介绍团队规模，改后点明 GLM-5.3 在团队中的角色定位，与本页主题（它在我团队里的位置）更贴。
- **改了什么**：`tmp/xhs-glm53/p4-fleet.svg` 副标一句「14 个各有名字、各有职责的 AI Agent，全部开源 🐝」→「作为 14 个各有名字、各有职责的 AI Agent 的大脑，全部开源 🐝」。Chrome headless 重渲染 PNG，裁剪核验文字逐字正确、右端离画布边缘尚有余量无溢出。

### 变更（P3 架构图三处措辞微调：中英文间距 + 表述改写）

- **为什么改**：用户复核成图后提三处——①「主力Harness」中英文之间补空格（排版规范）；② 右上胶囊「思考档位调节」改「分类器控制」（改述桥在思考控制上的实际机制）；③ 底部「Claude Code Harness 不变」改「Claude Code 为主力 Harness 不变」（点明主力地位）。
- **改了什么**：`tmp/xhs-glm53/p3-bridge.svg` 三处文本——副标「作为主力Harness」→「作为主力 Harness」、右上胶囊「思考档位调节」→「分类器控制」、底部提示「Claude Code Harness 不变」→「Claude Code 为主力 Harness 不变」。Chrome headless 重渲染 PNG；SVG 源逐字核对三处新文本在位，成图无溢出截断。

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
- **新增 `CHANGELOG.md`**：项目标配文件缺失，按纪律补齐；本条目即本次变更记录。`VERSION` 文件暂未创建，版本条目待 VERSION 确定后对齐。
- **`docs/task-pool-bidding-sop.md` 更新**：把「每天扫 EigenFlux feed 一次」加进每日 SOP 表格（上午随刷单顺手做，≤10 分钟），并在第八节新增「EigenFlux 情报扫描」说明——定位为行业情报源 + 潜在线索池，明确判断标准（协作/知识交换类跳过，带预算/交付物才投入）与边界（不进主线 4 小时，避免分散精力）。
- **新增 `docs/bidding/bid-templates.md`（投标标书模板库）**：三类型标书完整版（AI 客服/自动化/小程序）+ 投标话术补充（破冰、报价异议、比稿拒绝、转维护）+ 避坑清单。与 SOP 配套，把对话中沉淀的标书从 200 字概要升级为可直接复用的完整模板。
- **新增 `docs/bidding/generate_bids.py`（批量生成标书脚本）**：从 CSV/JSON 任务列表批量生成三类型标书草稿，把单份标书时间从 30 分钟压到 5 分钟（只填需求信息、模板自动套用）；缺失字段自动填占位符保证不崩；支持 `--demo` 演示、`--out` 指定输出目录。
- **新增 `docs/bidding/tasks.example.csv`（任务列表样例）**：示范 CSV 格式，供真实投标时填写。
