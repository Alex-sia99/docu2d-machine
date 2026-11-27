/**
 * Docu2D — mixage final : voix (répliques placées sur la timeline) + musique Suno enchaînée sur elle-même par fondus
 * jusqu'à couvrir TOUTE la vidéo (un morceau de 2 min ne laisse jamais 8 min de silence), ducking sous la voix,
 * −14 LUFS (cible YouTube) plafond −1 dBTP, puis CONTRÔLE D'ÉCOUTE (transcription début / milieu / fin) : une vidéo
 * muette ou sans voix est refusée (leçon du 26/11).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { dur, meanDb } = require("./voice");

function musicBed(tracks, total, outFile) {
  // chaîne a-b-a-b… avec fondus de 4 s jusqu'à total + 2 s
  const seq = []; let len = 0, i = 0;
  while (len < total + 2 && seq.length < 40) { const t = tracks[i % tracks.length]; const d = dur(t); seq.push(t); len += seq.length === 1 ? d : d - 4; i++; }
  const args = ["-v", "error", "-y"]; seq.forEach((t) => args.push("-i", t));
  let fc = "", last = "[0:a]";
  for (let k = 1; k < seq.length; k++) { fc += `${last}[${k}:a]acrossfade=d=4:c1=tri:c2=tri[x${k}];`; last = `[x${k}]`; }
  fc += `${last}atrim=0:${total.toFixed(2)},asetpts=N/SR/TB,afade=t=in:d=1.5,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[m]`;
  args.push("-filter_complex", fc, "-map", "[m]", "-ar", "48000", outFile);
  execFileSync("ffmpeg", args);
  return outFile;
}

/** video muette + run → final.mp4 ; opts { music: [mp3…], mvol (0.14), lufs (-14) } */
function mix(runDir, video, out, { music = [], mvol = 0.14, lufs = -14, tail = 2 } = {}) {
  const tl = JSON.parse(fs.readFileSync(path.join(runDir, "timeline.json"), "utf8"));
  const total = tl.total + tail;
  for (const l of tl.lines) { const mv = meanDb(path.join(runDir, l.file)); if (!(mv > -45)) throw new Error(`voix muette : ${l.file} (${mv} dB)`); }
  const tmpDir = path.join(runDir, "mix"); fs.mkdirSync(tmpDir, { recursive: true });
  // 1) piste voix seule (évite un filtre géant à 70 entrées + vidéo)
  const voice = path.join(tmpDir, "voice.wav");
  const a = ["-v", "error", "-y"]; const f = [];
  tl.lines.forEach((l, i) => { a.push("-i", path.join(runDir, l.file)); const ms = Math.round(l.start * 1000); f.push(`[${i}:a]aresample=48000,adelay=${ms}|${ms}[v${i}]`); });
  f.push(`${tl.lines.map((_, i) => `[v${i}]`).join("")}amix=inputs=${tl.lines.length}:normalize=0:dropout_transition=0,apad=whole_dur=${total.toFixed(2)}[vo]`);
  a.push("-filter_complex", f.join(";"), "-map", "[vo]", "-ac", "2", voice); execFileSync("ffmpeg", a);
  // 2) musique enchaînée + ducking + mix + mesure
  const args = ["-v", "error", "-y", "-i", video, "-i", voice];
  let fc = "[1:a]asplit=2[vo][key];";
  if (music.length) { const bed = musicBed(music, total, path.join(tmpDir, "bed.wav")); args.push("-i", bed); fc += `[2:a]volume=${mvol}[mus];[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=600[duck];[vo][duck]amix=inputs=2:normalize=0:dropout_transition=0,alimiter=limit=0.95[a]`; }
  else fc += "[vo]anull[a]";
  const tmp = out.replace(/\.mp4$/, ".tmp.mp4");
  args.push("-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", tmp);
  execFileSync("ffmpeg", args);
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const I = Number((r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const gain = Math.max(-12, Math.min(12, lufs - I));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-c:v", "copy", "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89`, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]);
  fs.unlinkSync(tmp);
  const r2 = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const I2 = Number((r2.stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  return { lufs: I2, total };
}

/** Contrôle d'écoute : transcrit 3 extraits (début, milieu, fin) avec faster-whisper (CPU) et compare au script. */
function listenCheck(out, runDir, lang = "fr") {
  const tl = JSON.parse(fs.readFileSync(path.join(runDir, "timeline.json"), "utf8"));
  const picks = [tl.lines[0], tl.lines[Math.floor(tl.lines.length / 2)], tl.lines[tl.lines.length - 1]];
  const py = `import sys,json\nfrom faster_whisper import WhisperModel\nm=WhisperModel('small',device='cpu',compute_type='int8')\nres=[]\nfor f in sys.argv[2:]:\n  s,_=m.transcribe(f,language=sys.argv[1],beam_size=1)\n  res.append(' '.join(x.text for x in s).strip())\nprint(json.dumps(res,ensure_ascii=False))`;
  const pyf = path.join(runDir, "mix", "listen.py"); fs.writeFileSync(pyf, py);
  const clips = picks.map((l, i) => { const c = path.join(runDir, "mix", `ecoute${i}.wav`); execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, l.start - 0.2)), "-t", String(Math.min(12, l.dur + 0.5)), "-i", out, "-vn", "-ac", "1", "-ar", "16000", c]); return c; });
  const r = spawnSync("python", [pyf, lang, ...clips], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  let heard = []; try { heard = JSON.parse(r.stdout.trim().split("\n").pop()); } catch { throw new Error("contrôle d'écoute impossible : " + (r.stderr || "").slice(-300)); }
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const checks = picks.map((l, i) => { const want = norm(l.text), got = new Set(norm(heard[i] || "")); const hit = want.filter((w) => got.has(w)).length / Math.max(1, want.length); return { id: l.id, heard: heard[i], match: +hit.toFixed(2) }; });
  const ok = checks.every((c) => c.match >= 0.5);
  return { ok, checks };
}
module.exports = { mix, listenCheck, musicBed };
