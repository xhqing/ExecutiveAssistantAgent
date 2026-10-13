/**
 * 系统提示词导出（项目级扩展，仅本项目加载）。
 *
 * 用途：把当前会话实际生效的「完整系统提示词」原样写到 tmp/system-prompt.md，
 * 方便人工查看——pi 默认提示词 + 本项目 AGENTS.md / CLAUDE.md + skills
 * 等来源现场拼出来的最终样子（默认提示词硬编码在 pi 安装包里，没有独立文件，
 * 平时看不到这份拼装结果）。
 *
 * 时机：agent_start 事件（所有 before_agent_start 链式修改完成后、
 * 每次发起模型调用前）。每次覆盖写，文件里始终是最新一份。
 *
 * 说明：写文件失败静默忽略、不打扰正常对话；输出落在项目根 tmp/ 下，
 * 该目录已被 .gitignore 忽略、不会进 git。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
	pi.on("agent_start", (_event, ctx) => {
		try {
			const prompt = ctx.getSystemPrompt();
			if (!prompt) return;
			const outputDir = join(ctx.cwd, "tmp");
			mkdirSync(outputDir, { recursive: true });
			writeFileSync(join(outputDir, "system-prompt.md"), prompt, "utf8");
		} catch {
			// 导出失败不阻塞会话（如 cwd 只读等），忽略即可
		}
	});
}
