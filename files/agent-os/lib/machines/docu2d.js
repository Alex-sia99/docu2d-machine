/**
 * MACHINE « Docu Papier 2D » — documentaires animaliers en papier découpé (Oceanverse / Depth Theory), banque de niche
 * « Docu Animaux 2D ». Moteur Remotion piloté par STORYBOARD (remotion/src/Docu2D) : le LLM n'écrit que des beats
 * typés ancrés sur des MOTS de la voix ; la mise en page, la physique et les contrôles sont calculés.
 * Feuille de route : agent-os/docs/FEUILLE-DE-ROUTE-MACHINE-DOCU2D.md · recette : agent-os/docs/RECETTE-NICHE-ANIMAUX.md
 * Vidéo de référence (exemple « or » donné au LLM) : output/machines/d2-hippo (hippopotame, 9 min 56).
 *
 * Étapes (reprenables) :
 *   1. facts     — Wikipédia FR + EN du sujet → registre de faits sourcés + espèce du bestiaire + famille
 *   2. script    — accroche « vous » (une histoire vraie), 5 questions, CTA au milieu, fin en commentaire ; longueur
 *                  calculée sur le débit MESURÉ de la voix choisie
 *   3. voice     — ElevenLabs réplique par réplique + alignement mot à mot + resserrage (fins propres) + pauses → durée
 *   4. storyboard— beats typés (cartes, étiquettes, scènes du monde) ancrés sur les mots → vérificateur d2-check
 *                  (ancrages, durées, encombrement, textes, physique) : refus et correction tant qu'il reste une anomalie
 *   5. broll     — plans réels LIBRES (Pexels / Pixabay / Commons…), crédits auto ; images IA en dernier recours si
 *                  autorisées ; part de plans réels mesurée vs la cible
 *   6. render    — Remotion Docu2D (bundle par run) + miniature
 *   7. mix       — voix + musique Suno enchaînée + ducking, −14 LUFS, CONTRÔLE D'ÉCOUTE (transcription)
 *   8. package   — titre (formules de la niche), description (chapitres, sources des faits ET des images, mention
 *                  fair use automatique si un extrait l'utilise), tags ; stock ; publication privée par défaut
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { AsyncLocalStorage } = require("async_hooks");
const { DATA_DIR, ensureDir, readJSON, writeJSON } = require("../store");
const vault = require("../vault");
const spend = require("../spend");
const tasks = require("../tasks");
const llm = require("../llm");
const voice = require("../docu2d/voice");
const mixer = require("../docu2d/mix");

const MACHINE_ID = "docu2d";
const MACHINE_NAME = "Docu Papier 2D";
const ROOT = path.join(__dirname, "..", "..", "..");
const OUT_ROOT = path.join(__dirname, "..", "..", "output", "machines");
const REMOTION_DIR = path.join(ROOT, "remotion");
const PUB_DIR = path.join(REMOTION_DIR, "public-d2");
const RUNS_DIR = path.join(DATA_DIR, "machines", "runs", MACHINE_ID);
const GOLD = path.join(OUT_ROOT, "d2-hippo");
ensureDir(OUT_ROOT); ensureDir(RUNS_DIR);
const UA = "AgenticOS-Docu2D/1.0 (documentary machine; open licenses only)";

const LANGS = { fr: "Français", en: "English", es: "Español", de: "Deutsch", pt: "Português", it: "Italiano" };
/** Voix ElevenLabs « premade » (bibliothèque publique) + la voix clonée de l'utilisateur si `Voix_Alex` est défini. */
const ELEVEN_VOICES = [
  { id: "alex", name: "Ma voix clonée (Voix_Alex du .env)", own: true },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George — narrateur posé" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian — grave, documentaire" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel — britannique, journal" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will — jeune, dynamique" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — douce, claire" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte — chaleureuse" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice — britannique, nette" },
];
const DEFAULTS = {
  lang: "fr", durationMin: 10, voice: "JBFqnCBsd6RMkjVDRZzb", voiceModel: "eleven_v4", // George (voix publique ElevenLabs)
  realPct: 12,            // part de plans RÉELS visée (le reste = motion design papier) — mesurée et affichée après coup
  aiImages: false,        // images IA en dernier recours (plan réel introuvable) — marquées « illustration IA »
  aiVideo: false,         // vidéo IA (non par défaut, décision du 27/11)
  fairUse: false,         // désactivé (décision d'Alex du 27/11) ; si un jour activé → mention légale auto dans la description
  sources: ["pexels", "pixabay", "commons"],
  music: true, musicVolume: 0.14,
  musicStyle: "instrumental documentary underscore, warm nature ambience, soft marimba and kalimba, light hand percussion, low strings, gentle suspense, curious and calm, no vocals, 85 bpm",
  mode: "semi", publishPrivacy: "private", brand: "Ma chaîne",
  pace: {}, // mots / min de PAROLE mesurés (hors pauses) — mis à jour à chaque run
};
const PRICES = { elevenPer1kChars: 0.15, music: 0.06, llm: 0.08, aiImage: 0.02, aiVideo: 0.3 };
const SPECIES_OK = ["hippo", "lion", "elephant", "buffalo", "rhino", "crocodile"];

// ---------------------------------------------------------------- persistance
function getRun(id) { return readJSON(`machines/runs/${MACHINE_ID}/${id}.json`, null); }
function saveRun(run) { run.updatedAt = new Date().toISOString(); writeJSON(`machines/runs/${MACHINE_ID}/${run.id}.json`, run); }
function listRuns() { return fs.readdirSync(RUNS_DIR).filter((f) => f.endsWith(".json")).map((f) => readJSON(`machines/runs/${MACHINE_ID}/${f}`, null)).filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
function config() { const c = readJSON(`machines/${MACHINE_ID}.json`, {}); return { id: MACHINE_ID, name: MACHINE_NAME, ...c, settings: { ...DEFAULTS, ...(c.settings || {}), pace: { ...DEFAULTS.pace, ...((c.settings || {}).pace || {}) } } }; }
function patchConfig(patch) { const c = readJSON(`machines/${MACHINE_ID}.json`, {}); c.settings = { ...(c.settings || {}), ...(patch.settings || {}) }; if (patch.nicheId !== undefined) c.nicheId = patch.nicheId || null; writeJSON(`machines/${MACHINE_ID}.json`, c); return config(); }
function log(run, msg) { run.log = run.log || []; run.log.push({ ts: new Date().toISOString(), msg }); console.log(`[docu2d ${run.id}] ${msg}`); try { if (run.id && run.params) saveRun(run); } catch {} }
const runDir = (run) => { const d = path.join(OUT_ROOT, run.id); ensureDir(d); return d; };
function addCost(run, key, usd, api, note) { run.cost = run.cost || {}; run.cost[key] = +((run.cost[key] || 0) + usd).toFixed(4); if (usd > 0) spend.record(api, MACHINE_NAME, +usd.toFixed(4), "USD", note); }

// ---------------------------------------------------------------- annulation, processus
const runScope = new AsyncLocalStorage();
const CANCEL_MSG = "Annulée par l'utilisateur";
const procs = new Map(), live = new Set(), cancelled = new Set(), liveRuns = new Map();
function checkCancel() { const id = runScope.getStore(); if (id && cancelled.has(id)) throw new Error(CANCEL_MSG); }
function track(child) { const id = runScope.getStore(); if (!id) return; if (!procs.has(id)) procs.set(id, new Set()); procs.get(id).add(child); child.on("close", () => { const s = procs.get(id); if (s) { s.delete(child); if (!s.size) procs.delete(id); } }); }
function killTree(child) { try { if (process.platform === "win32" && child.pid) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }); else child.kill("SIGKILL"); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)).then(checkCancel);
/** npx dans remotion/ ; stdout TOUJOURS lu (un pipe non lu fige Remotion). */
function npx(args, onLine, { cwd = REMOTION_DIR, timeoutMs = 3 * 3600 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { cwd, shell: true, windowsHide: true }); track(child);
    let out = "", err = "";
    const timer = setTimeout(() => { killTree(child); reject(new Error("délai dépassé : npx " + args[0])); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d.toString(); if (out.length > 2e6) out = out.slice(-1e6); if (onLine) onLine(d.toString()); });
    child.stderr.on("data", (d) => { err += d.toString(); if (err.length > 2e6) err = err.slice(-1e6); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(Object.assign(new Error((err || out).slice(-800) || "code " + code), { out, code })); });
  });
}
async function askJson(prompt, label) { checkCancel(); const r = await llm.askJson(prompt, { label, timeoutMs: 10 * 60 * 1000, tries: 3 }); checkCancel(); return r; }
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
const jsonOf = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

