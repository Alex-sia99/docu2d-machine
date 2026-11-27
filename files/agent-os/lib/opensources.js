/**
 * Sources b-roll LÉGALES au-delà de Pexels / Pixabay (décision d'Alex du 27/11 : pas de fair use, « rajoute ce que tu peux
 * rajouter comme source »). Zéro dépendance npm. Chaque résultat porte sa LICENCE et son CRÉDIT prêts à coller.
 *
 *   commons   Wikimedia Commons (vidéos + photos) — CC0 / domaine public / CC BY / CC BY-SA ; crédit obligatoire (sauf CC0/PD)
 *   nasa      NASA Image and Video Library — en général domaine public (vérifier la mention « tiers » de la fiche)
 *   archive   Internet Archive — uniquement les films marqués domaine public / CC BY / CC BY-SA
 *   ytcc      YouTube, filtre Creative Commons (= CC BY 3.0, crédit de la chaîne obligatoire) — quota Data API 100 u / recherche
 *   openverse Openverse (photos CC de Flickr, musées, etc.), licences commerciales + modifiables uniquement
 *
 * Sources « domaine public américain » utiles à chercher DANS ces moteurs : NOAA, NPS, USFWS, USGS, NASA (œuvres du
 * gouvernement fédéral). CC BY-SA : utilisable, mais signaler « SA » (partage à l'identique) dans le crédit.
 * Jamais : NC (non commercial), ND (pas de modification), « fair use », chaînes TV / National Geographic / BBC sans licence.
 *
 * Format normalisé (celui de pexels-scout.js) : { id, src, kind, duration, image, video_files:[{link,width,height}], full,
 *   title, author, license, licenseUrl, page, credit, sa }
 */
const path = require("path");

const UA = { "User-Agent": "AgenticOS-broll/1.0 (b-roll scout; open licenses only)" };
let last = 0;
async function getJson(url, headers = {}) {
  const wait = last + 400 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
const strip = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const okLicense = (lic) => {
  const l = String(lic || "").toLowerCase();
  if (!l || /\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use/.test(l)) return false;
  return /cc0|public domain|pdm|domaine public|cc[ -]by|attribution|pd-/.test(l);
};
const creditOf = (title, author, license, src) => `${title ? `« ${title.slice(0, 60)} » ` : ""}${author ? `— ${author} ` : ""}(${license}, ${src})`.replace(/\s+/g, " ").trim();

// ------------------------------------------------------------------------------------------ Wikimedia Commons
async function commons(q, { kind = "video", perPage = 12 } = {}) {
  const ft = kind === "video" ? "filetype:video" : "filetype:bitmap";
  const p = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrsearch: `${q} ${ft}`, gsrlimit: String(perPage),
    prop: "videoinfo", viprop: "url|size|mime|extmetadata|derivatives", viurlwidth: "480", origin: "*" });
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?${p}`);
  const pages = Object.values(j.query?.pages || {});
  const out = [];
  for (const pg of pages) {
    const vi = (pg.videoinfo || [])[0]; if (!vi) continue;
    const m = vi.extmetadata || {};
    const license = strip(m.LicenseShortName?.value) || strip(m.UsageTerms?.value);
    if (!okLicense(license)) continue;
    const author = strip(m.Artist?.value).slice(0, 80);
    const title = strip(m.ObjectName?.value) || pg.title.replace(/^File:/, "");
    const base = { id: `wc${pg.pageid}`, src: "commons", kind, title, author, license, licenseUrl: m.LicenseUrl?.value || "", page: vi.descriptionurl, sa: /sa/i.test(license),
      credit: creditOf(title, author, license, "Wikimedia Commons") };
    if (kind === "video") {
      // dérivés transcodés (webm / mp4) : on prend le plus grand ≤ 1280 de large, sinon l'original
      const der = (vi.derivatives || []).filter((d) => d.width && d.width <= 1280).sort((a, b) => b.width - a.width);
      const files = der.map((d) => ({ link: d.src, width: d.width, height: d.height, file_type: d.type }));
      if (!files.length) files.push({ link: vi.url, width: vi.width, height: vi.height, file_type: vi.mime });
      out.push({ ...base, duration: Math.round(Number(vi.duration || m.Duration?.value || 0)), image: vi.thumburl, video_files: files });
    } else out.push({ ...base, image: vi.thumburl, full: vi.url, w: vi.width, h: vi.height });
  }
  return out;
}

// ------------------------------------------------------------------------------------------ NASA
async function nasa(q, { kind = "video", perPage = 12 } = {}) {
  const j = await getJson(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=${kind === "video" ? "video" : "image"}&page_size=${perPage}`);
  const out = [];
  for (const it of (j.collection?.items || []).slice(0, perPage)) {
    const d = (it.data || [])[0]; if (!d) continue;
    const thumb = (it.links || []).find((l) => /jpg|png/i.test(l.href))?.href;
    const author = d.secondary_creator || d.photographer || d.center || "NASA";
    out.push({ id: `na${d.nasa_id}`, src: "nasa", kind, nasaId: d.nasa_id, title: d.title, author, license: "domaine public (NASA)", licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
      page: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`, duration: 0, image: thumb, video_files: [], credit: creditOf(d.title, author, "NASA, domaine public", "images.nasa.gov") });
  }
  return out;
}
/** Fichiers réels d'un élément NASA (manifeste) → video_files / full. */
async function nasaResolve(v) {
  const j = await getJson(`https://images-api.nasa.gov/asset/${encodeURIComponent(v.nasaId)}`);
  const hrefs = (j.collection?.items || []).map((i) => i.href);
  if (v.kind === "video") {
    const pick = ["~medium.mp4", "~large.mp4", "~orig.mp4", "~small.mp4"].map((s) => hrefs.find((h) => h.endsWith(s))).find(Boolean);
    return pick ? pick.replace(/^http:/, "https:") : null;
  }
  return (hrefs.find((h) => /~large\.jpg$/i.test(h)) || hrefs.find((h) => /~orig\.jpg$/i.test(h)) || "").replace(/^http:/, "https:") || null;
}

// ------------------------------------------------------------------------------------------ Internet Archive
async function archive(q, { perPage = 12 } = {}) {
  // le moteur refuse les « / » dans un joker → filtre large côté serveur, tri fin ici (NC / ND exclus)
  const lic = "(licenseurl:*publicdomain* OR licenseurl:*by*)";
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`(${q}) AND mediatype:(movies) AND ${lic}`)}&fl[]=identifier&fl[]=title&fl[]=licenseurl&fl[]=creator&rows=${perPage * 4}&output=json`;
  const j = await getJson(url);
  const good = (u) => /publicdomain/.test(u) || /\/licenses\/by(-sa)?\//.test(u);
  return (j.response?.docs || []).filter((d) => good(String(d.licenseurl || ""))).slice(0, perPage).map((d) => {
    const license = /publicdomain/.test(d.licenseurl) ? "domaine public" : /by-sa/.test(d.licenseurl) ? "CC BY-SA" : "CC BY";
    const author = Array.isArray(d.creator) ? d.creator[0] : d.creator || "";
    return { id: `ia${d.identifier}`, src: "archive", kind: "video", iaId: d.identifier, title: d.title, author, license, licenseUrl: d.licenseurl, sa: license === "CC BY-SA",
      page: `https://archive.org/details/${d.identifier}`, duration: 0, image: `https://archive.org/services/img/${d.identifier}`, video_files: [], credit: creditOf(d.title, author, license, "Internet Archive") };
  });
}
async function archiveResolve(v) {
  const j = await getJson(`https://archive.org/metadata/${encodeURIComponent(v.iaId)}`);
  const f = (j.files || []).filter((x) => /\.mp4$/i.test(x.name)).sort((a, b) => Number(b.size || 0) - Number(a.size || 0))
    .find((x) => Number(x.size || 0) < 400e6) || (j.files || []).find((x) => /\.(mp4|ogv|webm|mpeg|avi)$/i.test(x.name));
  return f ? `https://archive.org/download/${encodeURIComponent(v.iaId)}/${encodeURIComponent(f.name)}` : null;
}

