// Docu2D — résolution du storyboard (pur, partagé entre le rendu et le vérificateur).
// Un storyboard = liste de « beats » typés, chacun ancré sur un MOT de la voix off (jamais sur un temps en dur).
//   cartes (exclusives, plein écran papier) · tags (étiquettes) · world/scene (le plan-séquence dessiné) · cta.
// Règles de mise en page AUTOMATIQUES : une seule carte à la fois (la suivante coupe la précédente), les tags se rangent
// dans des emplacements libres, tout ce qui appartient à une carte sort AVEC elle, durée lisible minimale.

export type Word = { w: string; t: number; e: number };
export type TLine = { id: string; start: number; dur: number; words: Word[]; text?: string; scene?: string; file?: string };
export type Timeline = { total: number; lines: TLine[] };

export const CARD_TYPES = ["title", "toc", "chapter", "bignum", "compare", "bars", "broll", "photo", "map", "anatomy", "quiz", "timeline", "quote", "icons", "outro", "end"] as const;
export type CardType = (typeof CARD_TYPES)[number];
export type BeatType = CardType | "tag" | "world" | "scene" | "cta";

export type Beat = {
  type: BeatType; line: string; at?: string; until?: string; untilLine?: string;
  [k: string]: any;
};
export type Storyboard = {
  meta: { title: string; lang: string; world: string; hero: string; family?: string };
  chapters: { title: string; icon?: string }[];
  beats: Beat[];
};
export type Resolved = Beat & { t0: number; t1: number; id: string; card?: string; slot?: number; sub?: Resolved[] };

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Temps absolu d'un mot de la réplique : « mot », « mot#2 » (2e occurrence), « +1.5 » (décalage), « fin » (fin de réplique). */
export const wordTime = (tl: Timeline, lineId: string, at?: string, end = false): number => {
  const L = tl.lines.find((l) => l.id === lineId);
  if (!L) throw new Error(`réplique inconnue : ${lineId}`);
  if (!at) return end ? L.start + L.dur : L.start;
  if (at === "fin") return L.start + L.dur;
  if (/^[+-][\d.]+$/.test(at)) return L.start + Number(at);
  const [w, occ] = at.split("#"); const n = Number(occ || 1); const target = norm(w);
  let k = 0;
  for (const x of L.words) if (norm(x.w) === target || (target.length > 3 && (norm(x.w).startsWith(target) || norm(x.w).endsWith(target)))) /* « herbe » trouve « l'herbe. » */ { k++; if (k === n) return L.start + (end ? x.e : x.t); }
  throw new Error(`mot « ${at} » introuvable dans ${lineId} (« ${L.words.map((x) => x.w).join(" ").slice(0, 80)}… »)`);
};
export const lineEnd = (tl: Timeline, id: string) => { const L = tl.lines.find((l) => l.id === id)!; return L.start + L.dur; };
export const lineStart = (tl: Timeline, id: string) => tl.lines.find((l) => l.id === id)!.start;

export const isCard = (b: Beat) => (CARD_TYPES as readonly string[]).includes(b.type);
export const MIN_CARD = 2.5, MIN_TAG = 1.8; // dissection v1 (R1) : 1,6 s ne laissait pas lire

/** Texte affiché par une carte (sert au temps de lecture R1). */
const cardText = (b: Beat) => [b.text, b.title, b.n, b.unit, b.sub, b.question, ...(b.items || []).map((x: any) => [x.label, x.text, x.year, x.display].filter(Boolean).join(" ")), ...(b.labels || []).map((x: any) => x.text), ...(b.options || [])].filter(Boolean).join(" ");
export const readNeed = (b: Beat) => b.type === "chapter" ? 2.0 : ["title", "quote", "end"].includes(b.type) ? Math.max(MIN_CARD, 0.6 + 0.04 * cardText(b).length) /* texte lu par la voix en même temps */ : Math.max(MIN_CARD, 1.2 + 0.05 * cardText(b).length);

