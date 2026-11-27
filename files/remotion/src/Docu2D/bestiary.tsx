// Docu2D — BESTIAIRE paramétrique (papier découpé, aplats, profil tourné vers la droite).
// Une espèce = une fiche de paramètres EN MÈTRES (taille réelle → contrôle d'échelle) dessinée par un gabarit de famille.
// Gabarit « quadrupède » : tronc, cou, tête en deux mâchoires (gueule qui s'ouvre), 4 pattes en IK avec MARCHE À PIEDS
// PLANTÉS (phase dérivée de la distance parcourue : un pied d'appui ne glisse jamais), queue, attributs (défenses, cornes,
// crinière, trompe, motifs). Origine du dessin = sol, sous le milieu du tronc. y négatif = vers le haut.
import React from "react";

export type V = [number, number];
type Snout = "box" | "cat" | "long" | "trunk" | "bovine";
export type Quad = {
  name: { fr: string; en: string };
  len: number; top: number; belly: number; hump?: number; rumpDrop?: number;
  head: { len: number; h: number; snout: Snout; neck: number; lift: number; ear: "small" | "round" | "big" | "pointed"; eyeTop?: boolean };
  leg: { w: number; foot: "pad" | "hoof" | "toes" | "column" };
  tail: { len: number; tuft?: boolean; thick?: boolean };
  col: { body: string; dark: string; belly: string; accent: string; mouth?: string };
  tusks?: number; horns?: "buffalo" | "rhino" | "antelope"; mane?: string; stripes?: string; spots?: string; sweat?: boolean;
  /** points d'ancrage nommés (m, repère tête fermée ou corps) pour les infographies d'anatomie */
  parts?: Record<string, { on: "body" | "head" | "jaw"; p: V }>;
  /** vitesse de marche (m/s) et pas (m) */
  gait?: { stride: number };
};

