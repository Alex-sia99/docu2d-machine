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
  realPct: 40,            // part PLEIN ÉCRAN visée (plans réels libres + images IA) ; le reste = motion design papier — mesurée après coup
  aiImages: true,         // images IA plein écran pour ce qu'aucun plan libre ne montre (autorisées par Alex le 27/11 soir)
  aiVideo: false,         // anime les images IA (Kie grok i2v, 6 s) — coûteux, non par défaut
  fairUse: false,         // désactivé (décision d'Alex du 27/11) ; si un jour activé → mention légale auto dans la description
  sources: ["pexels", "pixabay", "commons"],
  music: true, musicVolume: 0.14,
  musicStyle: "instrumental documentary underscore, warm nature ambience, soft marimba and kalimba, light hand percussion, low strings, gentle suspense, curious and calm, no vocals, 85 bpm",
  mode: "semi", publishPrivacy: "private", brand: "Ma chaîne",
  pace: {}, // mots / min de PAROLE mesurés (hors pauses) — mis à jour à chaque run
};
const PRICES = { elevenPer1kChars: 0.15, music: 0.06, llm: 0.08, aiImage: 0.03, aiVideo: 0.15, thumb: 0.03, vision: 0.002 };
// images IA : GPT Image 2.5 (même modèle que Data Ranking, 1K éco) ; vidéo IA : grok i2v 6 s 720p
const KIE_IMG = { t2i: "gpt-image-2-5-flare-text-to-image", i2i: "gpt-image-2-5-flare-image-to-image", field: "input_urls" };
const KIE_VIDEO = "grok-imagine-video-1-5-preview";
const NICHE_NAME = /docu animaux 2d/i;
const SPECIES_OK = ["hippo", "lion", "elephant", "buffalo", "rhino", "crocodile", "hyena"];

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
  const nQ = run.params.durationMin <= 1.5 ? 2 : run.params.durationMin <= 4 ? 3 : 5; const short = run.params.durationMin <= 1.5;
  const gold = goldScript();
  const ex = gold ? ["Chapitres : " + gold.chapters.map((c) => c.title).join(" · "), ...gold.lines.filter((l) => ["hook", "promise"].includes(l.scene) || ["l10", "l11", "l12", "l13"].includes(l.id)).map((l) => `${l.id} [${l.scene}] ${l.text}`)].join("\n") : "";
  let best = null;
  for (let a = 1; a <= 3; a++) {
    const j = await askJson([
      `Écris la voix off d'un documentaire YouTube papier découpé de ${run.params.durationMin} min sur « ${run.params.subject} », en ${LANGS[run.params.lang] || run.params.lang}.`,
      `LONGUEUR : EXACTEMENT ${Math.round(target * 0.97)} à ${Math.round(target * 1.03)} mots au total (débit mesuré de la voix : ${wpm} mots/min).`,
      "STRUCTURE (recette mesurée sur la niche Oceanverse / Depth Theory) :",
      short ? `- hook : 2 répliques à la DEUXIÈME personne (« Vous… ») + le paradoxe ;` : "- hook : 6-8 répliques à la DEUXIÈME personne (« Vous… ») qui plongent dans l'histoire vraie du registre, cliffhanger, puis le paradoxe ;",
      short ? `- promise : la question-titre en UNE réplique ;` : `- promise : la question-titre + le sommaire des ${nQ} questions (une phrase par question) ;`,
      `- q1 … q${nQ} : chaque chapitre commence par « Question numéro N : … ? » puis ${short ? "2-3" : "5-9"} répliques de faits du registre, concrets et chiffrés ;`,
      short ? "- (pas de cta au milieu : la vidéo est trop courte)" : "- cta : UNE réplique au milieu (après q2) : like + abonnement + « la suite est encore plus étrange » ;",
      `- end : ${short ? "1-2 répliques" : "2-3 répliques de conseils concrets ou de perspective, retour à l'histoire de l'accroche,"} question finale + « Dites-le moi en commentaire » + abonnement.`,
      "ZÉRO INVENTION : aucun événement, aucune action, aucune conséquence, aucun conseil qui ne soit dans le registre. Si l'histoire ne contient pas de danger, on ne lui en invente pas : l'accroche devient une scène IMAGINÉE au présent (« Imaginez : vous… ») où seuls des faits du registre arrivent. Jamais de remplissage : chaque réplique apporte une information nouvelle (pas d'adjectifs répétés, pas de « africain » à chaque phrase). Les ${nQ} chapitres sont des QUESTIONS DE CURIOSITÉ fortes (bon : « Pourquoi même les lions l'évitent ? », « Avec quelles armes ? » ; mauvais : « Le poids maximal », « La consommation quotidienne »). Si le registre est trop mince pour la longueur demandée, écris PLUS COURT plutôt que de broder.",
      "ANGLE (niche « Docu Animaux » : Depth Theory, Oceanverse) : ce qui rend l'animal IMPRESSIONNANT ou DANGEREUX pour un humain qui le croiserait — sa force, ses armes, sa vitesse, ses attaques documentées, ce qu'il faut faire face à lui — pris dans le registre. Les anecdotes de biologie (moustaches, variantes de couleur) seulement si elles servent cet angle.",
      "TITRE : formule de la niche, clair et concret (bon : « Pourquoi vous ne voudriez jamais croiser un lion », « Ce que le lion fait vraiment la nuit » ; mauvais : « Pourquoi ce carnivore vulnérable cache des secrets si fragiles ? »).",
      "LANGUE : orthographe et typographie irréprochables (apostrophes, accents, termes scientifiques exacts : « leucisme »), phrases naturelles qu'un narrateur dirait vraiment, aucune tournure traduite mot à mot.",
      "RÈGLES : uniquement les faits du registre (jamais de chiffre inventé) ; un fait « uncertain » est présenté avec prudence (« on cite souvent… personne ne l'a vraiment compté ») ; répliques de 15 à 40 mots ; phrases orales, simples, rythmées ; aucune parenthèse ; nombres écrits en lettres quand ils sont courts ; pas de « venimeux » pour un animal qui ne l'est pas.",
      ex ? `EXEMPLE DE TON ET DE RYTHME (vidéo de référence, ne pas copier le contenu) :\n${ex}` : "",
      `REGISTRE DES FAITS :\n${JSON.stringify(run.facts)}\nHISTOIRE : ${JSON.stringify(run.story)}`,
      'JSON UNIQUEMENT : {"title":"titre-question accrocheur","chapters":[{"title":"","icon":"skull|tooth|shield|eye|globe|sun|water|baby|speed|weight|warning|grass|moon"}],"lines":[{"id":"l01","scene":"hook|promise|q1|q2|cta|q3|q4|q5|end","pause":0.7,"text":""}]}',
    ].filter(Boolean).join("\n"), "Script");
    const lines = (j.lines || []).filter((l) => l && l.text).map((l, i) => ({ id: `l${String(i + 1).padStart(2, "0")}`, scene: l.scene || "q1", pause: /^q\d$/.test(l.scene) && /^(question|question number|pregunta|frage)/i.test(l.text) ? 1.2 : Number(l.pause) || 0.7, text: String(l.text).replace(/\s+/g, " ").trim() }));
    const n = lines.reduce((x, l) => x + words(l.text), 0);
    const cand = { title: j.title || run.params.subject, chapters: (j.chapters || []).slice(0, nQ), lines, n };
    if (!best || Math.abs(n - target) < Math.abs(best.n - target)) best = cand;
    log(run, `📝 Script essai ${a} : ${lines.length} répliques, ${n} mots (cible ${target})`);
    if (Math.abs(n - target) / target <= 0.08 && cand.chapters.length === nQ) break;
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
  const outro = run.params.durationMin <= 2 ? 2.5 : run.params.durationMin <= 5 ? 5 : 9;
  const k = voice.pauseForTarget(dir, script, run.params.durationMin * 60, { outro });
  const tl = voice.tighten(dir, script, { pause: k, outro });
  const speech = tl.lines.reduce((a, l) => a + l.dur, 0); const w = script.lines.reduce((a, l) => a + words(l.text), 0);
  const wpm = Math.round((w / speech) * 60);
  patchConfig({ settings: { pace: { ...config().settings.pace, [run.params.voice]: wpm } } });
  run.timeline = { total: tl.total, lines: tl.lines.length, wpm, pause: k };
  try { mixer.voiceFull(dir, path.join(dir, "voice-full.mp3")); run.voiceRel = `agent-os/output/machines/${run.id}/voice-full.mp3`; } catch (e) { log(run, "voix complète : " + e.message.slice(0, 100)); }
  log(run, `🎙 Voix : ${Math.floor(tl.total / 60)} min ${Math.round(tl.total % 60)} s · débit ${wpm} mots/min · pauses ×${k}`);
}