// ------------------------------------------------------------------------------------------ YouTube Creative Commons
async function ytcc(q, { perPage = 12 } = {}) {
  const yt = require("./youtube");
  const j = await yt.dataApi("search", { part: "snippet", q, type: "video", videoLicense: "creativeCommon", maxResults: String(Math.min(25, perPage)), safeSearch: "strict" }, 100, "broll", "recherche CC");
  return (j.items || []).map((it) => ({ id: `yt${it.id.videoId}`, src: "ytcc", kind: "video", ytId: it.id.videoId, title: strip(it.snippet.title), author: it.snippet.channelTitle,
    license: "CC BY 3.0 (YouTube)", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", page: `https://www.youtube.com/watch?v=${it.id.videoId}`, duration: 0,
    image: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url, video_files: [], credit: creditOf(strip(it.snippet.title), it.snippet.channelTitle, "CC BY 3.0", "YouTube") }));
}

// ------------------------------------------------------------------------------------------ Openverse (photos)
async function openverse(q, { perPage = 12 } = {}) {
  const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&page_size=${perPage}`);
  return (j.results || []).map((r) => {
    const license = `${r.license === "cc0" || r.license === "pdm" ? r.license.toUpperCase() : `CC ${r.license.toUpperCase()}`} ${r.license_version || ""}`.trim();
    return { id: `ov${r.id.slice(0, 12)}`, src: "openverse", kind: "image", title: r.title, author: r.creator, license, licenseUrl: r.license_url, sa: /sa/.test(r.license),
      page: r.foreign_landing_url, image: r.thumbnail, full: r.url, w: r.width, h: r.height, credit: creditOf(r.title, r.creator, license, r.source || "Openverse") };
  });
}

/** Téléchargement générique (+ conversion mp4 H.264 ≤ 720p si ce n'est pas déjà un mp4). */
async function fetchTo(url, file) {
  const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`téléchargement ${r.status}`);
  require("fs").writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
function toMp4(src, dst) {
  require("child_process").execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-an", "-movflags", "+faststart", dst]);
}
/** YouTube CC : yt-dlp (client android obligatoire, cf. mémoire 403) — 720p max, sans son. */
function ytDownload(ytId, file, { start, dur } = {}) {
  const args = ["--extractor-args", "youtube:player_client=android", "-f", "bv*[height<=720][ext=mp4]/b[height<=720]", "-o", file, "--force-overwrites", "--no-playlist"];
  if (start !== undefined) args.push("--download-sections", `*${start}-${start + (dur || 20)}`);
  args.push(`https://www.youtube.com/watch?v=${ytId}`);
  require("child_process").execFileSync("yt-dlp", args, { stdio: "inherit" });
}

module.exports = { commons, nasa, nasaResolve, archive, archiveResolve, ytcc, ytDownload, openverse, fetchTo, toMp4, okLicense, SOURCES: ["commons", "nasa", "archive", "ytcc", "openverse"], path };