/** Lexique R7 : une icône n'illustre que ce qu'elle représente vraiment (mots-racines, sans accents). */
export const ICON_MEANS: Record<string, string[]> = {
  skull: ["mort", "tue", "deces", "victime", "mortel", "letal", "danger"], tooth: ["dent", "canine", "incisive", "croc", "machoire", "morsure"], tusk: ["defense", "canine", "ivoire", "dent"],
  shield: ["defen", "protec", "protege", "bouclier", "securite", "abri"], eye: ["oeil", "yeux", "vue", "vision", "regard", "voir", "cache", "secret"], globe: ["monde", "planete", "pays", "continent", "terre", "village", "isole", "region"],
  sun: ["soleil", "uv", "chaleur", "lumiere", "jour", "creme"], moon: ["nuit", "lune", "nocturne", "soir"], whale: ["baleine", "dauphin", "cetace"], weight: ["poids", "tonne", "kilo", "lourd", "masse"],
  speed: ["vitesse", "km/h", "kmh", "rapide", "course", "charge", "sprint"], canoe: ["canoe", "pirogue", "bateau", "pecheur", "barque", "kayak"], baby: ["bebe humain", "nourrisson", "enfant"],
  warning: ["attention", "danger", "alerte", "risque", "menace", "prudence"], grass: ["herbe", "brout", "vegetation", "plante", "paturage", "foin"], bacteria: ["bacterie", "microbe", "infection", "antibio", "germe"],
  ruler: ["distance", "metre", "longueur", "taille", "envergure", "mesure"], water: ["eau", "riviere", "fleuve", "lac", "boire", "mare", "humide"], hospital: ["hopital", "medic", "soin", "donnee medicale"],
  phone: ["declar", "telephone", "signal", "appel", "rapport"], syringe: ["steril", "vaccin", "injection", "seringue", "veterinaire", "traitement"], lungs: ["respir", "souffle", "apnee", "poumon", "air"],
  bandage: ["plaie", "blessure", "bless", "cicatrice"], mosquito: ["moustique", "paludisme"], fin: ["requin"], snake: ["serpent", "vipere", "cobra"], lion: ["lion"], crocodile: ["crocodile", "croco"],
  pig: ["cochon", "porc", "sanglier"], elephant: ["elephant"], hippo: ["hippopotame", "hippo"], money: ["argent", "cout", "prix", "dollar", "euro", "cher"], thermometer: ["temperature", "chaud", "froid", "fievre"],
  heart: ["coeur", "cardiaque"], brain: ["cerveau", "intelligen"], calendar: ["date", "an", "annee", "mois", "jour"], stopwatch: ["minute", "seconde", "temps", "duree"], check: ["oui", "vrai", "ok"], cross: ["non", "faux", "jamais"],
  question: [], hyena: ["hyene"], manatee: ["lamantin"], colombia: ["colombie"], bone: ["os", "squelette"], person: ["humain", "homme", "personne", "habitant"], dna: ["adn", "gene", "cousin", "ancetre", "parent"],
};
export const iconFits = (icon: string | undefined, text: string) => {
  if (!icon) return true;
  if (/^animal:/.test(icon)) return true; // dessiné par le bestiaire : toujours l'animal nommé
  const m = ICON_MEANS[icon]; if (!m) return false;
  const t = norm2(text);
  return m.some((w) => t.includes(norm2(w)));
};
const norm2 = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type Issue = { rule: string; msg: string };

