/**
 * Docu2D — préparation d'un run pour Remotion : plans réels recoupés en 720p muets (médias éco), crédits à l'écran,
 * props.json { sb, tl, assets, root } dans remotion/public-d2/<run>/ (le --public-dir du bundle Docu2D).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REMOTION = path.join(__dirname, "..", "..", "..", "remotion");
const PUB = path.join(REMOTION, "public-d2");

function creditLine(c, lang = "fr") {
  if (!c) return "";
  const L = lang === "fr" ? { v: "Vidéo", p: "Photo", via: "via" } : { v: "Video", p: "Photo", via: "via" };
  const who = c.author ? `${c.author}, ` : "";
  if (c.src === "pexels") return `${L.v} : ${who}Pexels`;
  if (c.src === "pixabay") return `${L.v} : ${who}Pixabay`;
  if (c.src === "commons") return `${L.v} : ${who}${c.license} ${L.via} Wikimedia Commons`;
  return `${L.v} : ${who}${c.license || c.src}`;
}

/** Recoupe chaque plan utilisé (start, durée max utile) → <pub>/<run>/assets/<nom>.mp4 (1280 px, sans son). */
function stage(runDir, runId, { lang = "fr", maxDur = 16 } = {}) {
  const sb = JSON.parse(fs.readFileSync(path.join(runDir, "storyboard.json"), "utf8"));
  const tl = JSON.parse(fs.readFileSync(path.join(runDir, "timeline.json"), "utf8"));
  const credits = fs.existsSync(path.join(runDir, "broll", "credits.json")) ? JSON.parse(fs.readFileSync(path.join(runDir, "broll", "credits.json"), "utf8")) : {};
  const out = path.join(PUB, runId); fs.mkdirSync(path.join(out, "assets"), { recursive: true });
  const assets = {};
  for (const b of sb.beats.filter((b) => b.type === "broll" || b.type === "photo")) {
    const name = b.asset; if (assets[name]) continue;
    const src = ["mp4", "jpg", "png"].map((e) => path.join(runDir, "broll", `${name}.${e}`)).find((f) => fs.existsSync(f));
    if (!src) throw new Error(`plan introuvable : ${name}`);
    const isVid = src.endsWith(".mp4");
    const dst = path.join(out, "assets", isVid ? `${name}.mp4` : `${name}.jpg`);
    if (!fs.existsSync(dst)) {
      if (isVid) execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(b.srcStart || 0), "-i", src, "-t", String(maxDur), "-an", "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-crf", "22", "-preset", "veryfast", "-pix_fmt", "yuv420p", dst]);
      else execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale='min(1600,iw)':-2", dst]);
    }
    assets[name] = { file: `assets/${path.basename(dst)}`, kind: isVid ? "video" : "image", credit: creditLine(credits[name], lang) };
  }
  const props = { sb, tl, assets, root: runId, tail: 2 };
  fs.writeFileSync(path.join(out, "props.json"), JSON.stringify(props));
  fs.writeFileSync(path.join(runDir, "props.json"), JSON.stringify(props));
  return { props, dir: out };
}
module.exports = { stage, creditLine, PUB, REMOTION };
