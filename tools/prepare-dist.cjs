const fs = require("fs");
const path = require("path");

const release = process.argv.includes("--release");
const root = path.join(__dirname, "..");
const from = path.join(root, "src");
const to = path.join(root, "dist");

function skip(rel) {
  const parts = rel.split(path.sep);
  if (parts[0] === "assets" && (parts[1] === "pet" || parts[1] === "voices")) return true;
  if (release && parts.length === 1 && parts[0].startsWith("dev-")) return true;
  return false;
}

fs.rmSync(to, { recursive: true, force: true });
let count = 0;
const skipped = [];
(function copy(rel) {
  for (const entry of fs.readdirSync(path.join(from, rel), { withFileTypes: true })) {
    const r = path.join(rel, entry.name);
    if (skip(r)) {
      skipped.push(r);
      continue;
    }
    if (entry.isDirectory()) {
      fs.mkdirSync(path.join(to, r), { recursive: true });
      copy(r);
    } else {
      fs.copyFileSync(path.join(from, r), path.join(to, r));
      count++;
    }
  }
})("");

fs.copyFileSync(path.join(root, "src-tauri", "icons", "128x128@2x.png"), path.join(to, "app-icon.png"));
count++;

console.log(`[prepare-dist] ${release ? "打包" : "开发"}：复制了 ${count} 个文件到 dist/，跳过 ${skipped.join("、") || "（无）"}`);
console.log(`[prepare-dist] 皮肤图不在 dist/ 里：程序直接从项目的 skins/ 读（${path.relative(root, path.join(root, "skins"))}）。`);
console.log(`[prepare-dist] 状态提示 txt 也不在 dist/ 里：程序从程序旁边的 status/ 读（开发版 = ${path.relative(root, path.join(root, "status"))}/）。`);
