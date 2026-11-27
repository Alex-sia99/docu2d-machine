/**
 * Musique instrumentale Suno V5_5 via Kie (1 requête = 2 titres, ~0,06 $), générique.
 *   node scripts/suno-gen.js --out <dossier> --name <base> --title "<titre>" --style "<style>" [--machine "<libellé dépenses>"]
 * Écrit <dossier>/<base>-1.mp3 et -2.mp3 + <base>.json (titres, durées).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const vault = require("../lib/vault");
const spend = require("../lib/spend");
const argv = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = argv("--out"), NAME = argv("--name", "music"), TITLE = argv("--title", "Untitled"), STYLE = argv("--style"), MACHINE = argv("--machine", "Musique");
if (!OUT || !STYLE) { console.error("usage: suno-gen.js --out <dir> --name <base> --title <t> --style <s>"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const key = vault.get("kie");
(async () => {
  const body = { model: "V5_5", customMode: true, instrumental: true, style: `${STYLE}. Purely instrumental, absolutely NO vocals, NO lyrics, NO singing, NO voice.`, title: TITLE, prompt: "", styleWeight: 0.65, weirdnessConstraint: 0.65, audioWeight: 0.65, callBackUrl: "https://your-domain.com/api/callback" };
  const r = await fetch("https://api.kie.ai/api/v1/generate", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
  const taskId = r.data && r.data.taskId;
  if (!taskId) throw new Error(`Suno : ${r.msg || JSON.stringify(r).slice(0, 200)}`);
  console.log(`taskId ${taskId}`);
  spend.record("Kie Suno", MACHINE, 0.06, "usd", `Musique ${NAME}`);
  const t0 = Date.now(); let tracks = [];
  while (true) {
    await new Promise((res) => setTimeout(res, 20000));
    if (Date.now() - t0 > 15 * 60 * 1000) throw new Error("Suno : délai dépassé");
    const d = await fetch(`https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`, { headers: { Authorization: `Bearer ${key}` } }).then((x) => x.json());
    const st = d.data && d.data.status;
    if (/FAILED|SENSITIVE|ERROR/i.test(String(st || ""))) throw new Error(`Suno : ${st}`);
    tracks = ((d.data && d.data.response && d.data.response.sunoData) || []).filter((t) => t.audioUrl);
    if (st === "SUCCESS" && tracks.length) break;
  }
  const out = [];
  for (let i = 0; i < tracks.length; i++) {
    const file = path.join(OUT, `${NAME}-${i + 1}.mp3`);
    fs.writeFileSync(file, Buffer.from(await (await fetch(tracks[i].audioUrl)).arrayBuffer()));
    const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
    out.push({ file: path.basename(file), title: tracks[i].title, dur: +dur.toFixed(1), tags: tracks[i].tags });
    console.log(`${path.basename(file)} : ${dur.toFixed(1)} s`);
  }
  fs.writeFileSync(path.join(OUT, `${NAME}.json`), JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
