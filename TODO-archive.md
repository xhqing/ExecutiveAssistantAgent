# TODO 归档

已处理条目归档（从 TODO.md 移入）。

> 个人隐私类已处理条目归档到 `TODO-archive.local.md`（不进 git），不入本文件。

## 🟠 橙色紧急度

- ✅**已完成** **T1** dev-workflow 的「测试用例目录只读」尚未配套工具强制：目前只有 skill 文本规矩（`~/.zcode/skills/dev-workflow/`，2026-09-07 重写为本地门禁版），违反「规矩必须配套工具强制」元规则。需为 ZCode 配 hook，拦截对项目 `test-cases/` 目录的增删改（Write / Edit / rm / mv / sed -i 类命令），豁免测试运行自产缓存（`__pycache__`、`.pytest_cache` 等）（记录：2026-09-07 21:32）（完成：2026-09-07 21:57。落地：guard 脚本挂载 PreToolUse 拦截 test-cases/ 写操作；写操作一律 deny，读与跑测试放行，测试方同步 / 缓存清理走授权标记 `# TEST_CASES_WRITE_OK`；43 个边界样例全绿，测试驱动存 `tmp/test-guard.sh`。同日 22:18 按用户要求扩展四端：脚本迁至 `~/.claude/hooks/test-cases-guard.py` 单一共享，CC（`~/.claude/settings.json`）、ZCode（`~/.zcode/cli/config.json`）、CodeBuddy（`~/.codebuddy/settings.json`，matcher `Bash|Write|Edit`）、Trae CN（`~/.trae-cn/hooks.json`，matcher `RunCommand|Write|Edit`——Trae 工具名无 Bash）四端挂载）