// ---------------------------------------------------------------- clés et voix
function stockKeys() { return { pexels: !!vault.get("pexels"), pixabay: (() => { try { return require("../pixabay").configured(); } catch { return false; } })() }; }
function requireStockKey() { const k = stockKeys(); if (!k.pexels && !k.pixabay) throw new Error("Cette machine a besoin d'au moins une clé Pixabay ou Pexels (Paramètres → Coffre) : c'est la source des plans réels libres."); return k; }
async function voices() {
  let account = [];
  try { account = (await require("../../scripts/elevenlabs").voices()).map((v) => ({ id: v.id, name: `${v.name}${v.category === "cloned" ? " (clonée)" : ""}`, account: true })); } catch {}
  const ids = new Set(account.map((v) => v.id));
  return [...ELEVEN_VOICES.filter((v) => !ids.has(v.id)), ...account];
}
const speechWpm = (v, s = config().settings) => (s.pace && s.pace[v]) || 165;

// ---------------------------------------------------------------- 1. faits (Wikipédia FR + EN)
async function wiki(lang, q, exact = false) {
  if (exact) { const p0 = await wikiPage(lang, q); if (p0) return p0; }
  const s = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(q)}`, { headers: { "User-Agent": UA } }).then((r) => r.json()).catch(() => null);
  const title = s?.query?.search?.[0]?.title; if (!title) return null;
  const p = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}`, { headers: { "User-Agent": UA } }).then((r) => r.json()).catch(() => null);
  const pg = Object.values(p?.query?.pages || {})[0]; if (!pg?.extract) return null;
  return { title: pg.title, url: pg.fullurl, text: pg.extract.slice(0, 40000) };
}
async function wikiPage(lang, title) {
  const p = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|info|langlinks&lllimit=50&inprop=url&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}`, { headers: { "User-Agent": UA } }).then((r) => r.json()).catch(() => null);
  const pg = Object.values(p?.query?.pages || {})[0]; if (!pg?.extract) return null;
  return { title: pg.title, url: pg.fullurl, text: pg.extract.slice(0, 40000), links: Object.fromEntries((pg.langlinks || []).map((l) => [l.lang, l["*"]])) };
}
/** Page dans la langue du sujet, puis la page ANGLAISE (ou française) par le lien interlangue — jamais une recherche aveugle. */
async function wikiPair(subject, lang) {
  const first = lang === "en" ? "en" : "fr", other = first === "en" ? "fr" : "en";
  const a = await wiki(first, subject); if (!a) return [null, await wiki(other, subject)];
  const pa = await wikiPage(first, a.title); const t2 = pa && pa.links && pa.links[other];
  const b = t2 ? await wikiPage(other, t2) : null;
  return first === "fr" ? [a, b] : [b, a];
}
async function stepFacts(run) {
  const subj = run.params.subject;
  log(run, `📚 Wikipédia FR + EN : « ${subj} »…`);
  const [fr, en] = await wikiPair(subj, run.params.lang);
  if (!fr && !en) throw new Error(`aucune page Wikipédia trouvée pour « ${subj} »`);
  const j = await askJson([
    `Tu prépares le REGISTRE DES FAITS d'un documentaire YouTube de ${run.params.durationMin} min sur : « ${subj} ».`,
    "Règles : EXACTEMENT 25 à 40 faits, uniquement présents dans les textes fournis (aucun chiffre de mémoire) ; chaque fait = une affirmation courte + sa valeur + l'URL de la page. Couvre : danger pour l'homme (victimes, attaques, circonstances), armes et anatomie chiffrées, comportement (territoire, groupe, reproduction, alimentation), records, secrets surprenants, rapports avec les autres animaux, histoire humaine (découverte, chasse, conservation, statut UICN). Un chiffre spectaculaire mais mal établi est marqué uncertain:true.",
    "Cherche AUSSI une histoire vraie et datée d'une personne (accident, attaque, rencontre, record) qui pourra servir d'accroche, avec ses détails vérifiables TELS QU'ÉCRITS dans les textes. S'il n'y en a aucune, story = null (on n'en invente jamais).",
    `Choisis l'espèce du bestiaire qui dessinera l'animal : ${SPECIES_OK.join(", ")} (le plus proche en silhouette) ; et la famille : terrestre | rivière | marin | insecte | oiseau | phénomène.`,
    `Langue du public : ${LANGS[run.params.lang] || run.params.lang}.`,
    'JSON UNIQUEMENT : {"facts":[{"claim":"","value":"","src":"","uncertain":false}],"story":{"who":"","when":"","where":"","what":"","src":""},"hero":"hippo","family":"terrestre","world":"savane","angle":"le paradoxe en une phrase"}',
    fr ? `PAGE FR (${fr.url}) :\n${fr.text.slice(0, 25000)}` : "", en ? `PAGE EN (${en.url}) :\n${en.text.slice(0, 25000)}` : "",
  ].filter(Boolean).join("\n\n"), "Faits");
  if (!Array.isArray(j.facts) || j.facts.length < 8) throw new Error(`registre de faits trop maigre (${(j.facts || []).length} faits — pages : ${[fr, en].filter(Boolean).map((x) => x.title).join(", ") || "aucune"})`);
  run.facts = j.facts; run.story = j.story || null;
  run.meta = { enName: en ? en.title.replace(/\s*\(.*\)$/, "").toLowerCase() : null, hero: SPECIES_OK.includes(j.hero) ? j.hero : "hippo", family: run.params.family !== "auto" ? run.params.family : (j.family || "terrestre"), world: "savane", angle: j.angle || "" };
  run.sources = [fr, en].filter(Boolean).map((x) => ({ title: x.title, url: x.url }));
  addCost(run, "llm", 0.02, "openrouter", "faits");
  log(run, `📚 ${run.facts.length} faits sourcés · espèce dessinée : ${run.meta.hero} · famille : ${run.meta.family}${run.story?.who ? ` · histoire : ${run.story.who}` : ""}`);
}

