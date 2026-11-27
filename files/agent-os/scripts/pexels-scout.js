/**
 * Repérage b-roll LÉGAL : pour chaque requête, jusqu'à 8 résultats par source → planche de vignettes numérotées (id) à
 * REGARDER avant de choisir. Pas de fair use (décision d'Alex, 27/11) : uniquement des licences qui autorisent l'usage
 * commercial + la modification, crédit enregistré automatiquement.
 *   node scripts/pexels-scout.js <sortie> [--src <sources>] "requête 1" "requête 2" …
 *        sources (séparées par des virgules) : pexels, pixabay, commons, nasa, archive, ytcc
 *        raccourcis : both = pexels,pixabay (défaut) · libre = commons,nasa,archive · all = tout sauf ytcc (quota YouTube)
 *   node scripts/pexels-scout.js <sortie> --images [--src pixabay,openverse,commons,nasa] "requête" …   → photos
 *   node scripts/pexels-scout.js <sortie> --get <id> <nom> [<id> <nom> …]   → télécharge (vidéo ≤ 1080p .mp4, photo .jpg)
 *        un extrait YouTube CC : --get yt<id> <nom> --at <début s> --dur <durée s>
 *   node scripts/pexels-scout.js <sortie> --credits   → bloc « Sources des images » à coller dans la description YouTube
 * Ids : « pb… » Pixabay, « wc… » Wikimedia Commons, « na… » NASA, « ia… » Internet Archive, « yt… » YouTube CC, « ov… » Openverse.
 * Crédits : <sortie>/credits.json (nom → source, auteur, licence, lien). CC BY-SA → marqué « SA ».
 */
const fs = require("fs"); const path = require("path"); const { execFileSync } = require("child_process");
const px = require("../lib/pexels"); const pb = require("../lib/pixabay"); const os = require("../lib/opensources");
const [out0, ...rest0] = process.argv.slice(2); const out = path.resolve(out0);
let SRC = "both", IMAGES = false, AT, DUR; const rest = [];
for (let i = 0; i < rest0.length; i++) {
  if (rest0[i] === "--src") SRC = rest0[++i]; else if (rest0[i] === "--images") IMAGES = true;
  else if (rest0[i] === "--at") AT = Number(rest0[++i]); else if (rest0[i] === "--dur") DUR = Number(rest0[++i]); else rest.push(rest0[i]);
}
const ALIAS = { both: "pexels,pixabay", libre: "commons,nasa,archive", all: "pexels,pixabay,commons,nasa,archive" };
const sources = (ALIAS[SRC] || SRC).split(",").map((s) => s.trim()).filter(Boolean);
fs.mkdirSync(path.join(out, "scout"), { recursive: true });
const dbf = path.join(out, "scout", "db.json");
const credf = path.join(out, "credits.json");
const loadDb = () => (fs.existsSync(dbf) ? JSON.parse(fs.readFileSync(dbf, "utf8")) : {});

async function search(src, q) {
  try {
    if (IMAGES) {
      if (src === "pixabay") return (await pb.searchImages(q, { perPage: 12 })).slice(0, 8);
      if (src === "openverse") return (await os.openverse(q)).slice(0, 8);
      if (src === "commons") return (await os.commons(q, { kind: "image" })).slice(0, 8);
      if (src === "nasa") return (await os.nasa(q, { kind: "image" })).slice(0, 8);
      return [];
    }
    if (src === "pexels") return (await px.searchVideos(q, { perPage: 10 })).filter((v) => px.pickVideoFile(v)).slice(0, 8).map((v) => ({ ...v, src: "pexels", license: "licence Pexels", credit: "Vidéo : Pexels" }));
    if (src === "pixabay") return (await pb.searchVideos(q, { perPage: 12 })).filter((v) => pb.pickVideoFile(v)).slice(0, 8).map((v) => ({ ...v, license: "licence Pixabay", credit: "Vidéo : Pixabay" }));
    if (src === "commons") return (await os.commons(q, { kind: "video" })).slice(0, 8);
    if (src === "nasa") return (await os.nasa(q, { kind: "video" })).slice(0, 8);
    if (src === "archive") return (await os.archive(q)).slice(0, 8);
    if (src === "ytcc") return (await os.ytcc(q)).slice(0, 8);
  } catch (e) { console.log(`  ⚠ ${src} : ${e.message}`); }
  return [];
}

