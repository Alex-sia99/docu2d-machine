// Docu2D — résolution du storyboard (pur, partagé entre le rendu et le vérificateur).
// Un storyboard = liste de « beats » typés, chacun ancré sur un MOT de la voix off (jamais sur un temps en dur).
//   cartes (exclusives, plein écran papier) · tags (étiquettes) · world/scene (le plan-séquence dessiné) · cta.
// Règles de mise en page AUTOMATIQUES : une seule carte à la fois (la suivante coupe la précédente), les tags se rangent
// dans des emplacements libres, tout ce qui appartient à une carte sort AVEC elle, durée lisible minimale.

export type Word = { w: string; t: number; e: number };
export type TLine = { id: string; start: number; dur: number; words: Word[]; text?: string; scene?: string; file?: string };
export type Timeline = { total: number; lines: TLine[] };

export const CARD_TYPES = ["title", "toc", "chapter", "bignum", "compare", "bars", "broll", "photo", "map", "anatomy", "quiz", "timeline", "quote", "icons", "outro"] as const;
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
export const MIN_CARD = 1.6, MIN_TAG = 1.3;

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
  out.sort((a, b) => a.t0 - b.t0);
  // exclusivité des cartes : une carte coupe la précédente (sortie 0,3 s avant l'entrée de la suivante = fondu croisé propre)
  const cards = out.filter(isCard);
  for (let i = 0; i < cards.length - 1; i++) if (cards[i].t1 > cards[i + 1].t0) cards[i].t1 = cards[i + 1].t0 + 0.25;
  for (const c of cards) if (c.t1 - c.t0 < MIN_CARD) issues.push({ rule: "durée", msg: `carte ${c.type} (${c.line}) visible ${(c.t1 - c.t0).toFixed(2)} s < ${MIN_CARD} s` });
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
    if (t.t1 - t.t0 < MIN_TAG) issues.push({ rule: "durée", msg: `étiquette « ${t.text} » visible ${(t.t1 - t.t0).toFixed(2)} s` });
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