// ---------------------------------------------------------------- 2. script
function goldScript() { return jsonOf(path.join(GOLD, "script.json"), null); }
async function stepScript(run) {
  const s = config().settings;
  const wpm = speechWpm(run.params.voice, s);
  const target = Math.round(run.params.durationMin * 60 * 0.85 * wpm / 60); // ≈ 15 % de pauses
  const gold = goldScript();
  const ex = gold ? ["Chapitres : " + gold.chapters.map((c) => c.title).join(" · "), ...gold.lines.filter((l) => ["hook", "promise"].includes(l.scene) || ["l10", "l11", "l12", "l13"].includes(l.id)).map((l) => `${l.id} [${l.scene}] ${l.text}`)].join("\n") : "";
  let best = null;
  for (let a = 1; a <= 3; a++) {
    const j = await askJson([
      `Écris la voix off d'un documentaire YouTube papier découpé de ${run.params.durationMin} min sur « ${run.params.subject} », en ${LANGS[run.params.lang] || run.params.lang}.`,
      `LONGUEUR : EXACTEMENT ${Math.round(target * 0.97)} à ${Math.round(target * 1.03)} mots au total (débit mesuré de la voix : ${wpm} mots/min).`,
      "STRUCTURE (recette mesurée sur la niche Oceanverse / Depth Theory) :",
      "- hook : 6-8 répliques à la DEUXIÈME personne (« Vous… ») qui plongent dans l'histoire vraie du registre, cliffhanger, puis le paradoxe ;",
      "- promise : la question-titre + le sommaire des 5 questions (une phrase par question) ;",
      "- q1 … q5 : chaque chapitre commence par « Question numéro N : … ? » puis 5-9 répliques de faits du registre, concrets et chiffrés ;",
      "- cta : UNE réplique au milieu (après q2) : like + abonnement + « la suite est encore plus étrange » ;",
      "- end : 2-3 répliques de conseils concrets ou de perspective, retour à l'histoire de l'accroche, question finale + « Dites-le moi en commentaire ».",
      "ZÉRO INVENTION : aucun événement, aucune action, aucune conséquence, aucun conseil qui ne soit dans le registre. Si l'histoire ne contient pas de danger, on ne lui en invente pas : l'accroche devient une scène IMAGINÉE au présent (« Imaginez : vous… ») où seuls des faits du registre arrivent. Jamais de remplissage : chaque réplique apporte une information nouvelle (pas d'adjectifs répétés, pas de « africain » à chaque phrase). Les 5 chapitres sont des QUESTIONS DE CURIOSITÉ fortes (bon : « Pourquoi même les lions l'évitent ? », « Avec quelles armes ? » ; mauvais : « Le poids maximal », « La consommation quotidienne »). Si le registre est trop mince pour la longueur demandée, écris PLUS COURT plutôt que de broder.",
      "RÈGLES : uniquement les faits du registre (jamais de chiffre inventé) ; un fait « uncertain » est présenté avec prudence (« on cite souvent… personne ne l'a vraiment compté ») ; répliques de 15 à 40 mots ; phrases orales, simples, rythmées ; aucune parenthèse ; nombres écrits en lettres quand ils sont courts ; pas de « venimeux » pour un animal qui ne l'est pas.",
      ex ? `EXEMPLE DE TON ET DE RYTHME (vidéo de référence, ne pas copier le contenu) :\n${ex}` : "",
      `REGISTRE DES FAITS :\n${JSON.stringify(run.facts)}\nHISTOIRE : ${JSON.stringify(run.story)}`,
      'JSON UNIQUEMENT : {"title":"titre-question accrocheur","chapters":[{"title":"","icon":"skull|tooth|shield|eye|globe|sun|water|baby|speed|weight|warning|grass|moon"}],"lines":[{"id":"l01","scene":"hook|promise|q1|q2|cta|q3|q4|q5|end","pause":0.7,"text":""}]}',
    ].filter(Boolean).join("\n"), "Script");
    const lines = (j.lines || []).filter((l) => l && l.text).map((l, i) => ({ id: `l${String(i + 1).padStart(2, "0")}`, scene: l.scene || "q1", pause: /^q\d$/.test(l.scene) && /^(question|question number|pregunta|frage)/i.test(l.text) ? 1.2 : Number(l.pause) || 0.7, text: String(l.text).replace(/\s+/g, " ").trim() }));
    const n = lines.reduce((x, l) => x + words(l.text), 0);
    const cand = { title: j.title || run.params.subject, chapters: (j.chapters || []).slice(0, 5), lines, n };
    if (!best || Math.abs(n - target) < Math.abs(best.n - target)) best = cand;
    log(run, `📝 Script essai ${a} : ${lines.length} répliques, ${n} mots (cible ${target})`);
    if (Math.abs(n - target) / target <= 0.08 && cand.chapters.length === 5) break;
  }
  // RELECTURE DES FAITS : chaque réplique est confrontée au registre ; une affirmation non sourcée est réécrite ou retirée
  try {
    const rv = await askJson([
      "Tu es vérificateur de faits. Pour CHAQUE réplique, dis si TOUT ce qu'elle affirme (événements, chiffres, causes, conseils, intentions prêtées à l'animal) est soutenu par le registre ou l'histoire fournis. Les phrases purement narratives sans affirmation (« Question numéro un : … ? », appel à s'abonner, question finale) sont soutenues.",
      "Pour chaque réplique NON soutenue, propose une réécriture fidèle au registre (même rôle, longueur proche), ou une chaîne vide pour la supprimer si rien ne la sauve.",
      "REGISTRE : " + JSON.stringify(run.facts) + "\nHISTOIRE : " + JSON.stringify(run.story),
      "RÉPLIQUES : " + JSON.stringify(best.lines.map((l) => ({ id: l.id, text: l.text }))),
      'JSON UNIQUEMENT : {"bad":[{"id":"l03","why":"","fix":""}]}',
    ].join("\n"), "Relecture des faits");
    const bad = Array.isArray(rv.bad) ? rv.bad : [];
    for (const b of bad) { const l = best.lines.find((x) => x.id === b.id); if (!l) continue; if (b.fix && String(b.fix).trim()) l.text = String(b.fix).trim(); else l.drop = true; }
    best.lines = best.lines.filter((l) => !l.drop).map((l, i) => ({ id: "l" + String(i + 1).padStart(2, "0"), scene: l.scene, pause: l.pause, text: l.text }));
    best.n = best.lines.reduce((x, l) => x + words(l.text), 0);
    run.factCheck = bad.map((b) => ({ id: b.id, why: b.why, fixed: !!b.fix }));
    log(run, "🔎 Relecture des faits : " + bad.length + " réplique(s) non sourcée(s) corrigée(s) ou retirée(s)");
  } catch (e) { log(run, "relecture des faits : " + e.message.slice(0, 120)); }
  addCost(run, "llm", 0.03, "openrouter", "script");
  run.script = { title: best.title, chapters: best.chapters, lines: best.lines, words: best.n, target };
  fs.writeFileSync(path.join(runDir(run), "script.json"), JSON.stringify({ title: best.title, subject: run.params.subject, family: run.meta.family, lang: run.params.lang,
    voice: { id: run.params.voice, model: s.voiceModel, stability: 0.45, similarity: 0.85 }, chapters: best.chapters, lines: best.lines, facts: run.facts }, null, 2));
}

// ---------------------------------------------------------------- 3. voix
async function stepVoice(run) {
  const dir = runDir(run); const script = jsonOf(path.join(dir, "script.json"));
  if (run.script) { script.lines = run.script.lines; script.chapters = run.script.chapters; script.title = run.script.title; fs.writeFileSync(path.join(dir, "script.json"), JSON.stringify(script, null, 2)); }
  log(run, `🎙 ElevenLabs : ${script.lines.length} répliques (${script.lines.reduce((a, l) => a + l.text.length, 0)} caractères)…`);
  const chars = await voice.synth(dir, script, { onLine: (i, n) => { if (i % 10 === 0) log(run, `🎙 voix ${i}/${n}`); }, cancelled: () => cancelled.has(run.id) });
  addCost(run, "voice", (chars / 1000) * PRICES.elevenPer1kChars, "elevenlabs", `${chars} car.`);
  const k = voice.pauseForTarget(dir, script, run.params.durationMin * 60);
  const tl = voice.tighten(dir, script, { pause: k });
  const speech = tl.lines.reduce((a, l) => a + l.dur, 0); const w = script.lines.reduce((a, l) => a + words(l.text), 0);
  const wpm = Math.round((w / speech) * 60);
  patchConfig({ settings: { pace: { ...config().settings.pace, [run.params.voice]: wpm } } });
  run.timeline = { total: tl.total, lines: tl.lines.length, wpm, pause: k };
  log(run, `🎙 Voix : ${Math.floor(tl.total / 60)} min ${Math.round(tl.total % 60)} s · débit ${wpm} mots/min · pauses ×${k}`);
}

