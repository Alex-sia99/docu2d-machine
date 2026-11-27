/**
 * Docu2D — voix off : TTS ElevenLabs réplique par réplique AVEC alignement caractère par caractère, cache par réplique
 * (seules les répliques modifiées sont refaites), puis RESSERRAGE (silences internes ≤ max, fin de phrase propre,
 * micro-fondus aux raccords) → timeline.json { total, lines:[{id,start,dur,file,words:[{w,t,e}]}] }.
 *
 * Leçons intégrées : coupures nettes (2026-11-27) → coupe au début de la vraie pause finale (≥ 0,13 s, jamais une
 * occlusion de consonne), fondus 10/12/60 ms ; voix muette livrée (2026-11-26) → contrôle de volume par réplique.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");
const el = require("../../scripts/elevenlabs");

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
function silences(f, thr = "-42dB", d = 0.12) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", `silencedetect=n=${thr}:d=${d}`, "-f", "null", "-"], { encoding: "utf8" });
  const s = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), e = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return s.map((a, i) => [a, e[i] ?? Infinity]);
}
function meanDb(f) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  return Number((/mean_volume: (-?[\d.]+)/.exec(r.stderr) || [])[1]);
}
function wordTimes(al, map) {
  const ch = al.characters, st = al.character_start_times_seconds, en = al.character_end_times_seconds;
  const words = []; let cur = null;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) { if (cur) { words.push(cur); cur = null; } continue; }
    if (!cur) cur = { w: "", t: map(st[i]), e: map(en[i]) };
    cur.w += ch[i]; cur.e = map(en[i]);
  }
  if (cur) words.push(cur);
  return words.map((w) => ({ w: w.w, t: +w.t.toFixed(3), e: +w.e.toFixed(3) }));
}

/** Génère (ou reprend du cache) toutes les répliques. onLine(i, n) pour la progression. Retourne le nb de caractères facturés. */
async function synth(dir, script, { onLine, cancelled } = {}) {
  const vo = path.join(dir, "vo"); fs.mkdirSync(vo, { recursive: true });
  const metaF = path.join(vo, "index.json"); const meta = fs.existsSync(metaF) ? JSON.parse(fs.readFileSync(metaF, "utf8")) : {};
  const v = script.voice || {}; let chars = 0;
  for (let i = 0; i < script.lines.length; i++) {
    if (cancelled && cancelled()) throw new Error("Annulé");
    const L = script.lines[i];
    const hash = crypto.createHash("md5").update([L.text, v.id, v.model, v.stability, v.similarity, script.lang].join("|")).digest("hex").slice(0, 10);
    const f = path.join(vo, L.id + ".mp3"), af = path.join(vo, L.id + ".align.json");
    if (meta[L.id] !== hash || !fs.existsSync(f) || !fs.existsSync(af)) {
      const prev = script.lines[i - 1], next = script.lines[i + 1];
      const r = await el.ttsTimed({ text: L.text, voice: v.id || "JBFqnCBsd6RMkjVDRZzb", model: v.model || "eleven_v4", language: script.lang || "fr", stability: v.stability ?? 0.45, similarity: v.similarity ?? 0.85, previousText: prev && prev.text, nextText: next && next.text });
      fs.writeFileSync(f, r.buffer); fs.writeFileSync(af, JSON.stringify(r.alignment));
      meta[L.id] = hash; chars += r.characters; fs.writeFileSync(metaF, JSON.stringify(meta, null, 1));
    }
    if (onLine) onLine(i + 1, script.lines.length);
  }
  return chars;
}

/** Resserre + écrit timeline.json. opts : { max, tempo, pause (× pause de la réplique), outro (s) }. */
function tighten(dir, script, { max = 0.32, tempo = 1.0, pause = 1.35, outro = 9 } = {}) {
  const SRC = path.join(dir, "vo"), OUT = path.join(dir, "vo-tight"); fs.mkdirSync(OUT, { recursive: true });
  let t = 0; const lines = [];
  for (const line of script.lines) {
    const f = path.join(SRC, line.id + ".mp3");
    const al = JSON.parse(fs.readFileSync(path.join(SRC, line.id + ".align.json"), "utf8"));
    const D = dur(f), n = al.characters.length;
    let speechEnd = Math.min(D, al.character_end_times_seconds[n - 1] + 0.12);
    const tail0 = silences(f, "-45dB", 0.06).filter(([a]) => a > D - 0.75 && a > 0.3);
    const tail = tail0.filter(([a, b]) => Math.min(b, D) - a >= 0.13 || b >= D - 0.01);
    for (const [a] of tail) {
      let sound = 0, p0 = a; for (const [x, y] of tail0.filter(([x]) => x >= a)) { sound += Math.max(0, x - p0); p0 = Math.min(D, y); } sound += Math.max(0, D - p0);
      if (sound < 0.3) { speechEnd = Math.min(speechEnd, a + 0.07); break; }
    }
    const cuts = silences(f).filter(([a, b]) => a > 0.05 && b < speechEnd - 0.05 && b - a > max).map(([a, b]) => { const m = (a + b) / 2; return [m - max / 2, m + max / 2]; });
    const keep = []; let p = 0; for (const [ka, kb] of cuts) { keep.push([p, ka]); p = kb; } keep.push([p, speechEnd]);
    const map0 = (x) => { let acc = 0; for (const [a, b] of keep) { if (x <= b) return acc + Math.max(0, x - a); acc += b - a; } return acc; };
    const map = (x) => map0(x) / tempo;
    const out = path.join(OUT, line.id + ".mp3");
    const fc = keep.map(([a, b], i) => { const Lk = b - a, fi = i === 0 ? 0.012 : 0.01, fo = i === keep.length - 1 ? Math.min(0.06, Lk / 3) : 0.01; return `[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=${fi},afade=t=out:st=${Math.max(0, Lk - fo).toFixed(3)}:d=${fo.toFixed(3)}[s${i}]`; });
    fc.push(`${keep.map((_, i) => `[s${i}]`).join("")}concat=n=${keep.length}:v=0:a=1${tempo !== 1 ? `,atempo=${tempo}` : ""}[o]`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-filter_complex", fc.join(";"), "-map", "[o]", "-c:a", "libmp3lame", "-q:a", "2", out]);
    const mv = meanDb(out); if (!(mv > -45)) throw new Error(`réplique muette après resserrage : ${line.id} (${mv} dB)`);
    t += (line.pause ?? 0.7) * pause;
    lines.push({ id: line.id, scene: line.scene, text: line.text, start: +t.toFixed(3), dur: +dur(out).toFixed(3), file: `vo-tight/${line.id}.mp3`, words: wordTimes(al, map) });
    t += lines[lines.length - 1].dur;
  }
  const tl = { total: +(t + outro).toFixed(3), lines };
  fs.writeFileSync(path.join(dir, "timeline.json"), JSON.stringify(tl, null, 1));
  return tl;
}

/** Pause globale qui amène la durée totale au plus près de la cible (bornée 0,9 – 2,2). */
function pauseForTarget(dir, script, targetSec, opts = {}) {
  const lo = 0.9, hi = 2.2;
  const speech = script.lines.reduce((a, l) => a + dur(path.join(dir, "vo", l.id + ".mp3")), 0) * 0.93; // ≈ après resserrage
  const pauses = script.lines.reduce((a, l) => a + (l.pause ?? 0.7), 0);
  const k = (targetSec - (opts.outro ?? 9) - speech) / pauses;
  return Math.max(lo, Math.min(hi, +k.toFixed(2)));
}

module.exports = { synth, tighten, pauseForTarget, dur, meanDb };