/** Résout tous les temps + l'exclusivité des cartes + le rattachement des tags. Les erreurs d'ancrage sont des anomalies. */
export const resolve = (sb: Storyboard, tl: Timeline): { beats: Resolved[]; issues: Issue[] } => {
  const issues: Issue[] = [];
  const out: Resolved[] = [];
  sb.beats.forEach((b, i) => {
    try {
      const t0 = wordTime(tl, b.line, b.at) - (b.type === "tag" ? 0.05 : 0.12);
      let t1: number;
      if (b.until) t1 = wordTime(tl, b.untilLine || b.line, b.until, true) + 0.25;
      else if (b.untilLine) t1 = lineEnd(tl, b.untilLine) + 0.3;
      else t1 = lineEnd(tl, b.line) + 0.3;
      // sous-éléments ancrés (sommaire, icônes, frise, labels d'anatomie, barres)
      const anchorList = (arr?: any[]) => (arr || []).forEach((it: any) => { if (it && typeof it === "object") it._t = it.at ? wordTime(tl, it.line || b.line, it.at) - 0.05 : t0 + 0.3; });
      anchorList(b.items); anchorList(b.labels); anchorList(b.events); anchorList(b.pins);
      if (b.reveal) b._reveal = wordTime(tl, b.revealLine || b.line, b.reveal) - 0.05;
      if (b.gapeAt) b._gape = wordTime(tl, b.gapeLine || b.line, b.gapeAt) - 0.1;
      out.push({ ...b, t0, t1, id: `b${i}` });
    } catch (e: any) { issues.push({ rule: "ancrage", msg: `beat ${i} (${b.type}, ${b.line}) : ${e.message}` }); }
  });
  // R2 jamais de carte vide : une carte à éléments entre au plus 0,6 s avant son premier élément
  for (const c of out) if (isCard(c) && Array.isArray(c.items) && c.items.length && c.type !== "toc" && c.type !== "compare") {
    const first = Math.min(...c.items.map((x: any) => x._t ?? Infinity));
    if (Number.isFinite(first) && first > c.t0 + 0.6) c.t0 = first - 0.6;
  }
  out.sort((a, b) => a.t0 - b.t0);
  // exclusivité des cartes : une carte coupe la précédente (sortie 0,3 s avant l'entrée de la suivante = fondu croisé propre)
  const cards = out.filter(isCard);
  for (let i = 0; i < cards.length - 1; i++) if (cards[i].t1 > cards[i + 1].t0) cards[i].t1 = cards[i + 1].t0 + 0.25;
  for (const c of cards) { const need = readNeed(c); if (c.t1 - c.t0 < need - 0.05) issues.push({ rule: "lecture", msg: `carte ${c.type} (${c.line}) visible ${(c.t1 - c.t0).toFixed(2)} s < ${need.toFixed(1)} s nécessaires pour lire « ${cardText(c).slice(0, 50)} »` }); }
  // R10 variété des cartes
  for (let i = 2; i < cards.length; i++) if (cards[i].type === cards[i - 1].type && cards[i].type === cards[i - 2].type && !["broll", "photo", "chapter"].includes(cards[i].type)) issues.push({ rule: "variété", msg: `3 cartes « ${cards[i].type} » à la suite (${cards[i - 2].line} → ${cards[i].line})` });
  const nb = cards.filter((c) => c.type === "bignum").length;
  if (cards.length >= 10 && nb / cards.length > 0.25) issues.push({ rule: "variété", msg: `${nb} cartes « gros chiffre » sur ${cards.length} (> 25 %) : varier (comparaison, barres, frise, schéma, plan réel)` });
  // R7 icône = mot
  for (const c of cards) {
    if (c.type === "bignum" && c.icon && !iconFits(c.icon, `${c.n} ${c.unit || ""} ${c.sub || ""}`)) issues.push({ rule: "icône", msg: `icône « ${c.icon} » ne représente pas « ${c.n}${c.unit || ""} ${c.sub || ""} » (${c.line})` });
    if ((c.type === "icons" || c.type === "bars") && c.items) for (const it of c.items) if (it.icon && !iconFits(it.icon, it.label || "")) issues.push({ rule: "icône", msg: `icône « ${it.icon} » ne représente pas « ${it.label} » (${c.line}) — utiliser animal:<espèce> ou aucune icône` });
  }
  // presets connus uniquement (un preset inventé = monde vide)
  const PRESETS = ["wide", "herd", "cross", "drink", "portrait", "graze", "charge", "calf", "night", "gape", "under", "sleep", "nurse", "canoe", "pass", "sweat"];
  out.forEach((b) => { if ((b.type === "world" || b.type === "scene") && !PRESETS.includes(b.preset)) issues.push({ rule: "preset", msg: `scène du monde inconnue « ${b.preset} » (${b.line}) — utiliser : ${PRESETS.join(", ")}` }); });
  // R3 variété du monde
  const worlds = out.filter((b) => b.type === "world" || b.type === "scene");
  for (let i = 1; i < worlds.length; i++) if (worlds[i].preset === worlds[i - 1].preset && (worlds[i].spot || "") === (worlds[i - 1].spot || "")) issues.push({ rule: "variété", msg: `deux scènes du monde identiques à la suite (${worlds[i].preset}${worlds[i].spot ? ":" + worlds[i].spot : ""}, ${worlds[i - 1].line} → ${worlds[i].line})` });
  const share: Record<string, number> = {}; let wt = 0;
  worlds.forEach((w, i) => { const d = (worlds[i + 1]?.t0 ?? tl.total) - w.t0; share[w.preset] = (share[w.preset] || 0) + d; wt += d; });
  for (const [p, d] of Object.entries(share)) if (wt > 60 && d / wt > 0.35) issues.push({ rule: "variété", msg: `la scène « ${p} » occupe ${Math.round((100 * d) / wt)} % du temps du monde (max 35 %)` });
  // tags : rattachés à la carte visible à leur entrée (ils sortent avec elle), sinon au monde
  const tags = out.filter((b) => b.type === "tag");
  for (const t of tags) {
    const c = cards.find((c) => t.t0 >= c.t0 - 0.05 && t.t0 < c.t1 - 0.3);
    if (c) { t.card = c.id; t.t1 = Math.min(t.t1, c.t1); }
    else { const nx = cards.find((c) => c.t0 > t.t0); if (nx) t.t1 = Math.min(t.t1, nx.t0 + 0.2); } // une étiquette du monde sort quand une carte arrive
  }
  // emplacements : les tags simultanés d'un même parent ne se chevauchent jamais
  const byParent: Record<string, Resolved[]> = {};
  for (const t of tags) (byParent[t.card || "world"] = byParent[t.card || "world"] || []).push(t);
  for (const [, arr] of Object.entries(byParent)) {
    const busy: number[] = []; // fin d'occupation par emplacement
    for (const t of arr) {
      let s = busy.findIndex((e) => e <= t.t0);
      if (s < 0) { s = busy.length; busy.push(0); }
      busy[s] = t.t1; t.slot = s;
      if (s > 2) issues.push({ rule: "encombrement", msg: `${s + 1} étiquettes simultanées (${t.line} « ${t.text} »)` });
    }
  }
  for (const t of tags) {
    if (t.t1 - t.t0 < MIN_TAG) issues.push({ rule: "lecture", msg: `étiquette « ${t.text} » visible ${(t.t1 - t.t0).toFixed(2)} s < ${MIN_TAG} s` });
    if ((t.text || "").length > 38) issues.push({ rule: "texte", msg: `étiquette trop longue (${t.text.length} car.) : « ${t.text} »` });
  }
  return { beats: out, issues };
};

/** État du monde (caméra, nuit, action du héros, scène) à l'instant T : le dernier beat world/scene commencé. */
export const worldAt = (beats: Resolved[], T: number) => {
  let cur: Resolved | undefined, prev: Resolved | undefined;
  for (const b of beats) if ((b.type === "world" || b.type === "scene") && b.t0 <= T) { prev = cur; cur = b; }
  return { cur, prev };
};
export const cardAt = (beats: Resolved[], T: number) => beats.filter((b) => isCard(b) && T >= b.t0 - 0.05 && T < b.t1 + 0.05);