export const SPECIES: Record<string, Quad> = {
  hippo: {
    name: { fr: "hippopotame", en: "hippo" },
    len: 2.7, top: 1.45, belly: 0.42, hump: 0.03, rumpDrop: 0.1,
    head: { len: 1.0, h: 0.66, snout: "box", neck: 0.1, lift: 0.17, ear: "small", eyeTop: true },
    leg: { w: 0.3, foot: "toes" }, tail: { len: 0.45 },
    col: { body: "#8c7c88", dark: "#6c5e6a", belly: "#c99a9a", accent: "#e2a9a5", mouth: "#e0838f" },
    tusks: 0.5, sweat: false, gait: { stride: 1.05 },
    parts: {
      canine: { on: "jaw", p: [0.88, -0.42] }, incisor: { on: "jaw", p: [1.06, -0.15] }, eye: { on: "head", p: [0.3, -0.6] },
      ear: { on: "head", p: [0.1, -0.62] }, nostril: { on: "head", p: [0.86, -0.5] }, skin: { on: "body", p: [0, -1.0] },
      leg: { on: "body", p: [0.9, -0.3] }, lips: { on: "head", p: [0.98, -0.2] }, belly: { on: "body", p: [-0.2, -0.55] },
    },
  },
  lion: {
    name: { fr: "lion", en: "lion" },
    len: 1.55, top: 1.15, belly: 0.62, hump: 0.02, rumpDrop: 0.06,
    head: { len: 0.42, h: 0.38, snout: "cat", neck: 0.18, lift: 0.08, ear: "round" },
    leg: { w: 0.16, foot: "pad" }, tail: { len: 0.9, tuft: true },
    col: { body: "#d9a55a", dark: "#b8853f", belly: "#ecc88e", accent: "#5a3a1e" }, mane: "#8a5527", gait: { stride: 1.1 },
  },
  elephant: {
    name: { fr: "éléphant", en: "elephant" },
    len: 3.2, top: 3.2, belly: 1.45, hump: 0.12, rumpDrop: 0.25,
    head: { len: 0.95, h: 1.1, snout: "trunk", neck: 0.05, lift: 0.1, ear: "big" },
    leg: { w: 0.5, foot: "column" }, tail: { len: 1.0, tuft: true },
    col: { body: "#9a9590", dark: "#7c7772", belly: "#a8a39d", accent: "#f1e9d6" }, tusks: 1.2, gait: { stride: 1.8 },
  },
  buffalo: {
    name: { fr: "buffle", en: "buffalo" },
    len: 2.2, top: 1.5, belly: 0.65, hump: 0.12, rumpDrop: 0.12,
    head: { len: 0.6, h: 0.5, snout: "bovine", neck: 0.12, lift: -0.15, ear: "pointed" },
    leg: { w: 0.18, foot: "hoof" }, tail: { len: 0.8, tuft: true },
    col: { body: "#3e3530", dark: "#2b2420", belly: "#4c423b", accent: "#d8cdb8" }, horns: "buffalo", gait: { stride: 1.2 },
  },
  rhino: {
    name: { fr: "rhinocéros", en: "rhino" },
    len: 2.8, top: 1.7, belly: 0.6, hump: 0.15, rumpDrop: 0.1,
    head: { len: 0.85, h: 0.55, snout: "box", neck: 0.12, lift: -0.25, ear: "pointed" },
    leg: { w: 0.3, foot: "column" }, tail: { len: 0.6, tuft: true },
    col: { body: "#9b968c", dark: "#7a766d", belly: "#aaa59b", accent: "#d9d2c3" }, horns: "rhino", gait: { stride: 1.3 },
  },
  crocodile: {
    name: { fr: "crocodile", en: "crocodile" },
    len: 1.9, top: 0.5, belly: 0.22, hump: 0, rumpDrop: 0,
    head: { len: 0.75, h: 0.24, snout: "long", neck: 0.05, lift: -0.12, ear: "small", eyeTop: true },
    leg: { w: 0.12, foot: "toes" }, tail: { len: 2.0, thick: true },
    col: { body: "#5d6b3e", dark: "#47532f", belly: "#c9c08f", accent: "#e8e0b0", mouth: "#e7b5a6" }, gait: { stride: 0.6 },
  },
};
/** tailles réelles (m) pour les comparaisons d'échelle et le vérificateur */
export const REAL: Record<string, { h: number; l: number; label?: string }> = {
  hippo: { h: 1.5, l: 4.0 }, lion: { h: 1.2, l: 2.5 }, elephant: { h: 3.2, l: 6.5 }, buffalo: { h: 1.6, l: 3.2 }, rhino: { h: 1.7, l: 3.8 }, crocodile: { h: 0.5, l: 4.5 },
  human: { h: 1.75, l: 0.5 }, child: { h: 1.3, l: 0.4 }, car: { h: 1.5, l: 4.2 }, canoe: { h: 0.4, l: 5.0 },
};

const rotP = ([x, y]: V, a: number): V => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const pt = (p: V, k: number) => `${(p[0] * k).toFixed(1)},${(p[1] * k).toFixed(1)}`;
/** IK deux segments : renvoie le genou. `bend` = +1 genou vers l'avant (+x), -1 vers l'arrière. */
const ik = (a: V, b: V, l1: number, l2: number, bend: number): V => {
  const dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999);
  const ang = Math.atan2(dy, dx); const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, c)));
  const k = ang - bend * off; return [a[0] + Math.cos(k) * l1, a[1] + Math.sin(k) * l1];
};

export type QuadState = {
  sweat?: boolean;
  /** distance parcourue (m) — pilote la marche ; 0 et constant = arrêt */
  dist?: number; moving?: boolean; run?: boolean;
  gape?: number; // ouverture totale de la gueule (°)
  headDown?: number; // inclinaison de la tête vers le bas (°) : broute, charge
  T: number; // temps (respiration, oreilles)
};