(async () => {
  if (rest[0] === "--credits") {
    const c = fs.existsSync(credf) ? JSON.parse(fs.readFileSync(credf, "utf8")) : {};
    const lines = Object.values(c).filter((x) => !/^(pexels|pixabay)$/.test(x.src)).map((x) => `• ${x.credit}${x.page ? ` — ${x.page}` : ""}`);
    const stock = [...new Set(Object.values(c).filter((x) => /^(pexels|pixabay)$/.test(x.src)).map((x) => (x.src === "pexels" ? "Pexels" : "Pixabay")))];
    console.log("Sources des images :");
    lines.forEach((l) => console.log(l));
    if (stock.length) console.log(`• Plans d'illustration : ${stock.join(", ")} (licences libres)`);
    return;
  }
  if (rest[0] === "--get") {
    const db = loadDb();
    const cred = fs.existsSync(credf) ? JSON.parse(fs.readFileSync(credf, "utf8")) : {};
    for (let i = 1; i < rest.length; i += 2) {
      const v = db[rest[i]]; const name = rest[i + 1]; if (!v) { console.log("inconnu", rest[i]); continue; }
      const isImg = v.kind === "image" || (v.src === "pixabay" && v.full);
      const file = path.join(out, name + (isImg ? ".jpg" : ".mp4"));
      if (!v.src || v.src === "pexels" || (v.src === "pixabay" && !isImg)) { const lib = v.src === "pixabay" ? pb : px; const f = lib.pickVideoFile(v); await lib.download(f.link, file); console.log(`✓ ${name}.mp4 ${f.width}x${f.height} ${v.duration}s`); }
      else if (v.src === "pixabay") { await pb.download(v.full, file); console.log(`✓ ${name}.jpg ${v.w}x${v.h}`); }
      else if (v.src === "ytcc") { os.ytDownload(v.ytId, file, AT !== undefined ? { start: AT, dur: DUR } : {}); console.log(`✓ ${name}.mp4 (YouTube CC)`); }
      else {
        let url = isImg ? v.full : v.video_files?.[0]?.link;
        if (v.src === "nasa") url = await os.nasaResolve(v);
        if (v.src === "archive") url = await os.archiveResolve(v);
        if (!url) { console.log(`✗ ${rest[i]} : aucun fichier téléchargeable`); continue; }
        const raw = isImg ? file : path.join(out, "scout", `${name}.raw${path.extname(new URL(url).pathname) || ".bin"}`);
        await os.fetchTo(url, raw);
        if (!isImg) { os.toMp4(raw, file); fs.unlinkSync(raw); }
        console.log(`✓ ${path.basename(file)} (${v.src})`);
      }
      cred[name] = { src: v.src, id: v.id, title: v.title || "", author: v.author || "", license: v.license || "", licenseUrl: v.licenseUrl || "", page: v.page || "", sa: !!v.sa, credit: v.credit || "" };
      console.log(`  crédit : ${cred[name].credit}${cred[name].sa ? "  [SA : partage à l'identique]" : ""}`);
    }
    fs.writeFileSync(credf, JSON.stringify(cred, null, 2));
    return;
  }
  const db = loadDb();
  for (const q of rest) {
    const vids = [];
    for (const s of sources.length ? sources : ["pexels", "pixabay"]) vids.push(...(await search(IMAGES && s === "pexels" ? "pixabay" : s, q)));
    const slug = (IMAGES ? "img-" : "") + q.replace(/\W+/g, "_").slice(0, 40);
    const imgs = [];
    for (const v of vids) {
      if (!v.image) continue;
      db[v.id] = v;
      const img = path.join(out, "scout", `${String(v.id).replace(/[^\w.-]/g, "_")}.jpg`);
      try {
        if (!fs.existsSync(img)) { const r = await fetch(v.image, { headers: { "User-Agent": "AgenticOS-broll/1.0" } }); if (!r.ok) continue; fs.writeFileSync(img, Buffer.from(await r.arrayBuffer())); }
      } catch { continue; }
      const lic = v.src === "pexels" || v.src === "pixabay" ? "" : ` ${String(v.license || "").replace(/'/g, "")}`;
      imgs.push({ img, label: `${v.id}${v.duration ? ` ${v.duration}s` : ""}${lic}`.replace(/[:']/g, " ").slice(0, 46) });
    }
    if (!imgs.length) { console.log(`∅ ${q}`); continue; }
    const args = ["-v", "error", "-y"]; imgs.forEach((x) => args.push("-i", x.img));
    const font = "arialbd.ttf"; if (!fs.existsSync(path.join(out, "scout", font))) fs.copyFileSync("C:/Windows/Fonts/arialbd.ttf", path.join(out, "scout", font));
    const f = imgs.map((x, i) => `[${i}]scale=400:225:force_original_aspect_ratio=increase,crop=400:225,drawtext=fontfile='${font}':text='${x.label}':fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6:x=6:y=6[v${i}]`).join(";");
    const n = imgs.length, cols = 4;
    const layout = imgs.map((_, i) => `${(i % cols) * 400}_${Math.floor(i / cols) * 225}`).join("|");
    args.push("-filter_complex", `${f};${imgs.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${n}:layout=${layout}:fill=black`, "-frames:v", "1", path.join(out, "scout", `sheet-${slug}.jpg`));
    if (n === 1) fs.copyFileSync(imgs[0].img, path.join(out, "scout", `sheet-${slug}.jpg`)); else execFileSync("ffmpeg", args, { cwd: path.join(out, "scout") });
    console.log(`▦ sheet-${slug}.jpg (${n} : ${[...new Set(vids.map((v) => v.src))].join(", ")})`);
  }
  fs.writeFileSync(dbf, JSON.stringify(db));
})().catch((e) => { console.error(e); process.exit(1); });