// ---------------------------------------------------------------- 4. storyboard (+ vérificateur)
const BEAT_DOC = `TYPES DE BEATS (ancrés sur un MOT de la réplique : "line" + "at" ; optionnel "until"/"untilLine") :
CARTES (une seule à la fois, elle coupe la précédente ; ≥ 1,6 s) :
- title {text, sub} · toc {items:[{at}×5]} (sommaire, une carte par question) · chapter {n} (« Question n »)
- bignum {n, unit, sub, icon} · compare {items:[{who: human|child|car|<espèce>, label, value, at}]} (tailles réelles)
- bars {title, log:true|false, items:[{label, icon, value, display, at, line?, hi?}]} · map {focus:"ISO3" ou [lon,lat], zoom0, zoom, highlight:["ISO3"], pins:[{lonlat:[lon,lat], label, at}]}
- anatomy {species, gape (°, 0 si fermé), gapeAt, labels:[{part: canine|incisor|eye|ear|nostril|lips|skin|leg|belly, text, at, side: left|right|bottom}]}
- timeline {items:[{year, text, at, line?}]} · quote {text} · icons {title, items:[{icon, label, at, no?, ok?}]} · outro {text}
- broll {asset:"nom_court", query:"3 à 5 mots ANGLAIS décrivant un plan réel filmable de l'espèce"} (plan réel libre, 4-8 s)
ÉTIQUETTES : tag {text (≤ 34 car.), sub?, kind: white|orange|yellow|green} — sur la carte visible ou sur le monde ; ≥ 1,3 s visibles.
MONDE (le plan-séquence dessiné, change avec le beat suivant) : world {preset, spot?, night?, events?:[{do, at, line?}]}
  presets : herd (troupeau dans l'eau) · graze (broute, night 0.5 = crépuscule) · charge (events go) · gape (events open) · calf (mère + petit)
  · night (events return, man, gape : un humain entre l'animal et l'eau) · under (marche au fond, events breathe) · sleep · nurse · sweat (events sweat)
  · canoe (events surface, flip, rush, dark ; solo:true = un seul canoë) · spots : plain, bank, river, herd, calf, deep, night, wide
CTA : cta {like:"mot", sub:"mot"} (une fois, au milieu).
ICÔNES : skull tooth tusk shield eye globe sun moon whale weight speed canoe baby warning grass bacteria ruler hippo lion crocodile pig elephant money colombia thermometer heart brain water hospital phone syringe lungs bandage mosquito fin question check cross calendar stopwatch.`;
async function d2check(run) {
  const props = path.join(PUB_DIR, run.id, "props.json");
  try { const out = await npx(["tsx", "scripts/d2-check.ts", `"${props}"`, "--json"]); return JSON.parse(out.trim().split("\n").pop()); }
  catch (e) { try { return JSON.parse(String(e.out || "").trim().split("\n").pop()); } catch { throw new Error("vérificateur : " + e.message.slice(0, 300)); } }
}
function stageRun(run) {
  const st = require("../docu2d/stage");
  const dir = runDir(run);
  const r = st.stage(dir, run.id, { lang: run.params.lang });
  try { fs.copyFileSync(path.join(PUB_DIR, "paper.png"), path.join(PUB_DIR, run.id, "paper.png")); } catch {}
  // chaque run est bundlé avec SON dossier comme --public-dir : les chemins d'assets sont relatifs à ce dossier
  r.props.root = ""; fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify(r.props));
  return r;
}
async function stepStoryboard(run) {
  const dir = runDir(run);
  const tl = jsonOf(path.join(dir, "timeline.json")); const script = jsonOf(path.join(dir, "script.json"));
  const gold = jsonOf(path.join(GOLD, "storyboard.json"));
  const lines = tl.lines.map((l) => `${l.id} [${l.scene}] (${l.dur.toFixed(1)} s) ${l.text}`).join("\n");
  const nBroll = Math.max(3, Math.ceil((tl.total * (run.params.realPct / 100)) / 4.5));
  let sb = null, issues = [];
  for (let a = 1; a <= 4; a++) {
    const prompt = a === 1 || !sb ? [
      `Écris le STORYBOARD JSON d'une vidéo papier découpé (${Math.round(tl.total)} s) : chaque réplique reçoit 1 à 3 beats qui ILLUSTRENT exactement ce qui est dit, au mot près.`,
      BEAT_DOC,
      `RÈGLES : premier beat = world (preset adapté à l'accroche) ; un chapter au début de chaque « Question numéro N » ; toc sur la réplique du sommaire ; title sur la question-titre ; un cta sur la réplique cta ; outro sur la dernière réplique ; EXACTEMENT ${nBroll} beats broll (part de plans réels visée : ${run.params.realPct} %) répartis sur toute la vidéo, sur des répliques qui décrivent un comportement filmable ; alterner cartes et monde (≈ 50 % du temps en cartes) ; un beat world au moins tous les 3 chapitres ; chiffres du script = chiffres des cartes ; "at" = un mot EXACT de la réplique.`,
      `Espèce dessinée : ${run.meta.hero}. Monde : savane (plaine, berge, rivière avec troupeau).`,
      gold ? `EXEMPLE (vidéo de référence, extrait) : ${JSON.stringify({ chapters: gold.chapters, beats: gold.beats.slice(0, 40) })}` : "",
      `RÉPLIQUES :\n${lines}`,
      `JSON UNIQUEMENT : {"meta":{"title":"${(script.title || "").replace(/"/g, "'")}","lang":"${run.params.lang}","world":"savane","hero":"${run.meta.hero}","family":"${run.meta.family}"},"chapters":${JSON.stringify(script.chapters)},"beats":[…]}`,
    ].filter(Boolean).join("\n\n") : [
      "Corrige ce storyboard : le vérificateur a trouvé ces anomalies. Corrige UNIQUEMENT ce qui est signalé (mot d'ancrage exact de la réplique, étiquette trop longue → raccourcir, durée trop courte → ancrer plus tôt ou retirer, encombrement → retirer une étiquette).",
      `ANOMALIES :\n${issues.map((i) => `- [${i.rule}] ${i.msg}`).join("\n")}`,
      `RÉPLIQUES :\n${lines}`,
      `STORYBOARD ACTUEL :\n${JSON.stringify(sb)}`,
      "JSON UNIQUEMENT : le storyboard complet corrigé, même format.",
    ].join("\n\n");
    const j = await askJson(prompt, `Storyboard ${a}`);
    if (!Array.isArray(j.beats) || !j.beats.length) continue;
    sb = { meta: { ...j.meta, world: "savane", hero: run.meta.hero, lang: run.params.lang, title: script.title }, chapters: script.chapters, beats: j.beats };
    for (const b of sb.beats) if (b.type === "broll") b.asset = String(b.asset || b.query || "plan").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24);
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
    // vérification sans plans (les broll seront remplis ensuite) : on stage avec des assets factices
    const fake = Object.fromEntries(sb.beats.filter((b) => b.type === "broll").map((b) => [b.asset, { file: "", kind: "video", credit: "" }]));
    ensureDir(path.join(PUB_DIR, run.id));
    fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify({ sb, tl, assets: fake, root: "" }));
    const chk = await d2check(run);
    issues = (chk.anomalies || []).filter((i) => i.rule !== "asset");
    log(run, `🧩 Storyboard essai ${a} : ${sb.beats.length} beats · ${issues.length} anomalie(s)${issues.length ? " → correction" : ""}`);
    if (!issues.length) break;
  }
  addCost(run, "llm", 0.06, "openrouter", "storyboard");
  if (!sb) throw new Error("storyboard illisible");
  // anomalies résiduelles : on retire les beats fautifs plutôt que de livrer un placement faux
  if (issues.length) {
    const bad = new Set(issues.map((i) => (/beat (\d+)/.exec(i.msg) || [])[1]).filter(Boolean).map(Number));
    const before = sb.beats.length; sb.beats = sb.beats.filter((_, i) => !bad.has(i));
    for (const i of issues) if (i.rule === "texte") { const t = (/« (.+) »/.exec(i.msg) || [])[1]; const b = sb.beats.find((x) => x.text === t); if (b) b.text = b.text.slice(0, 34); }
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
    log(run, `🧩 ${before - sb.beats.length} beat(s) fautif(s) retiré(s), textes trop longs raccourcis`);
  }
  run.storyboard = { beats: sb.beats.length, broll: sb.beats.filter((b) => b.type === "broll").length };
}

// ---------------------------------------------------------------- 5. plans réels libres
/** réessaie avec un DÉLAI MAX par tentative (une API muette ne fige jamais le run : vu avec Pexels le 27/11) */
async function retry(fn, n = 3, ms = 30000) { let e; for (let i = 0; i < n; i++) { try { return await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("délai réseau dépassé")), ms))]); } catch (x) { e = x; await sleep(1500 * (i + 1)); } } throw e; }
async function searchClip(q, srcs, used) {
  const cands = [];
  if (srcs.includes("pexels") && vault.get("pexels")) { try { const px = require("../pexels"); for (const v of await retry(() => px.searchVideos(q, { perPage: 12 }))) { const f = (v.video_files || []).find((x) => Number(x.width) === 1280 && /mp4/i.test(x.file_type || "mp4")) || px.pickVideoFile(v); const sc = px.scoreVideo(v, 7); /* 720p éco : le plan est recoupé en 1280 de toute façon */ if (f && sc > 0) cands.push({ id: `px${v.id}`, src: "pexels", url: f.link, score: sc + 1, author: v.user?.name || "", license: "licence Pexels", page: v.url, dur: v.duration }); } } catch {} }
  if (srcs.includes("pixabay")) { try { const pb = require("../pixabay"); for (const v of await retry(() => pb.searchVideos(q, { perPage: 12 }))) { const f = (v.video_files || []).find((x) => Number(x.width) === 1280) || pb.pickVideoFile(v); if (f && v.duration >= 4) cands.push({ id: String(v.id).startsWith("pb") ? String(v.id) : `pb${v.id}`, src: "pixabay", url: f.link, score: (v.duration >= 7 ? 6 : 3) + (f.width >= 1280 ? 2 : 0), author: v.user || "", license: "licence Pixabay", page: v.page || v.pageURL || "", dur: v.duration }); } } catch {} }
  if (srcs.includes("commons")) { try { const os = require("../opensources"); for (const v of await os.commons(q, { kind: "video", perPage: 8 })) { const f = (v.video_files || [])[0]; if (f && (f.width || 0) >= 640) cands.push({ id: v.id, src: "commons", url: f.link, score: 3, author: v.author, license: v.license, page: v.page, dur: v.duration }); } } catch {} }
  return cands.filter((c) => !used.has(c.id)).sort((a, b) => b.score - a.score);
}
/** Télécharge un candidat, le recoupe en 720p, puis le fait REGARDER par Qwen (vision) : bonne espèce EXACTE, vraie vidéo,
 *  scène conforme. Leçon du buffle (27/11) : la recherche « african buffalo » ramène des buffles d'eau asiatiques et une
 *  requête « lion attacking buffalo » un buffle caressé derrière une clôture. Rejeté → candidat suivant. */
