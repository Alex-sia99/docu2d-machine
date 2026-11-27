/**
 * Pixabay — b-roll vidéo + photos libres (licence Pixabay : usage commercial sans attribution), zéro dépendance npm.
 * Clé : coffre (pixabay) ou ../.env (PIXABAY). Limite : 100 requêtes / 60 s → appels espacés (≥ 700 ms).
 * Les objets vidéo sont normalisés au format « Pexels » utilisé par pexels-scout.js : { id, duration, image, video_files }.
 */
const fs = require("fs");
const path = require("path");
const vault = require("./vault");

function key() {
  const k = vault.get("pixabay");
  if (k) return k;
  try {
    const m = /^PIXABAY=(.+)$/m.exec(fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8"));
    if (m) return m[1].trim();
  } catch {}
  throw new Error("Clé Pixabay absente (coffre « pixabay » ou .env PIXABAY)");
}
let last = 0;
async function get(url) {
  const wait = last + 700 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Pixabay ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Vidéos : renvoie des objets au format Pexels (id préfixé « pb »). */
async function searchVideos(q, { perPage = 12 } = {}) {
  const j = await get(`https://pixabay.com/api/videos/?key=${key()}&q=${encodeURIComponent(q)}&per_page=${Math.max(3, perPage)}&safesearch=true`);
  return (j.hits || []).map((h) => {
    const files = ["large", "medium", "small"].map((k) => h.videos[k]).filter((f) => f && f.url && f.width)
      .map((f) => ({ link: f.url, width: f.width, height: f.height, file_type: "video/mp4", fps: 30 }));
    const thumb = h.videos.medium?.thumbnail || h.videos.large?.thumbnail || h.videos.small?.thumbnail;
    return { id: `pb${h.id}`, duration: h.duration, image: thumb, video_files: files, tags: h.tags, src: "pixabay", page: h.pageURL };
  });
}
/** Fichier ≤ 1920 de large, le plus grand possible. */
function pickVideoFile(v) {
  const ok = (v.video_files || []).filter((f) => f.width <= 1920 && f.width >= 1000).sort((a, b) => b.width - a.width);
  return ok[0] || null;
}
/** Photos : { id, image (aperçu 640), full (largeImageURL ≤1280… / fullHD si dispo), tags, w, h }. */
async function searchImages(q, { perPage = 12 } = {}) {
  const j = await get(`https://pixabay.com/api/?key=${key()}&q=${encodeURIComponent(q)}&per_page=${Math.max(3, perPage)}&image_type=photo&safesearch=true`);
  return (j.hits || []).map((h) => ({ id: `pbi${h.id}`, image: h.webformatURL, full: h.largeImageURL, tags: h.tags, w: h.imageWidth, h: h.imageHeight, page: h.pageURL, src: "pixabay" }));
}
async function download(url, file) {
  const r = await fetch(url); if (!r.ok) throw new Error(`téléchargement ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
module.exports = { searchVideos, searchImages, pickVideoFile, download, configured: () => { try { return !!key(); } catch { return false; } } };