/** Pieds : marche latérale (PG 0, AG .25, PD .5, AD .75), appui 65 %, pied d'appui FIXE au sol. */
export const quadFeet = (q: Quad, st: QuadState) => {
  const stride = (q.gait?.stride ?? 1) * (st.run ? 1.6 : 1);
  const stance = st.run ? 0.45 : 0.65, reach = stride / 2, lift = q.belly * (st.run ? 0.35 : 0.22);
  const ph = st.moving ? (st.dist ?? 0) / stride : 0;
  const legs = [
    { id: "hf", hip: [-q.len * 0.32, -q.belly - 0.12] as V, off: 0.5, near: false },
    { id: "ff", hip: [q.len * 0.34, -q.belly - 0.1] as V, off: 0.75, near: false },
    { id: "hn", hip: [-q.len * 0.32 + 0.06, -q.belly - 0.12] as V, off: 0, near: true },
    { id: "fn", hip: [q.len * 0.34 + 0.06, -q.belly - 0.1] as V, off: 0.25, near: true },
  ];
  return legs.map((L) => {
    const u = (((ph + L.off) % 1) + 1) % 1;
    let x: number, y = 0, planted = true;
    if (!st.moving) x = 0;
    else if (u < stance) x = reach - (u / stance) * 2 * reach; // appui : le pied recule à la vitesse du corps → immobile au sol
    else { const v = (u - stance) / (1 - stance); x = -reach + v * 2 * reach; y = -Math.sin(Math.PI * v) * lift; planted = false; }
    return { ...L, foot: [L.hip[0] + x, y] as V, planted };
  });
};

