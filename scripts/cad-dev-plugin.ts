import type { Plugin } from "vite";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";

export function cadDevPlugin(): Plugin {
  let busy = false;
  return {
    name: "local-cad-converter",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = req.url?.split("?")[0];
        if (route !== "/__cad/reference" && route !== "/__cad/convert")
          return next();
        res.setHeader("Cache-Control", "no-store");
        const origin = req.headers.origin;
        if (origin && origin !== `http://${req.headers.host}`) {
          res.writeHead(403).end();
          return;
        }
        let temporary: string | undefined;
        let acquired = false;
        try {
          let directory = path.join(server.config.root, "local-reference/cad");
          if (route === "/__cad/convert") {
            if (
              req.method !== "POST" ||
              req.headers["content-type"] !== "application/octet-stream"
            ) {
              res.writeHead(405).end();
              return;
            }
            if (busy) {
              res.writeHead(409).end("已有图纸正在转换，请稍后重试。");
              return;
            }
            busy = true;
            acquired = true;
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 32 * 1024 * 1024) throw new Error("图纸超过 32 MB。");
              chunks.push(chunk);
            }
            temporary = await mkdtemp(path.join(tmpdir(), "fixtures-cad-"));
            directory = temporary;
            const input = path.join(temporary, "drawing.dwg");
            await writeFile(input, Buffer.concat(chunks));
            await promisify(execFile)(
              process.execPath,
              [
                path.join(server.config.root, "scripts/convert-dwg.mjs"),
                input,
                temporary,
              ],
              {
                cwd: server.config.root,
                timeout: 90000,
                maxBuffer: 1024 * 1024,
              },
            );
          } else if (req.method !== "GET") {
            res.writeHead(405).end();
            return;
          }
          const [dxf, report] = await Promise.all([
            readFile(path.join(directory, "current.dxf")),
            readFile(path.join(directory, "current.json"), "utf8"),
          ]);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              dxf: dxf.toString("base64"),
              report: JSON.parse(report),
            }),
          );
        } catch (error) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(
            error instanceof Error && "code" in error && error.code === "ENOENT"
              ? "尚未生成本地图纸，请先选择 DWG，或运行 npm run cad:convert。"
              : "本地 DWG 转换失败，请检查文件，或用 CAD 工具导出 ASCII DXF。",
          );
        } finally {
          if (acquired) busy = false;
          if (temporary) await rm(temporary, { recursive: true, force: true });
        }
      });
    },
  };
}