async function fetchVerified(run, name, queries, srcs, used, bdir, rejected) {
  const lab = require("../lab"); const sp = SPECIES_NAME(run); let tries = 0;
  for (const q of queries) {
    const generic = q === sp || q === sp.split(" ").pop();
    for (const c of (await searchClip(q, srcs, used)).filter((x) => !rejected.has(x.id)).slice(0, 3)) {
      if (++tries > 7) return null;
      const raw = path.join(bdir, `${name}.raw`), out = path.join(bdir, `${name}.mp4`);
      try {
        fs.writeFileSync(raw, await retry(async () => { const r = await fetch(c.url, { headers: { "User-Agent": UA } }); if (!r.ok) throw new Error("HTTP " + r.status); return Buffer.from(await r.arrayBuffer()); }, 3, 180000));
        await new Promise((res, rej) => { const p = spawn("ffmpeg", ["-v", "error", "-y", "-i", raw, "-t", "20", "-an", "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-crf", "22", "-preset", "veryfast", "-pix_fmt", "yuv420p", out], { windowsHide: true }); track(p); p.stdout.on("data", () => {}); p.on("close", (code) => (code === 0 ? res() : rej(new Error("ffmpeg")))); });
        try { fs.unlinkSync(raw); } catch {}
        const d = await voice.dur(out); const frames = [0.25, 0.65].map((k, i) => { const fp = path.join(bdir, `${name}-v${i}.jpg`); require("child_process").execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String((d * k).toFixed(2)), "-i", out, "-frames:v", "1", "-vf", "scale=640:-2", fp]); return fp; });
        const content = [{ type: "text", text: [
          `Ces deux images viennent du même plan vidéo, prévu pour illustrer un documentaire sur : ${run.params.subject} (${sp}).`,
          `Plan attendu : « ${q} ».`,
          `- species : l'animal principal que tu vois (nom courant + scientifique si possible) ;`,
          `- ok : true SEULEMENT si c'est exactement cette espèce (${sp}), pas une espèce voisine (ex. buffle d'eau asiatique ≠ buffle d'Afrique, éléphant d'Asie ≠ d'Afrique) ;`,
          `- real : true si c'est une vraie vidéo filmée (pas un dessin, une 3D, un écran, un texte) ;`,
          `- matches : true si la scène correspond au plan attendu${generic ? " (ici : n'importe quel plan naturel de l'espèce convient)" : ""} ;`,
          `- captive : true si on voit un zoo, une clôture, une cage, des humains qui la nourrissent.`,
          'JSON UNIQUEMENT : {"species":"","ok":false,"real":true,"matches":false,"captive":false,"scene":""}'].join("\n") },
          ...frames.map((fp) => ({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + fs.readFileSync(fp).toString("base64") } }))];
        const v = await lab.askVision(content); addCost(run, "check", v.cost || 0.001, "openrouter", "vision b-roll");
        frames.forEach((fp) => { try { fs.unlinkSync(fp); } catch {} });
        const j = v.json || {};
        if (j.ok && j.real !== false && (j.matches || generic) && !j.captive) return { c, q, seen: j.scene || j.species };
        rejected.add(c.id); try { fs.unlinkSync(out); } catch {}
        log(run, `👁 ${name} : ${c.src} ${c.id} refusé — ${j.species || "?"}${j.captive ? ", en captivité" : ""}${j.matches === false && !generic ? ", scène différente" : ""}`);
      } catch (e) { rejected.add(c.id); try { fs.unlinkSync(raw); } catch {} log(run, `⚠ ${name} : ${c.id} — ${e.message.slice(0, 100)}`); }
    }
  }
  return null;
}
async function aiImage(run, prompt, file) {
  const key = vault.get("kie"); if (!key) throw new Error("clé Kie absente");
  const r = await fetch("https://api.kie.ai/api/v1/jobs/createTask", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "nano-banana-2-lite", input: { prompt, aspect_ratio: "16:9", resolution: "1K" } }) }).then((x) => x.json());
  const id = r.data?.taskId; if (!id) throw new Error("Kie : " + (r.msg || "refus"));
  for (let t = 0; t < 40; t++) { await sleep(6000); const q = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${id}`, { headers: { Authorization: `Bearer ${key}` } }).then((x) => x.json()).catch(() => ({})); if (q.data?.state === "success") { const url = JSON.parse(q.data.resultJson).resultUrls[0]; fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer())); addCost(run, "ai", PRICES.aiImage, "kie", "image IA"); return file; } if (q.data?.state === "fail") throw new Error("Kie : échec"); }
  throw new Error("Kie : délai dépassé");
}
async function stepBroll(run) {
  requireStockKey();
  const dir = runDir(run); const bdir = path.join(dir, "broll"); ensureDir(bdir);
  const sb = jsonOf(path.join(dir, "storyboard.json"));
  const credits = jsonOf(path.join(bdir, "credits.json"), {});
  const used = new Set(Object.values(credits).map((c) => c.id));
  const srcs = run.params.sources || config().settings.sources;
  const names = [...new Set(sb.beats.filter((b) => b.type === "broll").map((b) => b.asset))];
  let ok = 0, ai = 0, dropped = 0; const rejected = new Set();
  for (const name of names) {
    checkCancel();
    if (fs.existsSync(path.join(bdir, `${name}.mp4`)) || fs.existsSync(path.join(bdir, `${name}.jpg`))) { ok++; continue; }
    const beat = sb.beats.find((b) => b.asset === name);
    const q = beat.query || `${SPECIES_NAME(run)} ${name.replace(/_/g, " ")}`;
    const sp = SPECIES_NAME(run); const qw = q.split(/\s+/);
    const tries = [q, qw.slice(0, 3).join(" "), `${sp} ${qw.find((w) => /ing$/.test(w)) || ""}`.trim(), sp, sp.split(" ").pop()];
    const got = await fetchVerified(run, name, [...new Set(tries)], srcs, used, bdir, rejected);
    if (got) { const c = got.c; credits[name] = { id: c.id, src: c.src, author: c.author, license: c.license, page: c.page, seen: got.seen }; used.add(c.id); ok++; log(run, `🎞 ${name} ← ${c.src} (${c.id}) « ${got.q} » ✓ vu : ${got.seen}`); continue; }
    if (run.params.aiImages) {
      try { await aiImage(run, `Paper cut-out documentary illustration, ${q}, flat layered paper shapes, soft paper texture, natural colors, 16:9, no text, no logo`, path.join(bdir, `${name}.jpg`)); credits[name] = { id: `ai-${name}`, src: "ai", author: "", license: "illustration IA", page: "" }; ai++; continue; } catch (e) { log(run, `⚠ image IA : ${e.message}`); }
    }
    sb.beats = sb.beats.filter((b) => b.asset !== name); dropped++;
    log(run, `↷ ${name} : aucun plan libre (« ${q} ») — beat retiré`);
  }
  fs.writeFileSync(path.join(bdir, "credits.json"), JSON.stringify(credits, null, 1));
  fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
  stageRun(run);
  let chk = await d2check(run);
  // COMPLÉMENT : sous la cible (−2 pts), on ajoute des plans sur les répliques SANS carte (le monde y est seul), du milieu vers les bords
  if (chk.realPct < run.params.realPct - 2) {
    const tl = jsonOf(path.join(dir, "timeline.json"));
    const CARD = new Set(["title", "toc", "chapter", "bignum", "compare", "bars", "broll", "photo", "map", "anatomy", "quiz", "timeline", "quote", "icons", "outro", "cta"]);
    const busy = new Set(sb.beats.filter((b) => CARD.has(b.type)).map((b) => b.line));
    const free = tl.lines.filter((l, i) => i > 2 && i < tl.lines.length - 2 && !busy.has(l.id) && l.dur >= 3.5);
    const sp = SPECIES_NAME(run); const kinds = ["close up", "walking", "herd", "water", "eating", "resting", "running"];
    let k = 0;
    for (const l of free) {
      if (chk.realPct + (100 * k * 4.5) / tl.total >= run.params.realPct) break;
      const name = `extra_${k + 1}`; const q = `${sp} ${kinds[k % kinds.length]}`;
      const got = await fetchVerified(run, name, [q, sp], srcs, used, bdir, rejected); if (!got) break; const c = got.c;
      try {
        credits[name] = { id: c.id, src: c.src, author: c.author, license: c.license, page: c.page, seen: got.seen }; used.add(c.id);
        sb.beats.push({ type: "broll", line: l.id, asset: name, query: q }); k++;
        log(run, `➕ ${name} (${l.id}) ← ${c.src} « ${q} »`);
      } catch (e) { log(run, `⚠ complément ${name} : ${e.message}`); }
    }
    if (k) { fs.writeFileSync(path.join(bdir, "credits.json"), JSON.stringify(credits, null, 1)); fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1)); stageRun(run); chk = await d2check(run); }
  }
  // toujours sous la cible : chaque plan réel est PROLONGÉ sur la réplique suivante (il s'arrête à la carte suivante, exclusivité oblige)
  if (chk.realPct < run.params.realPct - 2) {
    const tl2 = jsonOf(path.join(dir, "timeline.json")); let ext = 0;
    for (const b of sb.beats.filter((x) => x.type === "broll" && !x.until && !x.untilLine)) { const i = tl2.lines.findIndex((l) => l.id === b.line); if (i >= 0 && i < tl2.lines.length - 2) { b.untilLine = tl2.lines[i + 1].id; ext++; } }
    if (ext) { fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1)); stageRun(run); const c2 = await d2check(run); if (!(c2.anomalies || []).length) { chk = c2; log(run, `⤳ ${ext} plan(s) réel(s) prolongé(s) → ${chk.realPct} %`); } }
  }
  run.check = { anomalies: chk.anomalies || [], realPct: chk.realPct, cardPct: chk.cardPct, target: run.params.realPct };
  log(run, `✅ Plans réels : ${ok}${ai ? ` + ${ai} illustration(s) IA` : ""}${dropped ? ` · ${dropped} sans plan` : ""} · part réelle mesurée ${chk.realPct} % (cible ${run.params.realPct} %) · ${run.check.anomalies.length} anomalie(s)`);
  if (run.check.anomalies.length) throw new Error(`vérificateur : ${run.check.anomalies.length} anomalie(s) — ${run.check.anomalies.slice(0, 3).map((i) => i.msg).join(" · ")}`);
  // planche de relecture (24 images) pour la validation semi-manuelle
  try { await npx(["remotion", "bundle", "src/docu2d.tsx", "--public-dir", `"${path.join(PUB_DIR, run.id)}"`, "--out-dir", `"build-d2-${run.id}"`, "--log=error"]); run.bundle = `build-d2-${run.id}`;
    await npx(["node", "scripts/d2-stills.mjs", `"${path.join(PUB_DIR, run.id, "props.json")}"`, `"${path.join(dir, "planche")}"`, "--n", "24", "--scale", "0.5", "--bundle", run.bundle]);
    run.sheets = fs.readdirSync(path.join(dir, "planche")).filter((f) => f.startsWith("sheet-")).map((f) => `agent-os/output/machines/${run.id}/planche/${f}`);
  } catch (e) { log(run, "planche : " + e.message.slice(0, 200)); }
}
const SPECIES_NAME = (run) => run.meta?.enName || ({ hippo: "hippo", lion: "lion", elephant: "elephant", buffalo: "african buffalo", rhino: "rhino", crocodile: "crocodile" }[run.meta?.hero] || run.params.subject);

// ---------------------------------------------------------------- 6. rendu
async function stepRender(run, onProgress) {
  const dir = runDir(run);
  const props = jsonOf(path.join(PUB_DIR, run.id, "props.json")); props.root = ""; fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify(props));
  if (!run.bundle || !fs.existsSync(path.join(REMOTION_DIR, run.bundle))) { await npx(["remotion", "bundle", "src/docu2d.tsx", "--public-dir", `"${path.join(PUB_DIR, run.id)}"`, "--out-dir", `"build-d2-${run.id}"`, "--log=error"]); run.bundle = `build-d2-${run.id}`; }
  const out = path.join(dir, "muet.mp4"); const t0 = Date.now(); let last = 0;
  log(run, `🎬 Rendu Remotion (${Math.round(props.tl.total)} s)…`);
  await npx(["remotion", "render", run.bundle, "Docu2D", `"${out}"`, `--props="${path.join(PUB_DIR, run.id, "props.json")}"`, "--concurrency=6", "--timeout=120000", "--muted", "--crf=20", "--log=info"], (line) => {
    const m = /Rendered\s+(\d+)\/(\d+)/.exec(line); if (m) { const pct = Math.round((100 * +m[1]) / +m[2]); if (pct - last >= 10) { last = pct; log(run, `🎬 rendu ${pct} %`); if (onProgress) onProgress(pct); } }
  });
  if (!fs.existsSync(out) || fs.statSync(out).size < 100000) throw new Error("Remotion n'a produit aucun fichier");
  run.render = { file: out, min: +((Date.now() - t0) / 60000).toFixed(1) };
  log(run, `✅ Rendu en ${run.render.min} min`);
}

// ---------------------------------------------------------------- 7. mixage + contrôle d'écoute
async function stepMix(run) {
  const dir = runDir(run); const s = config().settings;
  let music = [];
  if (run.params.music) {
    const mdir = path.join(dir, "music"); ensureDir(mdir);
    music = ["bed-1.mp3", "bed-2.mp3"].map((f) => path.join(mdir, f)).filter((f) => fs.existsSync(f));
    if (!music.length) { try { await npx(["node", `"${path.join(__dirname, "..", "..", "scripts", "suno-gen.js")}"`, "--out", `"${mdir}"`, "--name", "bed", "--title", "Paper Doc", "--style", `"${s.musicStyle}"`, "--machine", `"${MACHINE_NAME}"`], null, { cwd: path.join(__dirname, "..", "..") }); addCost(run, "music", PRICES.music, "kie", "Suno"); music = ["bed-1.mp3", "bed-2.mp3"].map((f) => path.join(mdir, f)).filter((f) => fs.existsSync(f)); } catch (e) { log(run, "musique : " + e.message.slice(0, 160)); } }
  }
  const out = path.join(dir, "final.mp4");
  const m = mixer.mix(dir, run.render.file, out, { music, mvol: run.params.musicVolume ?? s.musicVolume });
  const lc = mixer.listenCheck(out, dir, run.params.lang);
  run.output = { file: out, rel: `agent-os/output/machines/${run.id}/final.mp4`, lufs: m.lufs, seconds: m.total, listen: lc };
  log(run, `🎧 Mix ${m.lufs} LUFS · contrôle d'écoute ${lc.ok ? "OK" : "ÉCHEC"} : ${lc.checks.map((c) => `${c.id} ${Math.round(c.match * 100)} %`).join(" · ")}`);
  if (!lc.ok) throw new Error("contrôle d'écoute : la voix n'est pas reconnue dans la vidéo finale");
}

