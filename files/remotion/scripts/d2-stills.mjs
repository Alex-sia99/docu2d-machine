// Planche de relecture Docu2D : rend des images fixes (un seul navigateur) aux temps demandés ou réparties sur la vidéo,
// puis les assemble en planches horodatées (ffmpeg).  node scripts/d2-stills.mjs <props.json> <dossier> [--n 40] [--t 12.5,48,…] [--scale 0.5]
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs"; import path from "path"; import { execFileSync } from "child_process";
const [props, outDir] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const P = JSON.parse(fs.readFileSync(props, "utf8"));
const n = Number(arg("--n", 40)), scale = Number(arg("--scale", 0.5));
const times = arg("--t") ? arg("--t").split(",").map(Number) : Array.from({ length: n }, (_, i) => +(((i + 0.5) / n) * P.tl.total).toFixed(2));
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = path.resolve(arg("--bundle", "build-d2"));
const browser = await openBrowser("chrome");
const comp = await selectComposition({ serveUrl, id: "Docu2D", inputProps: P, puppeteerInstance: browser });
const files = [];
for (const t of times) {
  const f = path.join(outDir, `t${String(t.toFixed(1)).padStart(6, "0")}.jpg`);
  await renderStill({ composition: comp, serveUrl, frame: Math.min(comp.durationInFrames - 1, Math.round(t * 30)), output: f, inputProps: P, imageFormat: "jpeg", jpegQuality: 80, scale, puppeteerInstance: browser });
  files.push([f, t]);
}
await browser.close({ silent: true });
// planches 4 × 3 avec l'horodatage
const per = 12;
for (let i = 0; i < files.length; i += per) {
  const grp = files.slice(i, i + per); const args = ["-v", "error", "-y"];
  grp.forEach(([f]) => args.push("-i", f));
  const lab = grp.map(([, t], k) => `[${k}]drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${Math.floor(t / 60)}\\:${String(Math.floor(t % 60)).padStart(2, "0")}':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[v${k}]`);
  while (lab.length < per) { lab.push(`color=black:s=${Math.round(1920 * scale)}x${Math.round(1080 * scale)}[v${lab.length}]`); }
  const fc = lab.join(";") + ";" + Array.from({ length: per }, (_, k) => `[v${k}]`).join("") + `xstack=inputs=${per}:layout=` + Array.from({ length: per }, (_, k) => `${(k % 4) ? Array.from({ length: k % 4 }, () => "w0").join("+") : "0"}_${Math.floor(k / 4) ? Array.from({ length: Math.floor(k / 4) }, () => "h0").join("+") : "0"}`).join("|");
  args.push("-filter_complex", fc + ",scale=1920:-2", "-frames:v", "1", path.join(outDir, `sheet-${String(i / per + 1).padStart(2, "0")}.jpg`));
  execFileSync("ffmpeg", args);
}
console.log(`${files.length} images → ${outDir}`);