/** Quadrupède dessiné à l'échelle `ppm` (px/m), tourné vers la droite (`flip` → vers la gauche). */
export const QuadP: React.FC<{ q: Quad | string; x: number; y: number; ppm: number; st: QuadState; flip?: boolean; shadow?: boolean; o?: number }> = ({ q: qq, x, y, ppm, st, flip, shadow = true, o = 1 }) => {
  const q = typeof qq === "string" ? SPECIES[qq] : qq;
  const k = ppm;
  const bob = st.moving ? Math.abs(Math.sin(((st.dist ?? 0) / ((q.gait?.stride ?? 1) * (st.run ? 1.6 : 1))) * Math.PI * 2)) * 0.03 : Math.sin(st.T * 1.6) * 0.008;
  const feet = quadFeet(q, st);
  const C = q.col;
  const top = q.top, bel = q.belly, L = q.len, hu = q.hump ?? 0, rd = q.rumpDrop ?? 0;
  // tronc
  const body = `M${pt([-L / 2, -bel - 0.1], k)} C${pt([-L / 2 - 0.25, -bel - 0.1], k)} ${pt([-L / 2 - 0.3, -top + rd], k)} ${pt([-L / 2 + 0.05, -top + rd], k)}
    C${pt([-L * 0.15, -top - 0.07], k)} ${pt([L * 0.2, -top - hu - 0.04], k)} ${pt([L * 0.42, -top - hu * 0.6], k)}
    C${pt([L / 2 + 0.15, -top + 0.05], k)} ${pt([L / 2 + 0.2, -bel - 0.05], k)} ${pt([L / 2 - 0.05, -bel + 0.02], k)}
    C${pt([L * 0.2, -bel + 0.08], k)} ${pt([-L * 0.2, -bel + 0.1], k)} ${pt([-L / 2, -bel - 0.1], k)} Z`;
  // tête : charnière de la mâchoire
  const H = q.head;
  const neckBase: V = [L / 2 - 0.05, -top * 0.78];
  const hinge: V = [L / 2 + H.neck, -top + H.lift + H.h * 0.62];
  const down = ((st.headDown ?? 0) * Math.PI) / 180;
  const g = ((st.gape ?? 0) * Math.PI) / 180;
  const up = -g * 0.62 + down, lo = g * 0.3 + down; // headDown > 0 = tête vers le bas (sens horaire, profil vers la droite)
  const leg = (f: (typeof feet)[number]) => {
    const hip = f.hip; const foot: V = [f.foot[0], f.foot[1] - 0.06];
    const l1 = (bel + 0.06) * 0.515, l2 = (bel + 0.06) * 0.515; // presque tendue à l'arrêt (pattes colonnes)
    const front = f.id[0] === "f";
    const knee = ik(hip, foot, l1, l2, front ? 1 : -1);
    const col = f.near ? C.body : C.dark; const w = q.leg.w * k;
    return <g key={f.id}>
      <path d={`M${pt(hip, k)} L${pt(knee, k)} L${pt(foot, k)}`} stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {q.leg.foot === "toes" && [-1, 0, 1].map((i) => <ellipse key={i} cx={(foot[0] + i * q.leg.w * 0.3) * k} cy={(foot[1] + 0.04) * k} rx={q.leg.w * 0.16 * k} ry={q.leg.w * 0.12 * k} fill={f.near ? C.belly : C.dark} />)}
      {q.leg.foot === "hoof" && <path d={`M${(foot[0] - q.leg.w * 0.5) * k},${(foot[1] + 0.02) * k} l${q.leg.w * k},0 l${-q.leg.w * 0.1 * k},${0.08 * k} l${-q.leg.w * 0.8 * k},0 Z`} fill="#2b2420" />}
      {q.leg.foot === "column" && <ellipse cx={foot[0] * k} cy={(foot[1] + 0.04) * k} rx={q.leg.w * 0.55 * k} ry={0.05 * k} fill={C.accent} opacity={0.6} />}
    </g>;
  };
  const tailBase: V = [-L / 2 - 0.12, -top + rd + 0.15];
  const sw = Math.sin(st.T * 2.2) * 0.12;
  const tailEnd: V = add(tailBase, [-q.tail.len * 0.45, q.tail.len * (q.tail.thick ? 0.1 : 0.85) + sw * 0.3]);
  return (
    <g transform={`translate(${x},${y + -bob * k}) scale(${flip ? -1 : 1},1)`} opacity={o}>
      {shadow && <ellipse cx={0} cy={bob * k} rx={L * 0.62 * k} ry={0.09 * k} fill="#1d2a30" opacity={0.22} />}
      {feet.filter((f) => !f.near).map(leg)}
      {q.tail.thick
        ? <path d={`M${pt([-L / 2, -bel - 0.05], k)} Q${pt([-L / 2 - q.tail.len * 0.5, -bel * 0.4 + sw * 0.2], k)} ${pt([-L / 2 - q.tail.len, -0.05], k)} Q${pt([-L / 2 - q.tail.len * 0.4, -top * 0.7], k)} ${pt([-L / 2 + 0.05, -top + 0.05], k)} Z`} fill={C.body} />
        : <path d={`M${pt(tailBase, k)} Q${pt(add(tailBase, [-q.tail.len * 0.4, q.tail.len * 0.2]), k)} ${pt(tailEnd, k)}`} stroke={C.dark} strokeWidth={Math.max(2, q.leg.w * 0.18 * k)} fill="none" strokeLinecap="round" />}
      {q.tail.tuft && !q.tail.thick && <ellipse cx={tailEnd[0] * k} cy={tailEnd[1] * k} rx={0.06 * k} ry={0.1 * k} fill={q.mane ?? C.dark} />}
      <path d={body} fill={C.body} />
      <path d={`M${pt([-L / 2 + 0.1, -bel - 0.02], k)} Q${pt([0, -bel + 0.14], k)} ${pt([L / 2 - 0.1, -bel + 0.02], k)} Q${pt([0, -bel - 0.1], k)} ${pt([-L / 2 + 0.1, -bel - 0.02], k)} Z`} fill={C.belly} opacity={0.75} />
      {q.stripes && [0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${pt([-L / 2 + 0.3 + i * L / 7, -top + 0.02], k)} q${0.08 * k},${(top - bel) * 0.5 * k} 0,${(top - bel) * 0.9 * k}`} stroke={q.stripes} strokeWidth={0.06 * k} fill="none" />)}
      {q.spots && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(-L / 2 + 0.25 + ((i * 0.37) % 1) * (L - 0.4)) * k} cy={(-top + 0.1 + ((i * 0.61) % 1) * (top - bel - 0.25)) * k} r={0.05 * k} fill={q.spots} />)}
      {(q.sweat || st.sweat) && <g><path d={body} fill="#c43a2c" opacity={0.13} />{Array.from({ length: 14 }, (_, i) => <g key={i}><ellipse cx={(-L / 2 + 0.25 + ((i * 0.43) % 1) * (L - 0.4)) * k} cy={(-top + 0.1 + ((i * 0.71) % 1) * (top - bel - 0.2)) * k} rx={0.018 * k} ry={0.06 * k} fill="#b8231a" opacity={0.75} /><circle cx={(-L / 2 + 0.25 + ((i * 0.43) % 1) * (L - 0.4) - 0.012) * k} cy={(-top + 0.1 + ((i * 0.71) % 1) * (top - bel - 0.2) - 0.025) * k} r={0.007 * k} fill="#ffd9c9" opacity={0.8} /></g>)}</g>}
      {feet.filter((f) => f.near).map(leg)}
      {/* cou + crinière */}
      <path d={`M${pt([neckBase[0] - 0.25, -top + 0.02], k)} L${pt(add(hinge, [0.1, -H.h * 0.85]), k)} L${pt(add(hinge, [0.15, 0.05]), k)} L${pt([neckBase[0] + 0.05, -bel], k)} Z`} fill={C.body} />
      {q.mane && <path d={`M${pt([neckBase[0] - 0.3, -top - 0.02], k)} Q${pt(add(hinge, [-0.15, -H.h * 1.25]), k)} ${pt(add(hinge, [0.12, -H.h * 0.9]), k)} Q${pt(add(hinge, [0.25, H.h * 0.35]), k)} ${pt(add(hinge, [0.05, H.h * 0.45]), k)} Q${pt([neckBase[0] - 0.05, -bel + 0.1], k)} ${pt([neckBase[0] - 0.3, -top - 0.02], k)} Z`} fill={q.mane} />}
      <Head q={q} hinge={hinge} up={up} lo={lo} k={k} T={st.T} />
    </g>
  );
};

/** Tête en deux pièces autour de la charnière : crâne (rotation `up`) et mâchoire (rotation `lo`). */
const Head: React.FC<{ q: Quad; hinge: V; up: number; lo: number; k: number; T: number }> = ({ q, hinge, up, lo, k, T }) => {
  const H = q.head, C = q.col; const l = H.len, h = H.h;
  const U = (p: V) => pt(add(hinge, rotP(p, up)), k), J = (p: V) => pt(add(hinge, rotP(p, lo)), k);
  const open = lo - up > 0.15;
  let skull = "", jaw = "", extra: React.ReactNode = null, teeth: React.ReactNode = null, eye: V = [l * 0.3, -h * 0.85], earP: V = [l * 0.12, -h * 0.92];
  if (H.snout === "box") { // hippopotame / rhinocéros
    skull = `M${U([-0.05, -0.1])} L${U([-0.02, -h * 0.82])} Q${U([l * 0.15, -h * 1.0])} ${U([l * 0.3, -h * 0.98])} Q${U([l * 0.45, -h * 0.82])} ${U([l * 0.62, -h * 0.7])} Q${U([l * 0.82, -h * 0.84])} ${U([l * 0.9, -h * 0.72])} Q${U([l * 1.03, -h * 0.6])} ${U([l, -h * 0.25])} L${U([l * 0.96, -h * 0.14])} L${U([0.05, -h * 0.14])} Z`;
    jaw = `M${J([-0.04, -h * 0.14])} L${J([l * 0.97, -h * 0.14])} Q${J([l * 1.02, h * 0.05])} ${J([l * 0.88, h * 0.16])} Q${J([l * 0.55, h * 0.24])} ${J([l * 0.22, h * 0.2])} Q${J([-0.02, h * 0.14])} ${J([-0.04, -h * 0.14])} Z`;
    eye = [l * 0.3, -h * 0.9]; earP = [l * 0.1, -h * 0.9];
    if (q.tusks) teeth = <g>
      {/* défenses (canines inférieures) recourbées vers le haut, incisives vers l'avant */}
      <path d={`M${J([l * 0.8, -h * 0.13])} Q${J([l * 0.78, -h * 0.13 - q.tusks * 0.55])} ${J([l * 0.9, -h * 0.13 - q.tusks * 0.75])} Q${J([l * 0.87, -h * 0.13 - q.tusks * 0.4])} ${J([l * 0.9, -h * 0.13])} Z`} fill="#f3ead2" stroke="#d9cdb0" strokeWidth={1.5} />
      <path d={`M${J([l * 0.92, -h * 0.16])} L${J([l * 1.12, -h * 0.22])} L${J([l * 1.1, -h * 0.12])} L${J([l * 0.94, -h * 0.08])} Z`} fill="#f3ead2" />
      {open && <path d={`M${U([l * 0.82, -h * 0.14])} L${U([l * 0.86, -h * 0.02])} L${U([l * 0.9, -h * 0.14])} Z`} fill="#f3ead2" />}
    </g>;
    if (q.horns === "rhino") extra = <><path d={`M${U([l * 0.78, -h * 0.75])} Q${U([l * 0.95, -h * 1.55])} ${U([l * 0.92, -h * 1.75])} Q${U([l * 0.9, -h * 1.2])} ${U([l * 0.96, -h * 0.66])} Z`} fill={C.accent} /><path d={`M${U([l * 0.5, -h * 0.8])} Q${U([l * 0.6, -h * 1.15])} ${U([l * 0.6, -h * 1.25])} Q${U([l * 0.62, -h * 1.0])} ${U([l * 0.66, -h * 0.75])} Z`} fill={C.accent} /></>;
    extra = <>{extra}<ellipse cx={0} cy={0} rx={0} ry={0} /><path d={`M${U([l * 0.84, -h * 0.74])} q${0.04 * k},${-0.015 * k} ${0.08 * k},0`} stroke="#3b2f3a" strokeWidth={0.02 * k} strokeLinecap="round" fill="none" /></>;
  } else if (H.snout === "cat" || H.snout === "bovine") {
    skull = `M${U([-0.03, -0.05])} L${U([0, -h * 0.85])} Q${U([l * 0.3, -h * 1.05])} ${U([l * 0.6, -h * 0.8])} Q${U([l * 0.95, -h * 0.6])} ${U([l, -h * 0.3])} L${U([l * 0.97, -h * 0.12])} L${U([0.03, -h * 0.1])} Z`;
    jaw = `M${J([0, -h * 0.1])} L${J([l * 0.9, -h * 0.12])} Q${J([l * 0.88, h * 0.08])} ${J([l * 0.6, h * 0.1])} Q${J([l * 0.2, h * 0.12])} ${J([0, -h * 0.1])} Z`;
    eye = [l * 0.55, -h * 0.68]; earP = [l * 0.15, -h * 0.95];
    teeth = H.snout === "cat" ? <path d={`M${U([l * 0.8, -h * 0.12])} L${U([l * 0.83, h * 0.06])} L${U([l * 0.87, -h * 0.12])} Z`} fill="#f3ead2" /> : null;
    if (q.horns === "buffalo") extra = <path d={`M${U([l * 0.05, -h * 0.98])} Q${U([-l * 0.5, -h * 0.9])} ${U([-l * 0.45, -h * 0.2])} Q${U([-l * 0.25, -h * 0.65])} ${U([l * 0.2, -h * 0.8])} Q${U([l * 0.55, -h * 1.0])} ${U([l * 0.75, -h * 1.45])} Q${U([l * 0.45, -h * 1.25])} ${U([l * 0.05, -h * 0.98])} Z`} fill="#9a8f80" stroke="#2b2420" strokeWidth={2} />;
  } else if (H.snout === "long") { // crocodile
    skull = `M${U([-0.03, -0.02])} L${U([0, -h * 0.9])} Q${U([l * 0.2, -h * 1.15])} ${U([l * 0.35, -h * 0.75])} L${U([l, -h * 0.45])} L${U([l, -h * 0.12])} L${U([0, -h * 0.1])} Z`;
    jaw = `M${J([0, -h * 0.1])} L${J([l, -h * 0.1])} L${J([l * 0.95, h * 0.25])} Q${J([l * 0.3, h * 0.5])} ${J([0, h * 0.2])} Z`;
    eye = [l * 0.2, -h * 1.0]; earP = [l * 0.05, -h * 0.9];
    teeth = <g>{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${U([l * (0.25 + i * 0.08), -h * 0.12])} l${0.012 * k},${0.05 * k} l${0.012 * k},${-0.05 * k} Z`} fill="#f3ead2" />)}</g>;
  } else { // trompe (éléphant)
    skull = `M${U([-0.05, -0.1])} L${U([0, -h * 0.9])} Q${U([l * 0.4, -h * 1.15])} ${U([l * 0.75, -h * 0.85])} Q${U([l * 0.95, -h * 0.5])} ${U([l * 0.85, -h * 0.2])} L${U([0, -h * 0.12])} Z`;
    jaw = `M${J([0.05, -h * 0.12])} L${J([l * 0.6, -h * 0.12])} Q${J([l * 0.55, h * 0.1])} ${J([0.2, h * 0.05])} Z`;
    const sw = Math.sin(T * 1.3) * 0.15;
    extra = <path d={`M${U([l * 0.8, -h * 0.55])} Q${U([l * 1.05, -h * 0.1])} ${U([l * 0.95 + sw * 0.3, h * 0.8])} Q${U([l * 0.95 + sw, h * 1.25])} ${U([l * 1.1 + sw, h * 1.35])} L${U([l * 0.98 + sw, h * 1.45])} Q${U([l * 0.75 + sw, h * 1.2])} ${U([l * 0.75, h * 0.5])} Q${U([l * 0.7, -h * 0.05])} ${U([l * 0.55, -h * 0.3])} Z`} fill={C.body} />;
    eye = [l * 0.45, -h * 0.65]; earP = [l * 0.05, -h * 0.75];
    if (q.tusks) teeth = <path d={`M${U([l * 0.62, -h * 0.25])} Q${U([l * 0.95, -h * 0.05])} ${U([l * 1.15, -h * 0.35 - q.tusks * 0.1])} Q${U([l * 0.95, h * 0.05])} ${U([l * 0.6, -h * 0.12])} Z`} fill={C.accent} />;
  }
  const eyeP = add(hinge, rotP(eye, up)), earPos = add(hinge, rotP(earP, up));
  const wig = Math.sin(T * 7) > 0.92 ? 0.25 : 0;
  return <g>
    {open && <path d={`M${U([0.02, -h * 0.13])} L${U([l * 0.95, -h * 0.13])} L${J([l * 0.95, -h * 0.13])} L${J([0.02, -h * 0.13])} Z`} fill={C.mouth ?? "#c96b6b"} />}
    <path d={jaw} fill={C.body} stroke={open ? C.dark : "none"} strokeWidth={0.022 * k} strokeLinejoin="round" />
    {open && <path d={`M${J([0.06, -h * 0.12])} L${J([l * 0.9, -h * 0.12])} L${J([l * 0.8, -h * 0.02])} L${J([0.1, -h * 0.04])} Z`} fill="#c35a6a" opacity={0.8} />}
    {open && <ellipse cx={(hinge[0] + Math.cos(lo) * l * 0.45 + Math.sin(lo) * h * 0.1) * k} cy={(hinge[1] + Math.sin(lo) * l * 0.45 - Math.cos(lo) * h * 0.1) * k} rx={l * 0.28 * k} ry={h * 0.1 * k} transform={`rotate(${lo * 57.3},${(hinge[0] + Math.cos(lo) * l * 0.45 + Math.sin(lo) * h * 0.1) * k},${(hinge[1] + Math.sin(lo) * l * 0.45 - Math.cos(lo) * h * 0.1) * k})`} fill="#b04a5c" />}
    {teeth}
    {H.ear === "big"
      ? <path d={`M${pt(add(earPos, [0.05, -0.1]), k)} Q${pt(add(earPos, [-0.75, -0.2]), k)} ${pt(add(earPos, [-0.55, 0.8]), k)} Q${pt(add(earPos, [-0.1, 0.95]), k)} ${pt(add(earPos, [0.1, 0.5]), k)} Z`} fill={q.col.dark} />
      : <ellipse cx={earPos[0] * k} cy={(earPos[1] - (H.ear === "pointed" ? 0.06 : 0.03)) * k} rx={(H.ear === "round" ? 0.07 : 0.045) * k} ry={(H.ear === "pointed" ? 0.1 : 0.06) * k} fill={q.col.dark} transform={`rotate(${(-20 + wig * 60) * (up < -0.3 ? 0 : 1)},${earPos[0] * k},${earPos[1] * k})`} />}
    <path d={skull} fill={C.body} stroke={open ? C.dark : "none"} strokeWidth={0.022 * k} strokeLinejoin="round" />
    {extra}
    {H.snout === "box" && <path d={`M${U([0.02, -h * 0.5])} Q${U([l * 0.35, -h * 0.4])} ${U([l * 0.55, -h * 0.55])}`} stroke={C.accent} strokeWidth={0.05 * k} fill="none" opacity={0.6} strokeLinecap="round" />}
    {H.eyeTop && <ellipse cx={eyeP[0] * k} cy={eyeP[1] * k} rx={0.08 * k} ry={0.06 * k} fill={C.body} />}
    <ellipse cx={eyeP[0] * k} cy={eyeP[1] * k} rx={0.042 * k} ry={(Math.sin(T * 0.9) > 0.985 ? 0.008 : 0.04) * k} fill="#1d1a18" />
    <circle cx={(eyeP[0] + 0.012) * k} cy={(eyeP[1] - 0.012) * k} r={0.012 * k} fill="#fff" opacity={0.8} />
  </g>;
};

/** Position écran (px, repère du QuadP) d'un point d'anatomie nommé, pour les flèches d'infographie. */
export const partPos = (qq: Quad | string, part: string, ppm: number, st: { gape?: number; headDown?: number } = {}): V | null => {
  const q = typeof qq === "string" ? SPECIES[qq] : qq; const P = q.parts?.[part]; if (!P) return null;
  if (P.on === "body") return [P.p[0] * ppm, P.p[1] * ppm];
  const H = q.head; const hinge: V = [q.len / 2 + H.neck, -q.top + H.lift + H.h * 0.62];
  const g = ((st.gape ?? 0) * Math.PI) / 180, down = ((st.headDown ?? 0) * Math.PI) / 180;
  const r = P.on === "head" ? -g * 0.62 + down : g * 0.3 + down;
  const p = add(hinge, rotP(P.p, r)); // points de tête en mètres, relatifs à la charnière
  return [p[0] * ppm, p[1] * ppm];
};

/** Hauteur totale dessinée (m) — sert au contrôle d'échelle. */
export const quadHeight = (q: Quad) => Math.max(q.top + (q.hump ?? 0), q.top - q.head.lift + q.head.h * 0.4);