// ---------------------------------------------------------------- 8. packaging
const FAIR_USE = { fr: "Avertissement droits d'auteur : en vertu de l'article 107 du Copyright Act de 1976, une tolérance est accordée à « l'usage loyal » (fair use) à des fins de critique, de commentaire, d'information, d'enseignement et de recherche. Les extraits utilisés le sont dans ce cadre ; tous les droits appartiennent à leurs auteurs.", en: "Copyright Disclaimer under Section 107 of the Copyright Act 1976: allowance is made for \"fair use\" for purposes such as criticism, comment, news reporting, teaching, scholarship, and research. All rights belong to their respective owners." };
function mmss(t) { const s = Math.max(0, Math.floor(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function capTags(tags, max = 480) { const out = []; let len = 0; for (const t of Array.isArray(tags) ? tags : String(tags || "").split(",")) { const x = String(t).replace(/[<>#]/g, "").trim(); if (!x || out.some((o) => o.toLowerCase() === x.toLowerCase())) continue; const add = x.length + (x.includes(" ") ? 2 : 0) + (out.length ? 1 : 0); if (len + add > max) break; out.push(x); len += add; } return out; }
function nicheTitles(limit = 40) {
  const out = [];
  try { const bank = readJSON("bank/niches.json", {}); const niche = (Array.isArray(bank) ? bank : bank.niches || []).find((n) => /docu animaux/i.test(n.name || "")); for (const ch of (niche && niche.channels) || []) { const c = readJSON(`lab/channels/${ch.channelId || ch.id}.json`, null); for (const v of (c && c.videos) || []) out.push({ title: v.title, views: v.views }); } } catch {}
  if (!out.length) try { out.push(...require("./docu2d-niche.json").titles); } catch {}
  return out.sort((a, b) => b.views - a.views).slice(0, limit);
}
function descriptionBlocks(run) {
  const dir = runDir(run); const L = run.params.lang === "fr";
  const tl = jsonOf(path.join(dir, "timeline.json")); const sb = jsonOf(path.join(dir, "storyboard.json"));
  const credits = jsonOf(path.join(dir, "broll", "credits.json"), {});
  const lineStart = (id) => (tl.lines.find((l) => l.id === id) || {}).start || 0;
  const chapters = [{ t: 0, label: L ? "Introduction" : "Intro" }];
  for (const b of sb.beats.filter((x) => x.type === "chapter")) { const t = Math.floor(lineStart(b.line)); if (t - chapters[chapters.length - 1].t >= 10) chapters.push({ t, label: `${L ? "Question" : "Question"} ${b.n} · ${(sb.chapters[b.n - 1] || {}).title || ""}` }); }
  const facts = [...new Map((run.facts || []).filter((f) => f.src).map((f) => [f.src, f])).keys()];
  const imgs = Object.values(credits).map((c) => c.src === "ai" ? (L ? "Illustration générée par IA" : "AI-generated illustration") : `${c.src === "pexels" ? "Pexels" : c.src === "pixabay" ? "Pixabay" : c.src === "commons" ? "Wikimedia Commons" : c.src}${c.author ? ` — ${c.author}` : ""}${c.license ? ` (${c.license})` : ""}${c.page ? ` ${c.page}` : ""}`);
  const fair = Object.values(credits).some((c) => c.src === "fairuse");
  return { chapters: chapters.map((c) => `${mmss(c.t)} ${c.label}`), facts, imgs: [...new Set(imgs)], fair, L };
}
async function stepPackage(run) {
  const B = descriptionBlocks(run);
  const lang = LANGS[run.params.lang] || run.params.lang;
  const p = await askJson([
    `Packaging YouTube (${lang}) d'un documentaire animalier papier découpé. Titre de travail : « ${run.script.title} ». Sujet : ${run.params.subject}. Angle : ${run.meta.angle}.`,
    "- title : formule de la niche, 45-80 caractères, sans emoji ni majuscules criardes (« Pourquoi [créature] [paradoxe] », « Le [animal] le plus [x] du monde », « J'ai lâché [créature] dans [N] [mondes] ») ;",
    "- hook : 2 phrases de description qui donnent envie (le fait le plus fort de la vidéo, sans rien inventer) ;",
    "- tags : 18-28 tags du plus précis au plus large ; - thumbText : 2 ou 3 mots MAX en majuscules pour la miniature ; - titleAlt : 2 titres alternatifs.",
    `FAITS DE LA VIDÉO : ${JSON.stringify((run.facts || []).slice(0, 25).map((f) => f.claim))}`,
    `TITRES QUI MARCHENT DANS LA NICHE (codes à réutiliser, jamais copier) : ${JSON.stringify(nicheTitles(30).map((v) => `${v.title} (${v.views})`))}`,
    'JSON UNIQUEMENT : {"title":"","hook":"","tags":[""],"thumbText":"","titleAlt":["",""]}',
  ].join("\n"), "Packaging");
  addCost(run, "llm", 0.01, "openrouter", "packaging");
  const brand = config().settings.brand;
  const desc = [p.hook || "", "", B.L ? "Chapitres" : "Chapters", ...B.chapters, "", B.L ? "Sources des faits" : "Fact sources", ...B.facts.map((u) => `• ${u}`),
    "", B.L ? "Sources des images" : "Image sources", ...B.imgs.map((x) => `• ${x}`), B.L ? "Les animaux des plans d'illustration ne sont pas forcément ceux de l'histoire racontée." : "Illustration footage may show other individuals than the ones in the story.",
    ...(B.fair ? ["", FAIR_USE[run.params.lang] || FAIR_USE.en] : []),
    "", `${B.L ? "Animation, voix et musique" : "Animation, voice and music"} : ${brand}.`].join("\n");
  run.pack = { title: String(p.title || run.script.title).replace(/["«»]/g, "").slice(0, 100), titleAlt: p.titleAlt || [], description: desc, tags: capTags(p.tags || []), thumbText: String(p.thumbText || "").slice(0, 30), chapters: B.chapters,
    thumbRel: run.thumb ? `agent-os/output/machines/${run.id}/thumb.png` : null, thumbTs: Date.now() };
  // miniature : l'espèce gueule ouverte + 2-3 mots (après le packaging, qui fournit le texte)
  try { const th = path.join(runDir(run), "thumb.png"); const pf = path.join(PUB_DIR, run.id, "thumb-props.json"); fs.writeFileSync(pf, JSON.stringify({ ...jsonOf(path.join(PUB_DIR, run.id, "props.json")), thumbText: run.pack.thumbText }));
    await npx(["remotion", "still", run.bundle, "Docu2DThumb", `"${th}"`, `--props="${pf}"`]); run.pack.thumbRel = `agent-os/output/machines/${run.id}/thumb.png`; run.pack.thumbTs = Date.now(); } catch (e) { log(run, "miniature : " + e.message.slice(0, 160)); }
  run.finalRel = run.output.rel;
  fs.writeFileSync(path.join(runDir(run), "youtube.txt"), `${run.pack.title}\n\n${run.pack.description}\n\nTAGS: ${run.pack.tags.join(", ")}\n`);
  addToStock(run);
  log(run, "📦 Packaging prêt (titre, description : chapitres + sources des faits et des images, tags) — vidéo ajoutée au stock");
  if (run.params.publishChannelId) { try { const pub = await publishRun(run.id, {}, run); log(run, `📤 Publiée : ${pub.url} (${pub.privacyStatus})`); } catch (e) { log(run, "⚠ Publication échouée : " + e.message); } }
}
function saveTexts(runId, { title, description, tags } = {}) { const run = getRun(runId); if (!run || !run.pack) throw new Error("Pas encore de packaging"); if (title !== undefined) run.pack.title = String(title).slice(0, 100); if (description !== undefined) run.pack.description = String(description); if (tags !== undefined) run.pack.tags = capTags(tags); saveRun(run); syncStock(run); return run.pack; }

// ---------------------------------------------------------------- stock + publication
const STOCK_FILE = `machines/${MACHINE_ID}-stock.json`;
function stock() { return readJSON(STOCK_FILE, []); }
function patchStock(id, patch = {}) { const st = stock(); const e = st.find((x) => x.id === id || x.runId === id); if (!e) throw new Error("Entrée de stock introuvable"); for (const k of ["archived", "posted"]) if (patch[k] !== undefined) e[k] = !!patch[k]; writeJSON(STOCK_FILE, st); return e; }
const stockEntry = (run) => ({ id: run.id, runId: run.id, title: run.pack.title, description: run.pack.description, tags: run.pack.tags, finalRel: run.finalRel, thumbRel: run.pack.thumbRel, durationSec: run.output && run.output.seconds, cost: run.cost });
function addToStock(run) { const st = stock(); if (st.some((x) => x.id === run.id)) return syncStock(run); st.unshift({ ...stockEntry(run), createdAt: new Date().toISOString(), posted: false, archived: false }); writeJSON(STOCK_FILE, st); }
function syncStock(run) { const st = stock(); const e = st.find((x) => x.id === run.id); if (!e || !run.pack) return; Object.assign(e, stockEntry(run)); writeJSON(STOCK_FILE, st); }
async function publishRun(runId, { channelId, title, description, tags, privacyStatus } = {}, liveRun = null) {
  const google = require("../google");
  const run = liveRun || getRun(runId);
  if (!run.finalRel) throw new Error("Pas de vidéo à publier");
  const chan = channelId || run.params.publishChannelId; if (!chan) throw new Error("Choisis une chaîne");
  if (title !== undefined || description !== undefined || tags !== undefined) saveTexts(runId, { title, description, tags });
  const pk = (liveRun ? run.pack : getRun(runId).pack) || {};
  const priv = privacyStatus || run.params.publishPrivacy || "private";
  const vid = await google.youtubeUpload(chan, path.join(ROOT, run.finalRel), { title: pk.title.slice(0, 100), description: pk.description || "", tags: (pk.tags || []).slice(0, 60), privacyStatus: priv, categoryId: "27" });
  if (pk.thumbRel) { try { await google.youtubeSetThumbnail(chan, vid.id, path.join(ROOT, pk.thumbRel)); } catch (e) { log(run, "⚠ miniature : " + e.message); } }
  run.published = { videoId: vid.id, url: `https://youtu.be/${vid.id}`, at: new Date().toISOString(), privacyStatus: priv, channelId: chan };
  if (!liveRun) { const fresh = getRun(runId); fresh.published = run.published; saveRun(fresh); } else saveRun(run);
  try { patchStock(run.id, { posted: true }); } catch {}
  return run.published;
}

// ---------------------------------------------------------------- orchestration
const STEPS = [
  ["facts", stepFacts, (r) => r.facts && r.facts.length],
  ["script", stepScript, (r) => r.script && r.script.lines],
  ["voice", stepVoice, (r) => r.timeline && fs.existsSync(path.join(OUT_ROOT, r.id, "timeline.json"))],
  ["storyboard", stepStoryboard, (r) => !!r.storyboard],
  ["broll", stepBroll, (r) => r.check && !r.check.anomalies.length],
  ["render", stepRender, (r) => r.render && fs.existsSync(r.render.file)],
  ["mix", stepMix, (r) => r.output && r.output.listen && r.output.listen.ok],
  ["package", stepPackage, (r) => !!r.pack],
];
const SEMI_STOPS = ["script", "broll"]; // on valide le texte, puis le storyboard + plans (planche) avant le rendu
function createRun({ subject, family, durationMin, lang, voice: v, voiceId, realPct, aiImages, aiVideo, sources, music, musicVolume, mode, publishChannelId, publishPrivacy } = {}) {
  if (!subject || !String(subject).trim()) throw new Error("sujet manquant");
  requireStockKey();
  const s = config().settings;
  const id = "d2" + Date.now().toString(36);
  const run = { id, machineId: MACHINE_ID, createdAt: new Date().toISOString(), status: "created", title: String(subject).trim(),
    params: { subject: String(subject).trim(), family: family || "auto", durationMin: Math.max(3, Math.min(30, Number(durationMin) || s.durationMin)), lang: LANGS[lang] ? lang : s.lang,
      voice: String(voiceId || v || s.voice).trim(), realPct: Math.max(0, Math.min(60, Number(realPct ?? s.realPct))), aiImages: !!(aiImages ?? s.aiImages), aiVideo: !!(aiVideo ?? s.aiVideo),
      sources: Array.isArray(sources) && sources.length ? sources : s.sources, music: music ?? s.music, musicVolume: musicVolume ?? s.musicVolume,
      mode: mode === "auto" ? "auto" : "semi", publishChannelId: publishChannelId || null, publishPrivacy: publishPrivacy || s.publishPrivacy },
    cost: {}, log: [], validated: {} };
  saveRun(run);
  return run;
}
async function advance(runId, { until } = {}) {
  if (live.has(runId)) throw new Error("run déjà en cours");
  live.add(runId);
  const run = getRun(runId); let task = null, inFlight = null; delete run.error;
  try { task = tasks.createTask({ title: `Docu Papier 2D — ${run.params.subject}`, desc: `${run.params.durationMin} min`, machine: MACHINE_NAME, machineId: MACHINE_ID, runId, kind: "machine", step: "Démarrage…", progress: 2, status: "running" }); } catch {}
  const ctl = { run, task, stop: null }; liveRuns.set(runId, ctl);
  try {
    for (let i = 0; i < STEPS.length; i++) {
      const [name, fn, done] = STEPS[i];
      if (cancelled.has(runId)) throw new Error(CANCEL_MSG);
      if (done(run)) { if (run.params.mode === "semi" && SEMI_STOPS.includes(name) && !(run.validated || {})[name]) { run.status = `${name}_ready`; break; } continue; }
      run.status = `${name}_running`; saveRun(run);
      try { if (task) tasks.updateTask(task.id, { step: name, progress: Math.round((100 * i) / STEPS.length) }); } catch {}
      inFlight = runScope.run(runId, () => fn(run, (pct) => { try { if (task && !cancelled.has(runId)) tasks.updateTask(task.id, { step: `rendu ${pct} %` }); } catch {} }));
      await Promise.race([inFlight, new Promise((_, reject) => { ctl.stop = () => reject(new Error(CANCEL_MSG)); })]);
      inFlight = null; ctl.stop = null;
      if (cancelled.has(runId)) throw new Error(CANCEL_MSG);
      run.status = `${name}_done`; saveRun(run);
      if (until === name) break;
      if (run.params.mode === "semi" && SEMI_STOPS.includes(name) && !(run.validated || {})[name]) { run.status = `${name}_ready`; break; }
    }
    if (run.pack && !/_ready$/.test(run.status)) { run.status = "done"; delete run.error; }
    saveRun(run);
    try { if (task) tasks.updateTask(task.id, run.status === "done" ? { status: "done", progress: 100, step: `Terminée — ${Math.floor(run.output.seconds / 60)} min ${Math.round(run.output.seconds % 60)} s` } : { status: "running", step: `En attente de validation (${run.status.replace("_ready", "")})` }); } catch {}
    return run;
  } catch (e) {
    const wc = cancelled.has(runId);
    log(run, "❌ " + (wc ? CANCEL_MSG : e.message));
    run.status = "failed"; run.error = wc ? CANCEL_MSG : e.message; saveRun(run);
    try { if (task) tasks.updateTask(task.id, { status: "failed", step: run.error.slice(0, 120) }); } catch {}
    throw e;
  } finally {
    liveRuns.delete(runId);
    const release = () => { live.delete(runId); cancelled.delete(runId); };
    if (inFlight) inFlight.catch(() => {}).then(release); else release();
  }
}
function validate(runId) { const run = getRun(runId); if (!/_ready$/.test(run.status || "")) throw new Error("Rien à valider à cette étape."); run.validated = { ...(run.validated || {}), [run.status.replace("_ready", "")]: true }; saveRun(run); return start(runId); }
function cancelRun(runId) {
  const run = getRun(runId);
  if (live.has(runId)) { cancelled.add(runId); for (const c of procs.get(runId) || []) killTree(c); const ctl = liveRuns.get(runId); if (ctl) { ctl.run.status = "failed"; ctl.run.error = CANCEL_MSG; log(ctl.run, "🛑 Run annulé"); if (ctl.stop) ctl.stop(); } return summary(getRun(runId)); }
  if (run.status !== "done") { run.status = "failed"; run.error = CANCEL_MSG; saveRun(run); }
  return summary(getRun(runId));
}
function resetFrom(run, step) {
  const order = STEPS.map((s) => s[0]); const i = order.indexOf(step); if (i < 0) throw new Error("étape inconnue");
  if (i <= 0) { delete run.facts; delete run.meta; delete run.story; }
  if (i <= 1) delete run.script;
  if (i <= 2) delete run.timeline;
  if (i <= 3) delete run.storyboard;
  if (i <= 4) delete run.check;
  if (i <= 5) { delete run.render; delete run.bundle; }
  if (i <= 6) delete run.output;
  delete run.pack; delete run.finalRel;
  if (run.validated) for (const k of order.slice(i)) delete run.validated[k];
  saveRun(run); return run;
}
function sweepRuns() { return 0; }
function strandedRuns() { return listRuns().filter((r) => /_running$/.test(r.status || "") && !live.has(r.id) && Date.now() - new Date(r.updatedAt || r.createdAt).getTime() > 20 * 60 * 1000).map((r) => ({ id: r.id, machine: MACHINE_NAME, machineId: MACHINE_ID, theme: r.params.subject, status: r.status })); }
function resumeRun(runId) { return start(runId); }
function summary(r) {
  return { id: r.id, createdAt: r.createdAt, status: r.status, error: r.error, subject: r.params.subject, title: (r.pack && r.pack.title) || (r.script && r.script.title) || r.params.subject, durationMin: r.params.durationMin,
    mode: r.params.mode, seconds: r.output && r.output.seconds, realPct: r.check && r.check.realPct, cost: +Object.values(r.cost || {}).reduce((a, b) => a + b, 0).toFixed(2), running: live.has(r.id) && !cancelled.has(r.id),
    published: r.published || null, thumb: r.pack && r.pack.thumbRel, last: (r.log || []).slice(-1)[0] };
}
function start(runId, from) {
  const run = getRun(runId); if (!run) throw new Error("run introuvable");
  if (live.has(runId)) throw new Error("run déjà en cours");
  if (from) resetFrom(run, from); else if (run.error || run.status === "failed") { delete run.error; saveRun(run); }
  advance(runId).catch(() => {});
  return summary(getRun(runId));
}

// ---------------------------------------------------------------- idées, estimation
function producedSubjects() { return [...listRuns().map((r) => r.params.subject), "hippopotame", "méduse-boîte"]; }
async function suggestTopics(n = 6, family = "auto") {
  const j = await askJson([
    `Propose EXACTEMENT ${n} sujets de documentaire animalier YouTube en papier découpé (niche Oceanverse / Depth Theory / Squidium), en français.`,
    family && family !== "auto" ? `Famille imposée : ${family}.` : "Pour l'instant : animaux TERRESTRES ou de rivière à quatre pattes (le bestiaire dessine : hippopotame, lion, éléphant, buffle, rhinocéros, crocodile).",
    "Chaque sujet = un animal + un PARADOXE ou une question forte (dangereux mais herbivore, minuscule mais mortel, record, mystère), avec une histoire vraie documentée possible pour l'accroche.",
    `Jamais un sujet déjà produit ni une variante proche : ${JSON.stringify(producedSubjects())}.`,
    `TITRES QUI MARCHENT : ${JSON.stringify(nicheTitles(30).map((v) => `${v.title} (${v.views} vues)`))}`,
    'JSON UNIQUEMENT : {"ideas":[{"subject":"l\'animal (nom courant)","family":"terrestre|rivière|…","title":"titre YouTube","why":"pourquoi ça marche (1 phrase)"}]}',
  ].join("\n"), "Idées");
  return j.ideas || [];
}
function estimate({ durationMin = 10, voice: v, aiImages, music = true } = {}) {
  const s = config().settings;
  const chars = Math.round(Number(durationMin) * 60 * 0.85 * speechWpm(v || s.voice, s) / 60 * 5.9);
  const voiceUsd = (chars / 1000) * PRICES.elevenPer1kChars;
  const total = voiceUsd + (music ? PRICES.music : 0) + PRICES.llm + (aiImages ? 3 * PRICES.aiImage : 0);
  return { chars, usd: +total.toFixed(2), detail: { voice: +voiceUsd.toFixed(2), music: music ? PRICES.music : 0, llm: PRICES.llm, ai: aiImages ? 3 * PRICES.aiImage : 0 }, wpm: speechWpm(v || s.voice, s), renderMin: Math.round(Number(durationMin) * 4.5) }; // mesuré : hippopotame 10 min → ≈ 50 min de rendu (6 en parallèle, PC chargé)
}
async function suggestThemes(count = 1) { const ideas = await suggestTopics(Math.min(Math.max(Number(count) || 1, 1), 8)); return ideas.map((i) => ({ title: i.title, text: i.subject, pitch: i.why })); }
async function orderRun({ publishChannelId, publishPrivacy, publish, overrides, theme } = {}) {
  const last = listRuns()[0]; const base = { ...((last && last.params) || {}), ...(overrides || {}) };
  const subject = theme ? (typeof theme === "string" ? theme : theme.text || theme.title) : (await suggestThemes(1))[0].text;
  const r = createRun({ ...base, subject, mode: "auto", publishChannelId: publish ? publishChannelId : null, publishPrivacy: publishPrivacy || "private" });
  start(r.id); return r;
}

module.exports = {
  MACHINE_ID, MACHINE_NAME, DEFAULTS, LANGS, ELEVEN_VOICES, SPECIES_OK, config, patchConfig, listRuns, getRun, saveRun, createRun, advance, resetFrom, sweepRuns, strandedRuns,
  suggestTopics, suggestThemes, orderRun, estimate, summary, start, resumeRun, validate, cancelRun, isLive: (id) => live.has(id), stockKeys, voices, descriptionBlocks,
  stock, patchStock, publishRun, saveTexts,
};