// ---------------------------------------------------------------- 4. storyboard (+ vérificateur)
const BEAT_DOC = (hero, aquatic, ai) => `TYPES DE BEATS (ancrés sur un MOT de la réplique : "line" + "at" ; optionnel "until"/"untilLine") :
CARTES (une seule à la fois, elle coupe la précédente ; elle doit rester LISIBLE : ≥ 2,5 s et ≥ 1,2 s + 0,05 s par caractère affiché — en pratique UNE carte par réplique au plus, ancrée tôt dans la réplique) :
- title {text, sub} · toc {items:[{at}×5]} (sommaire) · chapter {n} (« Question n ») · end {text} (DERNIÈRE réplique : question en commentaire + J'aime/S'abonner)
- bignum {n, unit, sub, icon} (≤ 20 % des cartes, jamais 3 cartes du même type à la suite) · compare {items:[{who: human|child|car|<espèce>, label, value, at}]} (tailles réelles)
- bars {title, log:true|false, items:[{label, icon, value, display, at, line?, hi?}]} · map {focus:"ISO3" ou [lon,lat], zoom0, zoom, highlight:["ISO3"], names?:["ISO3" SEULEMENT si le pays est cité], pins:[{lonlat:[lon,lat], label, at}]}
- anatomy {species, gape (°), gapeAt, labels:[{part: canine|incisor|eye|ear|nostril|lips|skin|leg|belly, text, at, side: left|right|bottom}]}
- timeline {items:[{year, text, at, line?}] — au moins 3 dates} · quote {text} · icons {title, items:[{icon, label, at, no?, ok?}]}
- broll {asset:"nom_court", query:"3 à 6 mots ANGLAIS d'un plan réel filmable", hero:true|false} — PLAN RÉEL PLEIN ÉCRAN (libre de droits, vérifié par la vision). PAS SEULEMENT l'espèce : tout ce que la voix évoque et qui se filme — un pêcheur sur une pirogue, un village au bord d'un fleuve, un fleuve au coucher du soleil, des touristes en safari, un autre animal cité. hero:true si le plan doit montrer l'espèce du sujet (espèce EXACTE vérifiée), false sinon. Un plan dure 4 à 8 s (untilLine pour prolonger).${ai ? `
- broll {asset:"nom_court", ai:"PROMPT ANGLAIS 50-110 mots"} — IMAGE IA PLEIN ÉCRAN, photo-réaliste, pour ce qu'AUCUN plan libre ne peut montrer : une attaque, un moment précis de l'histoire racontée, un comportement rare, une scène sous l'eau, un détail anatomique en situation. Décris la scène, la lumière, le cadrage ; espèce exacte nommée ; jamais une personne réelle identifiable, jamais de sang excessif.` : ""}
ÉTIQUETTES : tag {text (≤ 34 car.), sub?, kind: white|orange|yellow|green} ; ≥ 1,8 s visibles ; elles NOMMENT ce qu'on voit, jamais au hasard.
MONDE (plan-séquence dessiné) : world {preset, spot?, night?, events?:[{do, at, line?}]} — JAMAIS deux fois le même preset à la suite, aucun preset > 35 % du temps du monde :
  presets pour toute espèce : wide (vue d'ensemble) · herd (troupeau ${aquatic ? "dans l'eau" : "dans la plaine"}) · cross (l'animal traverse le cadre) · drink (boit au bord de l'eau) · portrait (gros plan de la tête) · graze (broute ; night 0.5 = crépuscule) · charge (events go) · calf (mère + petit) · night (events return, man, gape : un humain entre l'animal et l'eau)
  ${aquatic ? "presets aquatiques (" + hero + ") : gape (gueule ouverte, events open) · under (marche au fond, events breathe) · sleep · nurse (petit qui tète sous l'eau) · canoe (events surface, flip, rush, dark ; solo:true = un seul canoë)" : "AUCUNE scène aquatique pour cette espèce (jamais dans la rivière)."}${hero === "hippo" ? " · sweat (sueur rouge, events sweat)" : ""}
CTA : cta {like:"mot", sub:"mot"} (une fois, au milieu).
ICÔNES — une icône doit REPRÉSENTER le mot (sinon pas d'icône) : skull=mort/victimes · tooth=dent/morsure · tusk=défense · shield=défense/protection · eye=vue/secret · globe=monde/pays/villages · sun=soleil/UV · moon=nuit · whale=baleine/cétacé · weight=poids · speed=vitesse · canoe=bateau/pêcheur · warning=danger · grass=herbe/brouter · bacteria=bactérie · ruler=distance/longueur · water=eau/rivière · hospital=médical · phone=déclaré/signalé · syringe=stérilisation/vaccin · lungs=respiration · bandage=blessure · mosquito · fin=requin · snake · pig · elephant · manatee=lamantin · money=argent/coût · calendar=date · stopwatch=durée · heart=cœur · brain=intelligence · dna=ADN/ancêtre/cousin · person=humain/habitant · baby=bébé HUMAIN uniquement.
ANIMAUX : tout animal du bestiaire s'illustre par icon "animal:<espèce>" (hippo, lion, elephant, buffalo, rhino, crocodile, hyena) ou "animal:<espèce>:petit" pour un petit. Un animal absent du bestiaire et des icônes = PAS d'icône (texte seul), jamais une icône voisine.
DIT = MONTRÉ : ce qui est montré à un instant correspond à ce que dit la voix à cet instant ; un animal, un lieu, un objet cité et illustré l'est correctement ; une carte du monde ne nomme que les pays cités.`;
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
/** Réparation automatique des anomalies que le LLM n'a pas corrigées (ou que la passe critique a introduites). */
const PRESET_NEAR = { attack: "charge", charging: "charge", run: "charge", tracking: "cross", walk: "cross", walking: "cross", close: "portrait", closeup: "portrait", low: "portrait", head: "portrait", water: "drink", river: "herd", group: "herd", sleep: "graze", rest: "graze", eat: "graze", eating: "graze", baby: "calf", young: "calf" };
function autoFix(sb, tl, issues) {
  let n = 0; const ids = tl.lines.map((l) => l.id);
  const next = (id) => ids[Math.min(ids.length - 1, ids.indexOf(id) + 1)];
  for (const i of issues) {
    let m;
    if (i.rule === "preset" && (m = /« (.+?) » \((l[\w]+)\)/.exec(i.msg))) {
      for (const b of sb.beats) if ((b.type === "world" || b.type === "scene") && b.preset === m[1] && b.line === m[2]) { b.preset = PRESET_NEAR[m[1]] || "wide"; delete b.spot; n++; }
    } else if (i.rule === "lecture" && (m = /^carte (\w+) \((l[\w]+)\)/.exec(i.msg))) {
      const b = sb.beats.find((x) => x.type === m[1] && x.line === m[2]);
      if (b && !b.untilLine) { b.untilLine = next(b.line); delete b.until; n++; } else if (b) { sb.beats.splice(sb.beats.indexOf(b), 1); n++; }
    } else if (i.rule === "lecture" && (m = /^étiquette « (.+?) »/.exec(i.msg))) {
      const k = sb.beats.findIndex((x) => x.type === "tag" && x.text === m[1]); if (k >= 0) { sb.beats.splice(k, 1); n++; }
    } else if (i.rule === "icône" && (m = /icône « (.+?) »/.exec(i.msg))) {
      for (const b of sb.beats) { if (b.icon === m[1]) { delete b.icon; n++; } for (const it of b.items || []) if (it.icon === m[1]) { delete it.icon; n++; } }
    } else if (i.rule === "ancrage" && (m = /beat (\d+)/.exec(i.msg))) { sb.beats[Number(m[1])] = null; n++; }
  }
  sb.beats = sb.beats.filter(Boolean);
  return n;
}
async function stepStoryboard(run) {
  const dir = runDir(run);
  const tl = jsonOf(path.join(dir, "timeline.json")); const script = jsonOf(path.join(dir, "script.json"));
  const gold = jsonOf(path.join(GOLD, "storyboard.json"));
  const lines = tl.lines.map((l) => `${l.id} [${l.scene}] (${l.dur.toFixed(1)} s) ${l.text}`).join("\n");
  const nBroll = Math.max(3, Math.ceil((tl.total * (run.params.realPct / 100)) / 5.5));
  const nAi = run.params.aiImages ? Math.max(1, Math.round(nBroll / 3)) : 0;
  let sb = null, issues = [];
  for (let a = 1; a <= 4; a++) {
    const prompt = a === 1 || !sb ? [
      `Écris le STORYBOARD JSON d'une vidéo papier découpé (${Math.round(tl.total)} s) : chaque réplique reçoit 1 à 3 beats qui ILLUSTRENT exactement ce qui est dit, au mot près.`,
      BEAT_DOC(run.meta.hero, ["hippo", "crocodile"].includes(run.meta.hero), run.params.aiImages),
      `RÈGLES : premier beat = world (preset adapté à l'accroche) ; un chapter au début de chaque « Question numéro N » ; toc sur la réplique du sommaire ; title sur la question-titre ; un cta sur la réplique cta ; end sur la dernière réplique ; au plus UNE carte par réplique ; environ un beat toutes les 6 s (mesure de la niche) ; EXACTEMENT ${nBroll} beats broll PLEIN ÉCRAN (part visée : ${run.params.realPct} % du temps)${nAi ? `, dont ${nAi} images IA (champ ai) et ${nBroll - nAi} plans réels (champ query)` : " (plans réels, champ query)"}, répartis sur toute la vidéo, chacun sur la réplique qu'il illustre mot pour mot (une pirogue quand on parle de pirogue, un village quand on parle d'habitants) ; alterner cartes et monde (≈ 45 % du temps en cartes) ; un beat world différent du précédent à chaque retour au monde ; chiffres du script = chiffres des cartes ; "at" = un mot EXACT de la réplique.`,
      `Espèce dessinée : ${run.meta.hero}. Monde : savane (plaine, berge, rivière avec troupeau).`,
      gold ? `EXEMPLE (vidéo de référence, extrait) : ${JSON.stringify({ chapters: gold.chapters, beats: gold.beats.slice(0, 40) })}` : "",
      `RÉPLIQUES :\n${lines}`,
      `JSON UNIQUEMENT : {"meta":{"title":"${(script.title || "").replace(/"/g, "'")}","lang":"${run.params.lang}","world":"savane","hero":"${run.meta.hero}","family":"${run.meta.family}"},"chapters":${JSON.stringify(script.chapters)},"beats":[…]}`,
    ].filter(Boolean).join("\n\n") : [
      "Corrige ce storyboard : le vérificateur a trouvé ces anomalies. Corrige UNIQUEMENT ce qui est signalé (mot d'ancrage exact ; étiquette trop longue → raccourcir ; lecture trop courte → ancrer la carte plus tôt, la prolonger avec untilLine, ou la retirer ; icône qui ne représente pas le mot → icône juste, animal:<espèce>, ou aucune icône ; variété → changer le preset du monde ou le type de carte ; encombrement → retirer une étiquette).",
      `ANOMALIES :\n${issues.map((i) => `- [${i.rule}] ${i.msg}`).join("\n")}`,
      `RÉPLIQUES :\n${lines}`,
      `STORYBOARD ACTUEL :\n${JSON.stringify(sb)}`,
      "JSON UNIQUEMENT : le storyboard complet corrigé, même format.",
    ].join("\n\n");
    const j = await askJson(prompt, `Storyboard ${a}`);
    if (!Array.isArray(j.beats) || !j.beats.length) continue;
    sb = { meta: { ...j.meta, world: "savane", hero: run.meta.hero, lang: run.params.lang, title: script.title }, chapters: script.chapters, beats: j.beats };
    for (const b of sb.beats) if (b.type === "broll") { b.asset = String(b.asset || b.query || "plan").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24); if (b.ai && !run.params.aiImages) { if (!b.query) b.query = String(b.ai).split(/\s+/).slice(0, 5).join(" "); delete b.ai; } }
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
    // vérification sans plans (les broll seront remplis ensuite) : on stage avec des assets factices
    const fake = Object.fromEntries(sb.beats.filter((b) => b.type === "broll").map((b) => [b.asset, { file: "", kind: "video", credit: "" }]));
    ensureDir(path.join(PUB_DIR, run.id));
    fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify({ sb, tl, assets: fake, root: "" }));
    const chk = await d2check(run);
    issues = (chk.anomalies || []).filter((i) => i.rule !== "asset");
    run.storyWarnings = issues.filter((i) => i.rule === "variété").map((i) => i.msg);
    log(run, `🧩 Storyboard essai ${a} : ${sb.beats.length} beats · ${issues.length} anomalie(s)${issues.length ? " → correction" : ""}`);
    if (!issues.length) break;
  }
  addCost(run, "llm", 0.06, "openrouter", "storyboard");
  if (!sb) throw new Error("storyboard illisible");
  // PASSE CRITIQUE (R9) : chaque beat confronté à SA réplique — ce qui est montré correspond-il à ce qui est dit ?
  try {
    const byLine = Object.fromEntries(tl.lines.map((l) => [l.id, l.text]));
    const rv = await askJson([
      "Tu es le directeur artistique d'un documentaire animalier. Pour chaque beat visuel ci-dessous, vérifie qu'il montre EXACTEMENT ce que dit sa réplique : bonne espèce, bon objet, icône qui représente vraiment le mot (pas un bébé humain pour un petit animal, pas un bouclier pour un nombre), aucune carte qui nomme un pays non cité, aucun animal cité dans une liste sans son illustration juste, aucune scène du monde en contradiction (animal terrestre dans l'eau, scène de nuit sur une phrase de jour…).",
      "Corrige les beats fautifs (même structure, mêmes ancrages) ou mets null pour retirer un beat qui ne peut pas être juste. N'invente rien que la réplique ne dit pas.",
      "ESPÈCE DESSINÉE : " + run.meta.hero + " ; icônes animales possibles : animal:hippo, animal:lion, animal:elephant, animal:buffalo, animal:rhino, animal:crocodile, animal:hyena (+ \":petit\").",
      "BEATS : " + JSON.stringify(sb.beats.map((b, i) => ({ i, ...b, replique: byLine[b.line] })).filter((b) => b.type !== "chapter" && b.type !== "toc")),
      'JSON UNIQUEMENT : {"fixes":[{"i":12,"beat":{...} ou null,"why":""}]}',
    ].join("\n"), "Critique du storyboard");
    let n = 0;
    for (const fx of Array.isArray(rv.fixes) ? rv.fixes : []) { if (!(fx.i >= 0 && fx.i < sb.beats.length)) continue; if (fx.beat === null) sb.beats[fx.i] = null; else if (fx.beat && fx.beat.type) { delete fx.beat.replique; delete fx.beat.i; sb.beats[fx.i] = fx.beat; } n++; }
    sb.beats = sb.beats.filter(Boolean);
    if (n) { fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1)); fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify({ sb, tl, assets: Object.fromEntries(sb.beats.filter((b) => b.type === "broll").map((b) => [b.asset, { file: "", kind: "video", credit: "" }])), root: "" })); const c2 = await d2check(run); issues = (c2.anomalies || []).filter((i) => i.rule !== "asset"); }
    log(run, `🎬 Critique du storyboard : ${n} beat(s) corrigé(s) ou retiré(s) pour que l'image dise ce que dit la voix`);
  } catch (e) { log(run, "critique : " + e.message.slice(0, 120)); }
  for (let k = 0; k < 3 && issues.filter((i) => i.rule !== "variété").length; k++) {
    const nfix = autoFix(sb, tl, issues); if (!nfix) break;
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
    fs.writeFileSync(path.join(PUB_DIR, run.id, "props.json"), JSON.stringify({ sb, tl, assets: Object.fromEntries(sb.beats.filter((b) => b.type === "broll").map((b) => [b.asset, { file: "", kind: "video", credit: "" }])), root: "" }));
    const c3 = await d2check(run); issues = (c3.anomalies || []).filter((i) => i.rule !== "asset");
    log(run, `🔧 Réparation automatique : ${nfix} correction(s) → ${issues.length} anomalie(s)`);
  }
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
async function fetchVerified(run, name, queries, srcs, used, bdir, rejected, heroShot = true) {
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
        const content = [{ type: "text", text: !heroShot ? [
          `Ces deux images viennent du même plan vidéo, prévu pour illustrer un documentaire animalier sur : ${run.params.subject}.`,
          `Plan attendu : « ${q} ».`,
          "- matches : true si on voit bien ce plan (les personnes, le lieu, l'objet ou l'animal décrits) ; un animal visible doit être celui décrit ;",
          "- real : true si c'est une vraie vidéo filmée (pas un dessin, une 3D, un écran, un texte incrusté, un logo) ;",
          "- ok : true si le plan convient à un documentaire sérieux (pas de mise en scène publicitaire, pas de selfie) ;",
          "- sharp : true si l'image est NETTE et le sujet bien visible et cadré (pas flou, pas coupé, pas caché par un premier plan) ;",
          'JSON UNIQUEMENT : {"species":"","ok":true,"real":true,"matches":false,"captive":false,"sharp":true,"scene":""}'].join("\n") : [
          `Ces deux images viennent du même plan vidéo, prévu pour illustrer un documentaire sur : ${run.params.subject} (${sp}).`,
          `Plan attendu : « ${q} ».`,
          `Titre / adresse de la vidéo chez la source (indice fiable sur l'espèce) : « ${(c.page || c.title || "").split("/").filter(Boolean).pop() || "inconnu"} ».`,
          `- species : l'animal principal que tu vois (nom courant + scientifique si possible) ;`,
          `- ok : true SEULEMENT si c'est exactement cette espèce (${sp}), pas une espèce voisine (ex. buffle d'eau asiatique ≠ buffle d'Afrique, éléphant d'Asie ≠ d'Afrique) ;`,
          `- real : true si c'est une vraie vidéo filmée (pas un dessin, une 3D, un écran, un texte) ;`,
          `- matches : true si la scène correspond au plan attendu${generic ? " (ici : n'importe quel plan naturel de l'espèce convient)" : ""} ;`,
          `- captive : true si on voit un zoo, une clôture, une cage, des humains qui la nourrissent, OU un enclos aménagé (rondins posés, sol nu entretenu, arbres d'un autre continent que l'habitat de l'espèce) ;`,
          "- sharp : true si l'image est NETTE et l'animal bien visible et cadré (pas flou, pas coupé, pas caché par un premier plan).",
          'JSON UNIQUEMENT : {"species":"","ok":false,"real":true,"matches":false,"captive":false,"sharp":true,"scene":""}'].join("\n") },
          ...frames.map((fp) => ({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + fs.readFileSync(fp).toString("base64") } }))];
        const v = await lab.askVision(content); addCost(run, "check", v.cost || 0.001, "openrouter", "vision b-roll");
        frames.forEach((fp) => { try { fs.unlinkSync(fp); } catch {} });
        const j = v.json || {};
        if (j.ok && j.real !== false && j.sharp !== false && (j.matches || generic) && !j.captive) return { c, q, seen: j.scene || j.species };
        rejected.add(c.id); try { fs.unlinkSync(out); } catch {}
        log(run, `👁 ${name} : ${c.src} ${c.id} refusé — ${j.species || "?"}${j.captive ? ", en captivité" : ""}${j.matches === false && !generic ? ", scène différente" : ""}${j.sharp === false ? ", flou / mal cadré" : ""}`);
      } catch (e) { rejected.add(c.id); try { fs.unlinkSync(raw); } catch {} log(run, `⚠ ${name} : ${c.id} — ${e.message.slice(0, 100)}`); }
    }
  }
  return null;
}
async function kieTask(model, input, timeoutMs = 8 * 60 * 1000) {
  const key = vault.get("kie"); if (!key) throw new Error("clé Kie absente (Paramètres → Coffre)");
  const r = await fetch("https://api.kie.ai/api/v1/jobs/createTask", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input }) }).then((x) => x.json());
  const id = r.data?.taskId; if (!id) throw new Error("Kie : " + (r.msg || "refus"));
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { await sleep(6000); checkCancel(); const q = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${id}`, { headers: { Authorization: `Bearer ${key}` } }).then((x) => x.json()).catch(() => ({})); if (q.data?.state === "success") return JSON.parse(q.data.resultJson).resultUrls[0]; if (q.data?.state === "fail") throw new Error("Kie : " + (q.data.failMsg || "échec")); }
  throw new Error("Kie : délai dépassé");
}
const AI_STYLE = "Photorealistic wildlife documentary still, National Geographic quality, natural light, rich detail, cinematic 16:9 composition, no text, no logo, no watermark, no frame.";
async function aiImage(run, prompt, file) {
  const url = await kieTask(KIE_IMG.t2i, { prompt: `${AI_STYLE} ${prompt} ${AI_STYLE}`, aspect_ratio: "16:9", resolution: "1K" });
  fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer())); addCost(run, "ai", PRICES.aiImage, "kie", "image IA");
  return file;
}
async function uploadPublic(name, absFile, mime = "image/jpeg") {
  const google = require("../google"); const up = await google.driveUpload(name, mime, fs.readFileSync(absFile));
  await google.ensurePublic(up.id).catch(() => {});
  return `https://drive.google.com/uc?export=download&id=${up.id}`;
}
/** Vidéo IA (option) : anime une image IA en 6 s (grok i2v 720p, sans parole) → .mp4 1280 px. */
async function aiAnimate(run, imgFile, prompt, outFile) {
  const url = await uploadPublic(`${run.id}-${path.basename(imgFile)}`, imgFile);
  const v = await kieTask(KIE_VIDEO, { prompt: `Subtle natural documentary motion, slow camera push-in. ${prompt} No talking, no text, no new objects.`, image_urls: [url], duration: 6, resolution: "720p", aspect_ratio: "16:9" }, 12 * 60 * 1000);
  const raw = outFile + ".raw"; fs.writeFileSync(raw, Buffer.from(await (await fetch(v)).arrayBuffer()));
  require("child_process").execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-an", "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-crf", "22", "-preset", "veryfast", "-pix_fmt", "yuv420p", outFile]); try { fs.unlinkSync(raw); } catch {}
  addCost(run, "ai", PRICES.aiVideo, "kie", "vidéo IA");
  return outFile;
}
async function stepBroll(run) {
  requireStockKey();
  const dir = runDir(run); const bdir = path.join(dir, "broll"); ensureDir(bdir);
  const sb = jsonOf(path.join(dir, "storyboard.json"));
  const credits = jsonOf(path.join(bdir, "credits.json"), {});
  const used = new Set(Object.values(credits).map((c) => c.id));
  const srcs = run.params.sources || config().settings.sources;
  // ouverture : un plan plein écran prévu sur la 1re réplique démarre dès le 1er mot (jamais 3 s de décor vide en accroche)
  { const tl0 = jsonOf(path.join(dir, "timeline.json")); const l1 = tl0.lines[0]; const w1 = l1 && l1.words && l1.words[0] && String(l1.words[0].w).replace(/[^\p{L}\p{N}'’-]/gu, "");
    const first = sb.beats.find((b) => b.type === "broll" && l1 && b.line === l1.id); if (first && w1) first.at = w1; }
  // appel à l'action : jamais au milieu d'une vidéo courte (l'écran de fin le porte), jamais sur la réplique d'une carte « Question » (surcharge)
  { const chapLines = new Set(sb.beats.filter((b) => b.type === "chapter").map((b) => b.line)); const n0 = sb.beats.length;
    sb.beats = sb.beats.filter((b) => b.type !== "cta" || (run.params.durationMin > 2 && !chapLines.has(b.line))); if (sb.beats.length < n0) log(run, `✂ appel à l'action du milieu retiré (${run.params.durationMin <= 2 ? "vidéo courte" : "même réplique qu'une question"})`); }
  const names = [...new Set(sb.beats.filter((b) => b.type === "broll").map((b) => b.asset))];
  let ok = 0, ai = 0, dropped = 0; const rejected = new Set();
  // 1) IMAGES IA en parallèle (4 à la fois) — un échec retombe sur la recherche d'un plan réel
  const aiBeats = names.map((n) => sb.beats.find((b) => b.asset === n)).filter((b) => b.ai && run.params.aiImages && !fs.existsSync(path.join(bdir, `${b.asset}.jpg`)) && !fs.existsSync(path.join(bdir, `${b.asset}.mp4`)));
  if (aiBeats.length) log(run, `🎨 ${aiBeats.length} image(s) IA plein écran (GPT Image 2.5, 1K)…`);
  for (let i = 0; i < aiBeats.length; i += 4) {
    await Promise.all(aiBeats.slice(i, i + 4).map(async (b) => {
      try {
        const img = await aiImage(run, b.ai, path.join(bdir, `${b.asset}.jpg`));
        credits[b.asset] = { id: `ai-${b.asset}`, src: "ai", author: "", license: "image générée par IA", page: "", prompt: b.ai };
        if (run.params.aiVideo) { try { await aiAnimate(run, img, b.ai, path.join(bdir, `${b.asset}.mp4`)); fs.renameSync(img, path.join(bdir, `${b.asset}-still.jpg`)); credits[b.asset].license = "vidéo générée par IA"; } catch (e) { log(run, `⚠ vidéo IA ${b.asset} : ${e.message.slice(0, 100)} — image fixe gardée`); } }
        log(run, `🎨 ${b.asset} : image IA prête`);
      } catch (e) { log(run, `⚠ image IA ${b.asset} : ${e.message.slice(0, 120)} → plan réel`); b.query = b.query || String(b.ai).split(/\s+/).slice(0, 5).join(" "); delete b.ai; }
    }));
  }
  for (const name of names) {
    checkCancel();
    if (fs.existsSync(path.join(bdir, `${name}.mp4`)) || fs.existsSync(path.join(bdir, `${name}.jpg`))) { if (credits[name]?.src === "ai") ai++; else ok++; continue; }
    const beat = sb.beats.find((b) => b.asset === name);
    if (beat.hero === false) {
      const qw2 = String(beat.query || name.replace(/_/g, " ")).split(/\s+/);
      const got2 = await fetchVerified(run, name, [...new Set([qw2.join(" "), qw2.slice(0, 3).join(" "), qw2.slice(0, 2).join(" ")])], srcs, used, bdir, rejected, false);
      if (got2) { const c = got2.c; credits[name] = { id: c.id, src: c.src, author: c.author, license: c.license, page: c.page, seen: got2.seen }; used.add(c.id); ok++; log(run, `🎞 ${name} ← ${c.src} (${c.id}) « ${got2.q} » ✓ vu : ${got2.seen}`); continue; }
      if (run.params.aiImages) { try { await aiImage(run, beat.query, path.join(bdir, `${name}.jpg`)); credits[name] = { id: `ai-${name}`, src: "ai", author: "", license: "image générée par IA", page: "", prompt: beat.query }; ai++; continue; } catch (e) { log(run, `⚠ image IA : ${e.message}`); } }
      sb.beats = sb.beats.filter((b) => b.asset !== name); dropped++; log(run, `↷ ${name} : aucun plan libre (« ${beat.query} ») — beat retiré`); continue;
    }
    const q = beat.query || `${SPECIES_NAME(run)} ${name.replace(/_/g, " ")}`;
    const sp = SPECIES_NAME(run); const qw = q.split(/\s+/);
    const tries = [q, qw.slice(0, 3).join(" "), `${sp} ${qw.find((w) => /ing$/.test(w)) || ""}`.trim(), sp, sp.split(" ").pop()];
    const got = await fetchVerified(run, name, [...new Set(tries)], srcs, used, bdir, rejected);
    if (got) { const c = got.c; credits[name] = { id: c.id, src: c.src, author: c.author, license: c.license, page: c.page, seen: got.seen }; used.add(c.id); ok++; log(run, `🎞 ${name} ← ${c.src} (${c.id}) « ${got.q} » ✓ vu : ${got.seen}`); continue; }
    if (run.params.aiImages) {
      try { await aiImage(run, `${SPECIES_NAME(run)}, ${q}, in its natural habitat`, path.join(bdir, `${name}.jpg`)); credits[name] = { id: `ai-${name}`, src: "ai", author: "", license: "image générée par IA", page: "", prompt: q }; ai++; continue; } catch (e) { log(run, `⚠ image IA : ${e.message}`); }
    }
    sb.beats = sb.beats.filter((b) => b.asset !== name); dropped++;
    log(run, `↷ ${name} : aucun plan libre (« ${q} ») — beat retiré`);
  }
  fs.writeFileSync(path.join(bdir, "credits.json"), JSON.stringify(credits, null, 1));
  fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1));
  stageRun(run);
  let chk = await d2check(run);
  // COMPLÉMENT : sous la cible (−2 pts), on ajoute des plans sur les répliques SANS carte (le monde y est seul), du milieu vers les bords
  if (chk.realPct + (chk.aiPct || 0) < run.params.realPct - 2) {
    const tl = jsonOf(path.join(dir, "timeline.json"));
    const CARD = new Set(["title", "toc", "chapter", "bignum", "compare", "bars", "broll", "photo", "map", "anatomy", "quiz", "timeline", "quote", "icons", "outro", "cta"]);
    const busy = new Set(sb.beats.filter((b) => CARD.has(b.type)).map((b) => b.line));
    const free = tl.lines.filter((l, i) => i > 2 && i < tl.lines.length - 2 && !busy.has(l.id) && l.dur >= 3.5);
    const sp = SPECIES_NAME(run); const kinds = ["close up", "walking", "herd", "water", "eating", "resting", "running"];
    let k = 0;
    for (const l of free) {
      if (chk.realPct + (chk.aiPct || 0) + (100 * k * 4.5) / tl.total >= run.params.realPct) break;
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
  if (chk.realPct + (chk.aiPct || 0) < run.params.realPct - 2) {
    const tl2 = jsonOf(path.join(dir, "timeline.json")); let ext = 0;
    for (const b of sb.beats.filter((x) => x.type === "broll" && !x.until && !x.untilLine)) { const i = tl2.lines.findIndex((l) => l.id === b.line); if (i >= 0 && i < tl2.lines.length - 2) { b.untilLine = tl2.lines[i + 1].id; ext++; } }
    if (ext) { fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1)); stageRun(run); const c2 = await d2check(run); if (!(c2.anomalies || []).length) { chk = c2; log(run, `⤳ ${ext} plan(s) prolongé(s) → ${(chk.realPct + (chk.aiPct || 0)).toFixed(1)} %`); } }
  }
  run.check = { anomalies: chk.anomalies || [], realPct: chk.realPct, aiPct: chk.aiPct || 0, cardPct: chk.cardPct, target: run.params.realPct, nReal: ok, nAi: ai };
  log(run, `✅ Plein écran : ${ok} plan(s) réel(s)${ai ? ` + ${ai} image(s) IA` : ""}${dropped ? ` · ${dropped} sans plan` : ""} · mesuré ${(chk.realPct + (chk.aiPct || 0)).toFixed(1)} % (réel ${chk.realPct} % · IA ${chk.aiPct || 0} %) pour une cible de ${run.params.realPct} % · ${run.check.anomalies.length} anomalie(s)`);
  if (run.check.anomalies.some((i) => i.rule !== "variété")) { const tl4 = jsonOf(path.join(dir, "timeline.json")); const nfix = autoFix(sb, tl4, run.check.anomalies); if (nfix) { fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(sb, null, 1)); stageRun(run); const c4 = await d2check(run); run.check = { ...run.check, anomalies: c4.anomalies || [], realPct: c4.realPct, aiPct: c4.aiPct || 0, cardPct: c4.cardPct }; log(run, `🔧 Réparation automatique : ${nfix} correction(s) → ${run.check.anomalies.length} anomalie(s)`); } }
  run.check.warnings = run.check.anomalies.filter((i) => i.rule === "variété"); run.check.anomalies = run.check.anomalies.filter((i) => i.rule !== "variété");
  if (run.check.warnings.length) log(run, `⚠ variété : ${run.check.warnings.map((i) => i.msg).join(" · ")}`);
  if (run.check.anomalies.length) throw new Error(`vérificateur : ${run.check.anomalies.length} anomalie(s) — ${run.check.anomalies.slice(0, 3).map((i) => i.msg).join(" · ")}`);
  // inventaire des plans plein écran (affiché à l'étape « Plans » : on voit chaque plan, sa source, ce que la vision y a vu)
  run.media = Object.entries(credits).filter(([k]) => sb.beats.some((b) => b.asset === k)).map(([k, c]) => { const vid = fs.existsSync(path.join(bdir, `${k}.mp4`)); const bt = sb.beats.find((b) => b.asset === k) || {};
    return { name: k, src: c.src, kind: vid ? "video" : "image", rel: `agent-os/output/machines/${run.id}/broll/${k}.${vid ? "mp4" : "jpg"}`, seen: c.seen || "", prompt: c.prompt || bt.query || "", line: bt.line }; });
  // planche de relecture (1 image / 3 s) pour la validation semi-manuelle
  try { await npx(["remotion", "bundle", "src/docu2d.tsx", "--public-dir", `"${path.join(PUB_DIR, run.id)}"`, "--out-dir", `"build-d2-${run.id}"`, "--log=error"]); run.bundle = `build-d2-${run.id}`;
    try { fs.rmSync(path.join(dir, "planche"), { recursive: true, force: true }); } catch {} // une reprise ne mélange jamais d'anciennes vignettes
    await npx(["node", "scripts/d2-stills.mjs", `"${path.join(PUB_DIR, run.id, "props.json")}"`, `"${path.join(dir, "planche")}"`, "--n", String(Math.min(60, Math.max(12, Math.round(jsonOf(path.join(dir, "timeline.json")).total / 3)))), "--scale", "0.5", "--bundle", run.bundle]);
    run.stills = fs.readdirSync(path.join(dir, "planche")).filter((f) => /\.(jpe?g|png)$/.test(f) && !f.startsWith("sheet-")).sort().map((f) => `agent-os/output/machines/${run.id}/planche/${f}`);
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
function nicheInfo() {
  try { const bank = require("../bank"); const n = bank.niches().find((x) => NICHE_NAME.test(x.name || "")); if (!n) return null; return { id: n.id, s: bank.summary(n.id) }; } catch { return null; }
}
/** Miniatures concurrentes les plus vues (fichiers du scraping) : références de STYLE de la nôtre (code Depth Theory / Squidium). */
function topCompetitorThumbFiles(n = 2) {
  const ni = nicheInfo(); if (!ni) return [];
  const scrap = require("../scrap"); const out = [];
  for (const v of ni.s.topVideos) { for (const ch of ni.s.channels) for (const rel of scrap.channelThumbs(ch.channelId)) if (rel.endsWith(`-${v.videoId}.jpg`)) out.push(path.join(ROOT, rel)); if (out.length >= n) break; }
  return out.slice(0, n);
}
/** Sources = NOMS DE SITES seulement (pas de liens, consigne d'Alex du 27/11) : faits + plans réels + images IA. */
function descriptionBlocks(run) {
  const dir = runDir(run); const L = run.params.lang === "fr";
  const tl = jsonOf(path.join(dir, "timeline.json")); const sb = jsonOf(path.join(dir, "storyboard.json"));
  const credits = jsonOf(path.join(dir, "broll", "credits.json"), {});
  const lineStart = (id) => (tl.lines.find((l) => l.id === id) || {}).start || 0;
  const chapters = [{ t: 0, label: L ? "Introduction" : "Intro" }];
  for (const b of sb.beats.filter((x) => x.type === "chapter")) { const t = Math.floor(lineStart(b.line)); if (t - chapters[chapters.length - 1].t >= 10) chapters.push({ t, label: `Question ${b.n} · ${(sb.chapters[b.n - 1] || {}).title || ""}` }); }
  const used = new Set(sb.beats.filter((b) => b.type === "broll").map((b) => b.asset));
  const srcName = { pexels: "Pexels", pixabay: "Pixabay", commons: "Wikimedia Commons", archive: "Internet Archive", nasa: "NASA", usfws: "U.S. Fish & Wildlife Service" };
  const sites = new Set();
  if ((run.facts || []).some((f) => /wikipedia/i.test(f.src || "")) || (run.sources || []).length) sites.add(L ? "Wikipédia" : "Wikipedia");
  for (const [k, c] of Object.entries(credits)) if (used.has(k) && c.src !== "ai") sites.add(srcName[c.src] || c.src);
  const ai = Object.entries(credits).some(([k, c]) => used.has(k) && c.src === "ai");
  return { chapters: chapters.map((c) => `${mmss(c.t)} ${c.label}`), sites: [...sites], ai, L };
}
async function stepPackage(run) {
  const B = descriptionBlocks(run);
  const lang = LANGS[run.params.lang] || run.params.lang;
  const ni = nicheInfo(); const nicheTags = ni ? (ni.s.topTags || []).slice(0, 60) : [];
  const p = await askJson([
    `Packaging YouTube (${lang}) d'un documentaire animalier. Titre de travail : « ${run.script.title} ». Sujet : ${run.params.subject}. Angle : ${run.meta.angle}.`,
    "- title : formule de la niche, 45-80 caractères, sans emoji ni majuscules criardes (« Pourquoi vous ne voudriez jamais croiser [animal] », « Pourquoi [créature] [paradoxe] », « Le [animal] le plus [x] du monde ») ;",
    "- hook : 2 phrases de description qui donnent envie, UNIQUEMENT avec des faits du registre (aucun superlatif ni record absent du registre) ;",
    `- tags : 20-30 tags de RECHERCHE (ce que les gens tapent sur YouTube), du plus précis au plus large, en ${lang} d'abord puis quelques-uns en anglais : nom de l'animal et ses variantes, nom scientifique, « [animal] dangereux », « [animal] attaque », « documentaire animalier », « animaux dangereux », « faune africaine »… JAMAIS de mots techniques de fabrication (papier découpé, animation, motion design, IA) ni de tags hors sujet. Inspire-toi du vocabulaire des tags de la niche ;`,
    "- thumbText : 2 à 4 mots MAX, à la 2e personne, qui créent la peur ou la curiosité (codes : « IT HEARS YOU.. », « NOT SMILING AT YOU.. ») ; entoure d'astérisques le mot à mettre en ROUGE (un seul), ex. « IL VOUS *VOIT*.. » ; dans la langue de la vidéo ;",
    "- thumbScene : en ANGLAIS, la scène de la miniature : l'animal du sujet ÉNORME à droite (tête ou corps en gros plan, menaçant, détail anatomique fidèle à l'espèce), et à gauche un humain MINUSCULE en situation (pirogue, safari, plongeur, randonneur selon l'habitat) ; 40-80 mots ;",
    "- titleAlt : 2 titres alternatifs.",
    `FAITS DE LA VIDÉO : ${JSON.stringify((run.facts || []).slice(0, 25).map((f) => f.claim))}`,
    `TITRES QUI MARCHENT DANS LA NICHE (codes à réutiliser, jamais copier) : ${JSON.stringify(nicheTitles(30).map((v) => `${v.title} (${v.views})`))}`,
    nicheTags.length ? `TAGS DE LA NICHE (vocabulaire) : ${JSON.stringify(nicheTags)}` : "",
    'JSON UNIQUEMENT : {"title":"","hook":"","tags":[""],"thumbText":"","thumbScene":"","titleAlt":["",""]}',
  ].filter(Boolean).join("\n"), "Packaging");
  // RELECTURE : la description et le titre ne contiennent QUE des faits du registre (vécu : « l'animal qui tue le plus d'humains du continent », inventé)
  try {
    const rv = await askJson([
      "Vérifie ce titre et ce texte de description YouTube contre le registre de faits. Toute affirmation absente du registre (superlatif, record, « le plus… », chiffre) doit être retirée ou réécrite fidèlement.",
      "REGISTRE : " + JSON.stringify(run.facts), "TITRE : " + p.title, "TEXTE : " + p.hook,
      'JSON UNIQUEMENT : {"title":"titre corrigé (ou identique)","hook":"texte corrigé (ou identique)","changed":false}',
    ].join("\n"), "Relecture packaging");
    if (rv.hook) p.hook = rv.hook; if (rv.title) p.title = rv.title;
    if (rv.changed) log(run, "🔎 Relecture du packaging : affirmation non sourcée retirée du titre / de la description");
  } catch (e) { log(run, "relecture packaging : " + e.message.slice(0, 100)); }
  addCost(run, "llm", 0.01, "openrouter", "packaging");
  const brand = config().settings.brand;
  const L = B.L;
  const desc = [p.hook || "", "", L ? "Chapitres" : "Chapters", ...B.chapters, "",
    `Sources : ${B.sites.join(", ")}${B.ai ? (L ? ". Certaines images sont des illustrations générées par IA." : ". Some images are AI-generated illustrations.") : "."}`,
    "", FAIR_USE[run.params.lang] || FAIR_USE.en,
    "", `${L ? "Animation, voix et musique" : "Animation, voice and music"} : ${brand}.`].join("\n");
  run.pack = { title: String(p.title || run.script.title).replace(/["«»]/g, "").slice(0, 100), titleAlt: p.titleAlt || [], description: desc, tags: capTags(p.tags || [], 495), thumbText: String(p.thumbText || "").slice(0, 40), thumbScene: String(p.thumbScene || ""), chapters: B.chapters, thumbRel: null, thumbTs: Date.now() };
  try { await makeThumbnail(run); } catch (e) { log(run, "⚠ miniature : " + e.message.slice(0, 160)); }
  run.finalRel = run.output.rel;
  fs.writeFileSync(path.join(runDir(run), "youtube.txt"), `${run.pack.title}\n\n${run.pack.description}\n\nTAGS: ${run.pack.tags.join(", ")}\n`);
  addToStock(run);
  log(run, "📦 Packaging prêt (titre, description : chapitres + sources + fair use, tags, miniature IA) — vidéo ajoutée au stock");
  if (run.params.publishChannelId) { try { const pub = await publishRun(run.id, {}, run); log(run, `📤 Publiée : ${pub.url} (${pub.privacyStatus})`); } catch (e) { log(run, "⚠ Publication échouée : " + e.message); } }
}
/** Miniature IA au code de la niche : GPT Image 2.5 i2i avec les 2 miniatures concurrentes les plus vues en RÉFÉRENCES DE STYLE
 *  (gravure noir et blanc, animal énorme à droite, humain minuscule à gauche, flèche rouge, fond noir), puis texte posé par
 *  Remotion (net, accents justes) : blanc, le mot entre *astérisques* en rouge. */
async function makeThumbnail(run, { text, scene } = {}) {
  const dir = runDir(run); if (text !== undefined) run.pack.thumbText = String(text).slice(0, 40); if (scene) run.pack.thumbScene = scene;
  const bgFile = path.join(dir, "thumb-bg.png"); const sp = SPECIES_NAME(run);
  if (scene || !fs.existsSync(bgFile)) {
    const refs = []; for (const f of topCompetitorThumbFiles(2)) { try { refs.push(await uploadPublic(`${run.id}-thumbref-${refs.length}.jpg`, f)); } catch (e) { log(run, "réf. miniature : " + e.message.slice(0, 80)); } }
    const prompt = [
      refs.length ? `STYLE REFERENCES ATTACHED: ${refs.length} YouTube thumbnails from the same channel family. Reproduce their exact visual identity — indistinguishable from the same artist: pitch-black background with faint stars/particles, the animal drawn as a hyper-detailed black-and-white scratchboard / engraving illustration with fine white hatching, huge and close on the RIGHT half, a TINY human on the LEFT in white line art, concentric sound/sense rings between them, one bold red hand-drawn arrow pointing at the tiny human. Draw a NEW scene for this subject, do not copy their content.` : "Pitch-black background, hyper-detailed black-and-white scratchboard engraving illustration, animal huge on the right, tiny human on the left, one red arrow pointing at the human.",
      `SUBJECT: ${sp} (${run.params.subject}) — anatomically exact for this species. ${run.pack.thumbScene || ""}`,
      "Leave the TOP-LEFT 55 % x 40 % area completely empty black (text will be added later). Absolutely NO text, no letters, no logo in the image. 16:9.",
    ].join("\n\n");
    const input = { prompt, aspect_ratio: "16:9", resolution: "1K" }; if (refs.length) input[KIE_IMG.field] = refs;
    const url = await kieTask(refs.length ? KIE_IMG.i2i : KIE_IMG.t2i, input);
    fs.writeFileSync(bgFile, Buffer.from(await (await fetch(url)).arrayBuffer())); addCost(run, "ai", PRICES.thumb, "kie", "miniature IA");
  }
  // texte posé par Remotion (composition Docu2DThumb, mode image)
  const pub = path.join(PUB_DIR, run.id); ensureDir(pub); fs.copyFileSync(bgFile, path.join(pub, "thumb-bg.png"));
  const pf = path.join(pub, "thumb-props.json"); fs.writeFileSync(pf, JSON.stringify({ ...jsonOf(path.join(pub, "props.json")), root: "", thumbBg: "thumb-bg.png", thumbText: run.pack.thumbText }));
  const th = path.join(dir, "thumb.png");
  if (!run.bundle || !fs.existsSync(path.join(REMOTION_DIR, run.bundle))) { await npx(["remotion", "bundle", "src/docu2d.tsx", "--public-dir", `"${pub}"`, "--out-dir", `"build-d2-${run.id}"`, "--log=error"]); run.bundle = `build-d2-${run.id}`; }
  // le bundle a figé son dossier public : on y copie le fond (sinon 404 sur thumb-bg.png)
  try { fs.copyFileSync(bgFile, path.join(REMOTION_DIR, run.bundle, "public", "thumb-bg.png")); } catch {}
  await npx(["remotion", "still", run.bundle, "Docu2DThumb", `"${th}"`, `--props="${pf}"`, "--scale=0.6667"]);
  run.pack.thumbRel = `agent-os/output/machines/${run.id}/thumb.png`; run.pack.thumbTs = Date.now();
  return run.pack;
}
async function regenThumbnail(runId, { text, scene } = {}) {
  const run = getRun(runId); if (!run || !run.pack) throw new Error("Pas encore de packaging");
  await runScope.run(runId, () => makeThumbnail(run, { text, scene: scene || undefined }));
  saveRun(run); syncStock(run); return run.pack;
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
    params: { subject: String(subject).trim(), family: family || "auto", durationMin: Math.max(1, Math.min(30, Number(durationMin) || s.durationMin)), lang: LANGS[lang] ? lang : s.lang,
      voice: String(voiceId || v || s.voice).trim(), realPct: Math.max(0, Math.min(80, Number(realPct ?? s.realPct))), aiImages: !!(aiImages ?? s.aiImages), aiVideo: !!(aiVideo ?? s.aiVideo),
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
    mode: r.params.mode, seconds: r.output && r.output.seconds, realPct: r.check && +((r.check.realPct || 0) + (r.check.aiPct || 0)).toFixed(1), cost: +Object.values(r.cost || {}).reduce((a, b) => a + b, 0).toFixed(2), running: live.has(r.id) && !cancelled.has(r.id),
    published: r.published || null, thumb: r.pack && r.pack.thumbRel, last: (r.log || []).slice(-1)[0] };
}
function start(runId, from) {
  const run = getRun(runId); if (!run) throw new Error("run introuvable");
  if (live.has(runId)) throw new Error("run déjà en cours");
  if (from) resetFrom(run, from); else if (run.error || run.status === "failed") { delete run.error; saveRun(run); }
  advance(runId).catch(() => {});
  return summary(getRun(runId));
}


// ---------------------------------------------------------------- bestiaire (onglet de la machine)
/** Espèces dessinables (gabarit quadrupède, remotion/src/Docu2D/bestiary.tsx) : taille réelle et capacités. */
const BESTIARY = [
  { id: "hippo", fr: "Hippopotame", h: 1.5, l: 4.0, aquatic: true, gape: true, note: "scènes aquatiques complètes (troupeau, plongée, canoë, sueur rouge)" },
  { id: "crocodile", fr: "Crocodile", h: 0.5, l: 4.5, aquatic: true, gape: true, note: "aquatique, gueule" },
  { id: "lion", fr: "Lion", h: 1.2, l: 2.5, aquatic: false, gape: true, note: "terrestre, crinière, gueule" },
  { id: "elephant", fr: "Éléphant", h: 3.2, l: 6.5, aquatic: false, gape: false, note: "terrestre, trompe, défenses" },
  { id: "buffalo", fr: "Buffle d'Afrique", h: 1.6, l: 3.2, aquatic: false, gape: false, note: "terrestre, cornes" },
  { id: "rhino", fr: "Rhinocéros", h: 1.7, l: 3.8, aquatic: false, gape: false, note: "terrestre, deux cornes" },
  { id: "hyena", fr: "Hyène", h: 0.85, l: 1.5, aquatic: false, gape: false, note: "terrestre, dos tombant, taches (icônes et comparaisons)" },
];
const BEST_DIR = path.join(OUT_ROOT, "docu2d-bestiaire");
function bestiary() {
  return BESTIARY.map((b) => {
    const f = path.join(BEST_DIR, b.id + ".png"); const ok = fs.existsSync(f);
    return { ...b, sheet: ok ? `agent-os/output/machines/docu2d-bestiaire/${b.id}.png` : null, ts: ok ? fs.statSync(f).mtimeMs : 0 };
  });
}
/** (Re)dessine la planche de chaque espèce (BestiarySheet : grand format fermé / gueule / marche + alignement à l'échelle). */
async function renderBestiary() {
  ensureDir(BEST_DIR); const base = path.join(REMOTION_DIR, "public-d2-base"); ensureDir(base);
  try { fs.copyFileSync(path.join(PUB_DIR, "paper.png"), path.join(base, "paper.png")); } catch {}
  await npx(["remotion", "bundle", "src/docu2d.tsx", "--public-dir", "public-d2-base", "--out-dir", "build-d2-bestiaire", "--log=error"]);
  for (const b of BESTIARY) {
    const pf = path.join(BEST_DIR, b.id + ".props.json"); fs.writeFileSync(pf, JSON.stringify({ id: b.id }));
    await npx(["remotion", "still", "build-d2-bestiaire", "BestiarySheet", `"${path.join(BEST_DIR, b.id + ".png")}"`, `--props="${pf}"`, "--frame=20", "--scale=0.5"]);
  }
  return bestiary();
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
/** Devis : voix (caractères estimés × débit mesuré de la voix) + musique Suno + texte (LLM) + vision (contrôle de chaque plan)
 *  + images IA (≈ 1/3 des plans plein écran) + vidéos IA (1 par image IA) + miniature IA. Même formule que le storyboard. */
function estimate({ durationMin = 10, voice: v, aiImages, aiVideo, music = true, realPct } = {}) {
  const s = config().settings; const sec = Number(durationMin) * 60; const pct = Number(realPct ?? s.realPct);
  const chars = Math.round(sec * 0.85 * speechWpm(v || s.voice, s) / 60 * 5.9);
  const voiceUsd = (chars / 1000) * PRICES.elevenPer1kChars;
  const nFull = Math.max(3, Math.ceil((sec * pct / 100) / 5.5)); const nAi = aiImages ? Math.max(1, Math.round(nFull / 3)) : 0;
  const d = { voice: +voiceUsd.toFixed(2), music: music ? PRICES.music : 0, llm: PRICES.llm, vision: +((nFull - nAi) * 2.5 * PRICES.vision).toFixed(2), aiImages: +(nAi * PRICES.aiImage).toFixed(2), aiVideo: aiVideo && nAi ? +(nAi * PRICES.aiVideo).toFixed(2) : 0, thumb: PRICES.thumb };
  const total = Object.values(d).reduce((a, b) => a + b, 0);
  return { chars, usd: +total.toFixed(2), detail: d, nFull, nAi, wpm: speechWpm(v || s.voice, s), renderMin: Math.max(3, Math.round(Number(durationMin) * 4.5)) }; // mesuré : 10 min → ≈ 45-50 min de rendu
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
  stock, patchStock, publishRun, saveTexts, regenThumbnail, bestiary, renderBestiary,
};
