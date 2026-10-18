/**
 * 输入 LLM 全量内容导出（项目级扩展，仅本项目加载）。
 *
 * 用途：把每次请求实际发给模型的完整输入原样落盘，方便人工核对模型到底收到了什么。
 * 内容取自 provider 组装完成的最终 payload——序列化后的系统提示词、完整对话历史、
 * 工具 schema、生成参数等都在里面，是最接近「输入 LLM 全量内容」原件的一份。
 *
 * 落盘位置：项目根 tmp/input-llm-dump/ 下（tmp/ 已被 .gitignore 忽略，不会进 git；
 * 注意 dump 含完整对话内容，可能带敏感信息，不要往外拷）。
 *   - <本地时间戳>.json  每次请求一份，形如 2026-10-14T11-52-03-117.json，文件名可直接排序
 *     （找最新一份：`ls -t tmp/input-llm-dump/*.json | head -1`）
 *
 * 说明：
 * - 时机为 before_provider_request（provider payload 组装完成、请求发出前），
 *   一次 HTTP 请求一份；重试、压缩摘要等附带调用也会各算一次。
 * - 写盘在后台排队、不阻塞请求；写失败静默忽略、不打扰正常对话。
 * - 不写固定路径的「latest」副本：它每次请求都被重写，会被文件变更跟踪（diff-view）
 *   反复判定为外部改动、刷屏变更通知并连锁触发新一轮请求（2026-10-14 实测踩坑，已去掉）。
 * - 默认只保留最近 5 份（2026-10-14 用户定）；设环境变量 INPUT_LLM_DUMP_KEEP=<份数>
 *   可改，<=0 或非数字表示不限量。
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR_NAME = "input-llm-dump";
const KEEP_ENV = "INPUT_LLM_DUMP_KEEP";

/** 本地时间戳（形如 2026-10-14T11-52-03-117），看一眼就知道请求发生在什么时候。 */
function localTimestamp(): string {
	const d = new Date();
	const pad = (n: number, width = 2) => String(n).padStart(width, "0");
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`
	);
}

/** 份数上限：默认保留最近 5 份（2026-10-14 用户定）；INPUT_LLM_DUMP_KEEP 可覆盖，<=0 / 非数字 = 不限。 */
async function prune(outputDir: string): Promise<void> {
	const keep = Number.parseInt(process.env[KEEP_ENV] ?? "5", 10);
	if (!Number.isFinite(keep) || keep <= 0) return;

	const entries = await readdir(outputDir);
	const dumps = entries.filter((name) => /^\d{4}-\d{2}-\d{2}T.*\.json$/.test(name)).sort();
	for (const name of dumps.slice(0, Math.max(0, dumps.length - keep))) {
		await unlink(join(outputDir, name)).catch(() => {});
	}
}

export default function (pi: ExtensionAPI) {
	// 写盘排队：多个请求挨在一起时，保证按先后顺序落盘（时间戳文件名严格递增）。
	let queue: Promise<void> = Promise.resolve();

	pi.on("before_provider_request", (event, ctx) => {
		const outputDir = join(ctx.cwd, "tmp", DIR_NAME);

		const task = async () => {
			try {
				await mkdir(outputDir, { recursive: true });

				// 文件名带毫秒；同一毫秒内出现两次请求时自动加序号，不覆盖。
				const base = localTimestamp();
				let filePath = join(outputDir, `${base}.json`);
				for (let i = 1; existsSync(filePath); i++) {
					filePath = join(outputDir, `${base}-${i}.json`);
				}

				// payload 原样序列化；万一遇到 JSON 表达不了的值（如 BigInt），退化为错误记录而不是丢档。
				let text: string;
				try {
					text = JSON.stringify(event.payload, null, 2) ?? String(event.payload);
				} catch (error) {
					text = JSON.stringify({ dumpError: String(error) }, null, 2);
				}

				await writeFile(filePath, text, "utf8");
				await prune(outputDir);
			} catch {
				// 导出失败不阻塞会话（如 cwd 只读、磁盘满等），忽略即可
			}
		};

		queue = queue.then(task);
	});
}
