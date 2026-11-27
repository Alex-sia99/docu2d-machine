// Docu2D — MONDES en plan-séquence (coupe latérale : ciel, terre, eau avec ce qui se passe SOUS la surface).
// Repère monde en PIXELS (PPM px = 1 m), surface de l'eau à y = 0, y positif vers le bas. La caméra voyage entre des
// « spots » ; les scènes (presets) sont des fonctions PURES du temps, partagées entre le rendu et le vérificateur.
import React from "react";
import { AbsoluteFill, random } from "remotion";
import { QuadP, SPECIES, quadFeet, V } from "./bestiary";
import { PersonSide, PersonFront, sideGeom, frontGeom } from "../cast2d/people";
import { CAST, rigScale } from "../cast2d/cast";
import { walkSide } from "../cast2d/walk";
import { PS, FS } from "../cast2d/rig";
import { Resolved } from "./timing";

export const PPM = 110;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const sm = (u: number) => { const x = cl(u); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ------------------------------------------------------------------------------------------------ terrain (mètres)
const SAV_PTS: [number, number][] = [[-400, -1], [17, -1], [24, 1.25], [40, 1.25], [44.5, 3.6], [62, 3.6], [68, 0.7], [72, -1], [600, -1]];
const OCEAN_PTS: [number, number][] = [[-400, -1], [10, -1], [16, 0.8], [40, 2.5], [80, 8], [140, 14], [600, 18]];
const groundOf = (pts: [number, number][]) => (xm: number) => {
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; if (xm <= x1) { const u = (xm - x0) / (x1 - x0); return lerp(y0, y1, sm(u)); } }
  return pts[pts.length - 1][1];
};
export type WorldKind = "savane" | "ocean" | "jungle";
export const ground = (kind: string) => { const g = groundOf(kind === "ocean" ? OCEAN_PTS : SAV_PTS); return (xpx: number) => g(xpx / PPM) * PPM; };

/** Spots caméra (mètres) : x, y = centre de l'écran, z = zoom. */
export const SPOTS: Record<string, { x: number; y: number; z: number }> = {
  plain: { x: -6, y: -1.6, z: 1.15 }, bank: { x: 12, y: -1.6, z: 1.1 }, river: { x: 33, y: 0.1, z: 1.15 }, herd: { x: 33, y: 0.25, z: 0.95 },
  under: { x: 53, y: 1.8, z: 0.8 }, far: { x: 88, y: -1.9, z: 1.0 }, wide: { x: 28, y: -1.5, z: 0.36 }, sky: { x: 10, y: -6, z: 0.7 },
  canoe: { x: 33, y: -0.6, z: 1.3 }, canoeSolo: { x: 42.5, y: -0.4, z: 1.2 }, portrait: { x: -4.2, y: -2.1, z: 2.5 }, night: { x: 7.5, y: -2.0, z: 0.74 }, calf: { x: 31, y: -0.4, z: 1.7 }, deep: { x: 52, y: 2.3, z: 1.25 },
};
export type Cam = { x: number; y: number; z: number };
const camOf = (b?: Resolved): Cam => {
  if (!b) return SPOTS.wide;
  const s = SPOTS[b.spot] || (b.preset === "canoe" && b.solo ? SPOTS.canoeSolo : null) || SPOTS[PRESET_SPOT[b.preset as string]] || SPOTS.river;
  return { x: b.cx ?? s.x, y: b.cy ?? s.y, z: b.zoom ?? s.z };
};
const PRESET_SPOT: Record<string, string> = { canoe: "canoe", night: "night", calf: "calf", nurse: "deep", under: "deep", sleep: "deep", gape: "calf", charge: "plain", graze: "plain", sweat: "bank", herd: "herd", pass: "herd", cross: "plain", drink: "bank", portrait: "portrait", wide: "wide" };

/** caméra lissée entre deux beats monde (1,1 s, ease in-out) */
export const camAt = (cur: Resolved | undefined, prev: Resolved | undefined, T: number): Cam => {
  const a = camOf(prev), b = camOf(cur); if (!cur) return b;
  const u = sm((T - cur.t0) / 1.1);
  // légère dérive continue (plan-séquence vivant)
  const drift = (T - cur.t0) * 0.08;
  return { x: lerp(a.x, b.x, u) + drift, y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
};

// ------------------------------------------------------------------------------------------------ scènes (pures)
export type Hippo = { id: string; x: number; y: number; flip?: boolean; s?: number; st: { dist?: number; moving?: boolean; run?: boolean; gape?: number; headDown?: number; sweat?: boolean }; onGround?: boolean };
export type Human = { id: string; c: string; kind: "side" | "front"; x: number; y: number; dir?: 1 | -1; pose?: any; feet?: any; hipY?: number; inWater?: boolean; seated?: boolean };
export type Canoe = { x: number; y: number; tilt: number; dir: 1 | -1 };
export type Scene = { hippos: Hippo[]; humans: Human[]; canoes: Canoe[]; paddles: { a: V; b: V }[]; splashes: { x: number; t: number }[]; dark: number; night: number; arrows: { a: V; b: V; col: string }[]; crosses: V[]; bubbles: V[] };

const ev = (b: Resolved, name: string) => { const e = (b.events || []).find((x: any) => x.do === name); return e ? (e._t as number) : Infinity; };
/** Espèces qui vivent DANS l'eau (R5) : les autres ne sont jamais posées dans la rivière. */
export const AQUATIC = new Set(["hippo", "crocodile"]);
export const GAPERS = new Set(["hippo", "crocodile", "lion"]);
/** Encombrement horizontal (m) d'un animal centré en 0, tourné vers la droite : [arrière, avant]. */
export const extentOf = (species: string, s = 1): [number, number] => { const q = SPECIES[species] || SPECIES.hippo; return [(q.len / 2 + 0.45) * s, (q.len / 2 + q.head.neck + q.head.len + 0.1) * s]; };
/**
 * Troupeau (R3/R4) : composition DIFFÉRENTE à chaque apparition (graine = beat), animaux placés bout à bout avec un
 * écart — jamais l'un dans l'autre, jamais tête contre tête —, vie : respiration, plongées décalées, bâillement rare.
 * Espèce terrestre : troupeau dans la plaine, têtes basses, qui avance lentement et ENSEMBLE (aucun tapis roulant).
 */
const herdOf = (T: number, seed: string, species: string, dt = 0): Hippo[] => {
  const aquatic = AQUATIC.has(species);
  const zone = aquatic ? [25.3, 41] : [-15, 4];
  const n = 3 + Math.floor(random(seed + "n") * 2);
  const out: Hippo[] = []; let x = zone[0] + random(seed + "x") * 1.2;
  const landDir = random(seed + "d") < 0.5; // le troupeau terrestre avance dans une seule direction
  for (let i = 0; i < n; i++) {
    const s = random(seed + "s" + i) < 0.3 ? 0.78 : 1;
    const flip = aquatic ? random(seed + "f" + i) < 0.35 : landDir;
    const [back, front] = extentOf(species, s);
    const cx = flip ? x + front : x + back;
    const right = flip ? cx + back : cx + front;
    if (right > zone[1]) break;
    x = right + 0.5 + random(seed + "g" + i) * 1.4;
    if (aquatic) {
      // plongée lente toutes les 14-22 s (décalée par animal) : seuls les yeux et les oreilles restent dehors
      const per = 14 + random(seed + "p" + i) * 8, ph = ((T + random(seed + "o" + i) * per) % per) / per;
      const dive = ph > 0.7 ? Math.sin(((ph - 0.7) / 0.3) * Math.PI) : 0;
      const yawn = GAPERS.has(species) && i === 1 && random(seed + "y") < 0.6 ? Math.max(0, Math.sin(T * 0.4 + i) - 0.93) * 1600 : 0;
      out.push({ id: `h${i}`, x: cx * PPM, y: (1.25 - Math.max(0, Math.sin(T * 1.1 + i)) * 0.012 - dive * 0) * PPM, flip, s, st: { gape: Math.min(110, yawn) } });
    } else {
      const v = 0.35; const d = Math.min(Math.max(0, dt) * v, 6); // avance réelle depuis le début de la scène, bornée (reste dans la plaine)
      out.push({ id: `h${i}`, x: (cx + (flip ? -d : d)) * PPM, y: -1 * PPM, flip, s, st: { moving: true, dist: d, headDown: 22 + Math.sin(T * 0.9 + i) * 8 }, onGround: true });
    }
  }
  return out;
};
/** pose assise de pagayeur dans un canoë (profil), mains sur la pagaie */
const paddler = (id: string, c: string, cx: number, wy: number, dir: 1 | -1, T: number, speed = 1): { h: Human; paddle: { a: V; b: V } } => {
  const s = rigScale(CAST[c], PPM);
  const hip: V = [cx, wy - 0.12 * PPM];
  const ph = T * 2.4 * speed;
  const sw = Math.sin(ph);
  // pagaie : poignée haute devant l'épaule, pale dans l'eau sur le côté ; le coup va de l'avant vers l'arrière
  const top: V = [cx + dir * (18 + sw * 16) * s, hip[1] - 108 * s];
  const blade: V = [cx + dir * (60 - sw * 70) * s, wy + 0.35 * PPM];
  const along = (u: number): V => [top[0] + (blade[0] - top[0]) * u, top[1] + (blade[1] - top[1]) * u];
  const pose = { torso: 8 + sw * 6, thigh: 90, shin: 90, thigh2: 90, shin2: 90, hand: along(0.06), hand2: along(0.36) };
  return { h: { id, c, kind: "side", x: hip[0], y: hip[1], dir, pose, seated: true }, paddle: { a: top, b: blade } };
};

/** Preset effectif selon l'espèce (R5) : une scène aquatique devient sa version terrestre pour un animal terrestre. */
export const presetFor = (p: string | undefined, species: string) => {
  if (!p) return p;
  if (AQUATIC.has(species)) return p;
  return ({ under: "graze", sleep: "graze", nurse: "calf", sweat: "graze", gape: GAPERS.has(species) ? "gape" : "portrait" } as Record<string, string>)[p] || p;
};
export const sceneAt = (kind: string, cur: Resolved | undefined, T: number, species = "hippo"): Scene => {
  const S: Scene = { hippos: [], humans: [], canoes: [], paddles: [], splashes: [], dark: 0, night: cur?.night ?? 0, arrows: [], crosses: [], bubbles: [] };
  if (kind !== "savane") return S;
  const b = cur; const p = presetFor(b?.preset as string | undefined, species); const t0 = b?.t0 ?? 0, dt = T - t0;
  const aquatic = AQUATIC.has(species);
  const herd = b?.herd !== false && (p === "herd" || p === "wide" || false);
  if (herd) S.hippos.push(...herdOf(T, (b?.id || "w") + (b?.line || ""), species, dt));
  if (!b) return S;
  const hero = b.hero || {};
  if (p === "canoe" || p === "pass") {
    // deux canoës qui descendent le fleuve ; « surface » : l'hippopotame surgit sous le premier, « flip » : il chavire,
    // « dark » : l'animal remonte sous le second → noir. Jamais de gros plan sur l'attaque (pas de violence montrée).
    S.hippos = S.hippos.filter((h) => h.x < 31 * PPM || p === "pass");
    const tS = ev(b, "surface"), tF = ev(b, "flip"), tD = ev(b, "dark"), tP = ev(b, "rush");
    const v = 0.35 * PPM;
    const x2 = 33.6 * PPM + Math.min(dt, (tS - t0)) * v * 0.6; // canoë d'Evans (devant)
    const x1 = (b.solo ? 38.5 : 29.2) * PPM + dt * v * 0.6 + (T > tP ? (T - tP) * 0.5 * PPM : 0); // canoë de Paul
    const rise = sm((T - tS) / 0.7) * (T > tF + 1.2 ? Math.max(0, 1 - (T - tF - 1.2) / 1.5) : 1);
    const flip = sm((T - tF) / 0.6);
    const tilt2 = flip * 172 + rise * 12; // chaviré = coque à l'envers qui flotte (jamais dressé à la verticale)
    const solo = !!b.solo; // fin de vidéo : Paul seul, l'hippopotame refait surface À CÔTÉ du canoë
    if (!solo) S.canoes.push({ x: x2 + flip * 0.8 * PPM, y: -rise * 0.4 * PPM * (1 - flip) + flip * 0.1 * PPM, tilt: tilt2, dir: 1 });
    if (solo) { /* rien : pas de canoë d'Evans */ } else if (flip < 0.35) { const pd = paddler("evans", "evans", x2 - 0.6 * PPM, -rise * 0.55 * PPM, 1, T); pd.h.pose.torso += rise * 25; S.humans.push(pd.h); S.paddles.push(pd.paddle); }
    else S.humans.push({ id: "evans", c: "evans", kind: "front", x: x2 + 1.4 * PPM, y: 0, inWater: true, hipY: 0.7 * PPM });
    const heroX = solo ? x1 + 6.6 * PPM : x2 + 0.3 * PPM; // à côté du canoë, jamais dessous
    if (T > tS) S.hippos.push({ id: "hero", x: heroX, y: solo ? lerp(3.6, 1.12, sm((T - tS) / 1.6)) * PPM : (1.25 - rise * 0.75) * PPM, flip: solo, st: { gape: !solo && T > tF ? 40 : 0 } });
    if (T > tS && T < tS + 1.4) S.splashes.push({ x: heroX, t: T - tS });
    if (T > tF && T < tF + 1.4) S.splashes.push({ x: x2 + 1.2 * PPM, t: T - tF });
    const pd1 = paddler("paul", "paul", x1, 0, 1, T, T > tP ? 1.8 : 1);
    S.humans.push(pd1.h); S.paddles.push(pd1.paddle); S.canoes.push({ x: x1 + 0.6 * PPM, y: 0, tilt: 0, dir: 1 });
    S.dark = T > tD ? sm((T - tD) / 0.5) : 0;
  } else if (p === "night") {
    // nuit : l'hippopotame broute dans la plaine ; « return » : il rentre vers la rivière par le sentier ;
    // un pêcheur se trouve sur le sentier, ENTRE lui et l'eau → flèche + croix rouge (« obstacle »)
    S.night = b.night ?? 1;
    const tR = ev(b, "return"), tM = ev(b, "man"), tG = ev(b, "gape");
    const hx0 = -3 * PPM, hx1 = 6 * PPM;
    const back = T > tR ? sm((T - tR) / 5.5) : 0;
    const hx = lerp(hx0, hx1, back);
    S.hippos.push({ id: "hero", x: hx, y: -1 * PPM, flip: T < tR, st: { moving: T > tR && back < 1, dist: Math.abs(hx - hx0) / PPM, headDown: T < tR ? 32 : 0, gape: T > tG ? Math.min(140, (T - tG) * 260) : 0 }, onGround: true });
    if (T > tM) {
      const segT = Math.min(1, (T - tM) / 3.2);
      if (segT < 1) { const st = walkSide("pecheur", PPM, 16.5 * PPM, 10 * PPM, sm(segT), ground("savane")); S.humans.push({ id: "pecheur", c: "pecheur", kind: "side", x: st.x, y: st.y, dir: st.dir, pose: st.pose, feet: st.feet }); }
      else S.humans.push({ id: "pecheur", c: "pecheur", kind: "front", x: 10 * PPM, y: -1 * PPM });
      if (T > tM + 3.4) { S.arrows.push({ a: [hx + 2.6 * PPM, -2.9 * PPM], b: [19 * PPM, -2.9 * PPM], col: "#f2c14e" }); S.crosses.push([10 * PPM, -3.7 * PPM]); }
    }
  } else if (p === "graze") {
    S.hippos.push({ id: "hero", x: -6 * PPM, y: -1 * PPM, flip: random((b.id || "") + "gf") < 0.5, st: { headDown: 34 + Math.max(0, Math.sin(T * 2.2)) * 10, sweat: !!hero.sweat }, onGround: true });
  } else if (p === "charge") {
    const tC = Number.isFinite(ev(b, "go")) ? ev(b, "go") : t0 + 0.6;
    const u = T > tC ? Math.min(1, (T - tC) / 2.6) : 0; const d = 15 * (1 - (1 - u) * (1 - u)); // élan puis freinage (~30 km/h au départ)
    S.hippos.push({ id: "hero", x: (-14 + d) * PPM, y: -1 * PPM, st: { moving: u > 0 && u < 1, run: true, dist: d, headDown: u > 0 && u < 1 ? 12 : 0 }, onGround: true });
    if (u > 0 && u < 1) S.splashes.length = 0;
  } else if (p === "sweat") {
    S.hippos.push({ id: "hero", x: 11 * PPM, y: -1 * PPM, st: { sweat: T > ev(b, "sweat") || !b.events, gape: 0 }, onGround: true });
  } else if (p === "gape") {
    S.hippos = S.hippos.filter((h) => h.id !== "h2");
    const g = T > (Number.isFinite(ev(b, "open")) ? ev(b, "open") : t0 + 0.5) ? 150 * sm((T - (Number.isFinite(ev(b, "open")) ? ev(b, "open") : t0 + 0.5)) / 0.9) : 0;
    S.hippos.push({ id: "hero", x: 31 * PPM, y: 1.25 * PPM - 0.45 * PPM, st: { gape: g } });
  } else if (p === "calf" && !aquatic) {
    S.hippos.push({ id: "mother", x: -7 * PPM, y: -1 * PPM, st: { headDown: 20 }, onGround: true });
    S.hippos.push({ id: "calf", x: -3.6 * PPM, y: -1 * PPM, s: 0.42, st: { headDown: 8 }, onGround: true });
  } else if (p === "cross") {
    // l'animal TRAVERSE un cadre fixe (marche réelle, 1,2 m/s) : on voit le décor rester en place
    const d = Math.min(15, Math.max(0, dt - 0.3) * 1.2);
    S.hippos.push({ id: "hero", x: (-14 + d) * PPM, y: -1 * PPM, st: { moving: d > 0 && d < 15, dist: d }, onGround: true });
  } else if (p === "drink") {
    const q = SPECIES[species] || SPECIES.hippo;
    S.hippos.push({ id: "hero", x: (16.6 - q.len / 2 - q.head.neck - q.head.len * 0.8) * PPM, y: -1 * PPM, st: { headDown: 42 + Math.sin(T * 1.6) * 4 }, onGround: true });
  } else if (p === "portrait") {
    S.hippos.push({ id: "hero", x: -6 * PPM, y: -1 * PPM, st: { headDown: Math.sin(T * 0.5) * 4 }, onGround: true });
  } else if (p === "calf") {
    S.hippos.push({ id: "mother", x: 31.5 * PPM, y: 1.25 * PPM, st: {} });
    S.hippos.push({ id: "calf", x: 31.2 * PPM, y: (1.25 - 1.4) * PPM, s: 0.32, st: {} }); // le petit se repose sur le dos de sa mère
  } else if (p === "nurse") {
    S.hippos = []; S.hippos.push({ id: "mother", x: 51 * PPM, y: 3.6 * PPM, st: {} });
    S.hippos.push({ id: "calf", x: 51.6 * PPM, y: 3.6 * PPM, s: 0.32, flip: true, st: { headDown: -10 } });
    S.bubbles.push(...Array.from({ length: 6 }, (_, i) => [51.2 * PPM + i * 6, (3.2 - ((T * 0.6 + i * 0.37) % 1) * 3) * PPM] as V));
  } else if (p === "under" || p === "sleep") {
    // marche au fond du chenal ; à mi-scène il pousse sur ses pattes et rebondit jusqu'à la surface pour respirer
    S.hippos = S.hippos.filter((h) => h.x < 40 * PPM);
    const tB = Number.isFinite(ev(b, "breathe")) ? ev(b, "breathe") : t0 + 4;
    const bounce = T > tB ? Math.sin(cl((T - tB) / 3) * Math.PI) : 0;
    const walking = p === "under";
    const d = walking ? Math.min(dt * 0.7, 12) : 0;
    S.hippos.push({ id: "hero", x: (47 + d) * PPM, y: (3.6 - bounce * 2.3) * PPM, st: { moving: walking && bounce < 0.05, dist: d } });
    S.bubbles.push(...Array.from({ length: 8 }, (_, i) => [(48 + d) * PPM + 1.4 * PPM + i * 5, (3.0 - ((T * 0.5 + i * 0.29) % 1) * 3) * PPM] as V));
  } else if (p === "herd") {
    // rien de plus : le troupeau ; le dominant (h3) ouvre la gueule de temps en temps
  }
  return S;
};

// ------------------------------------------------------------------------------------------------ vérificateur du monde
export type WIssue = { rule: string; msg: string };
export const checkScene = (S: Scene, T: number, kind = "savane", species = "hippo"): WIssue[] => {
  const out: WIssue[] = []; const G = ground(kind);
  for (const h of S.hippos) {
    const q = SPECIES[species] || SPECIES.hippo; const sc = h.s ?? 1;
    if (h.onGround) {
      // pieds d'appui SUR le sol (gabarit : semelle à y local 0 → sol)
      const d = h.y - G(h.x); if (Math.abs(d) > 3) out.push({ rule: "appui", msg: `t=${T.toFixed(2)} ${h.id} : ${d < 0 ? "flotte" : "s'enfonce"} de ${Math.abs(d).toFixed(1)} px` });
      for (const f of quadFeet(q, { ...h.st, T })) { const fx = h.x + (h.flip ? -1 : 1) * f.foot[0] * PPM * sc; if (f.planted && Math.abs(G(fx) - G(h.x)) > 4) out.push({ rule: "appui", msg: `t=${T.toFixed(2)} ${h.id} : pied sur une pente (${(G(fx) - G(h.x)).toFixed(1)} px)` }); }
    }
    if (h.y > G(h.x) + 3) out.push({ rule: "sol", msg: `t=${T.toFixed(2)} ${h.id} sous le sol` });
  }
  // R4 : deux animaux ne se chevauchent jamais (sauf le petit sur le dos / sous le ventre de sa mère)
  const box = (h: Hippo) => { const [bk, fr] = extentOf(species, h.s ?? 1); return h.flip ? [h.x - fr * PPM, h.x + bk * PPM] : [h.x - bk * PPM, h.x + fr * PPM]; };
  const an = S.hippos.filter((h) => h.id !== "calf");
  for (let i = 0; i < an.length; i++) for (let j = i + 1; j < an.length; j++) { const a = box(an[i]), c = box(an[j]); const ov = Math.min(a[1], c[1]) - Math.max(a[0], c[0]); if (ov > 6 && Math.abs(an[i].y - an[j].y) < 1.2 * PPM) out.push({ rule: "chevauchement", msg: `t=${T.toFixed(2)} ${an[i].id} et ${an[j].id} se chevauchent (${(ov / PPM).toFixed(1)} m)` }); }
  for (const p of S.humans) {
    if (p.seated || p.inWater) continue;
    if (p.kind === "side" && p.feet) for (const f of p.feet) { const d = f.p[1] - G(f.p[0]); if (f.stance && Math.abs(d) > 4) out.push({ rule: "appui", msg: `t=${T.toFixed(2)} ${p.id} : pied d'appui ${d < 0 ? "flotte" : "s'enfonce"} (${d.toFixed(1)} px)` }); }
    // personne debout jamais DANS un hippopotame
    for (const h of S.hippos) if (Math.abs(p.x - h.x) < ((SPECIES[species] || SPECIES.hippo).len / 2 + 0.6) * PPM * (h.s ?? 1) && Math.abs(p.y - h.y) < 1.5 * PPM) out.push({ rule: "chevauchement", msg: `t=${T.toFixed(2)} ${p.id} dans ${h.id}` });
  }
  for (const c of S.canoes) if (c.tilt < 30 && Math.abs(c.y) > 0.7 * PPM) out.push({ rule: "flottaison", msg: `t=${T.toFixed(2)} canoë décollé de l'eau (${c.y.toFixed(0)} px)` });
  return out;
};

// ------------------------------------------------------------------------------------------------ rendu
const skyCols = (n: number): [string, string] => {
  if (n <= 0.5) { const u = n / 0.5; return [mix("#8fc7dc", "#e77f55", u), mix("#f3dfb4", "#f4c07a", u)]; }
  const u = (n - 0.5) / 0.5; return [mix("#e77f55", "#0e2135", u), mix("#f4c07a", "#284660", u)];
};
function mix(a: string, b: string, u: number) { const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * u).toString(16).padStart(2, "0")).join(""); }

const Acacia: React.FC<{ x: number; y: number; s: number; col: string }> = ({ x, y, s, col }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M-4,0 L-3,-60 L-22,-88 M-3,-60 L16,-92 M-3,-40 L-30,-70" stroke={col} strokeWidth={6} fill="none" strokeLinecap="round" />
    <ellipse cx={-8} cy={-98} rx={62} ry={14} fill={col} /><ellipse cx={18} cy={-104} rx={40} ry={11} fill={col} /><ellipse cx={-34} cy={-90} rx={30} ry={9} fill={col} />
  </g>
);

export const WorldView: React.FC<{ kind: string; T: number; cam: Cam; S: Scene; species?: string; children?: React.ReactNode }> = ({ kind, T, cam, S, species = "hippo", children }) => {
  const z = cam.z; const G = ground(kind);
  const tx = (X: number) => (X - cam.x * PPM) * z + 960, ty = (Y: number) => (Y - cam.y * PPM) * z + 560;
  const n = S.night; const nn = n * 0.72; // la terre et les animaux restent lisibles la nuit (lune)
  const [skyA, skyB] = skyCols(n);
  const viewL = cam.x * PPM - 960 / z - 50, viewR = cam.x * PPM + 960 / z + 50;
  const pts: string[] = []; for (let X = viewL; X <= viewR; X += 20) pts.push(`${X.toFixed(0)},${G(X).toFixed(1)}`);
  const landPath = `M${viewL},4000 L${pts.join(" L")} L${viewR},4000 Z`;
  const waterTop = 0, deep = 20 * PPM;
  const wpts: string[] = []; for (let X = viewR; X >= viewL; X -= 20) wpts.push(`${X.toFixed(0)},${Math.max(0, G(X)).toFixed(1)}`);
  const waterPath = `M${viewL},0 L${viewR},0 L${wpts.join(" L")} Z`;
  const sunY = lerp(-5.5, -1.0, cl(n * 1.6)) * PPM;
  return (
    <AbsoluteFill style={{ background: skyB }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyA} /><stop offset="1" stopColor={skyB} /></linearGradient>
          <linearGradient id="wat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mix("#4f9aa6", "#173a4c", n)} stopOpacity={0.38} /><stop offset="1" stopColor={mix("#1f4a52", "#08161f", n)} stopOpacity={0.92} /></linearGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#sky)" />
        {/* étoiles + lune la nuit, soleil le jour */}
        {n > 0.55 && Array.from({ length: 70 }, (_, i) => <circle key={i} cx={random("sx" + i) * 1920} cy={random("sy" + i) * 600} r={random("sr" + i) * 1.8 + 0.4} fill="#fff" opacity={(n - 0.55) * 2 * (0.5 + 0.5 * Math.sin(T * 2 + i))} />)}
        <circle cx={1450 - cam.x * 2} cy={ty(sunY) * 0.5 + 120} r={n > 0.6 ? 44 : 70} fill={n > 0.6 ? "#f4f1df" : mix("#fff1c4", "#f39a5a", n * 1.5)} opacity={0.95} />
        {/* lointain : collines + acacias (parallaxe) */}
        <g transform={`translate(${-(cam.x * PPM * z) * 0.06},${ty(-1 * PPM) - 40 * z})`}>
          <path d={`M-1400,40 ${Array.from({ length: 40 }, (_, i) => { const x = -1400 + i * 160; const y = -40 - 70 * Math.abs(Math.sin(i * 0.9)) - 50 * Math.abs(Math.sin(i * 0.37 + 1)); return `L${x},${y.toFixed(0)}`; }).join(" ")} L5000,40 Z`} fill={mix(mix("#c9b98f", "#d49a6a", cl(n * 2)), "#1b2b3a", cl(n * 1.3 - 0.3))} opacity={0.75} />
        </g>
        <g transform={`translate(${-(cam.x * PPM * z) * 0.25},${ty(-1 * PPM) - 6 * z})`}>
          {Array.from({ length: 22 }, (_, i) => <Acacia key={i} x={i * 330 - 1200 + random("ac" + i) * 120} y={0} s={(0.6 + random("as" + i) * 0.5) * Math.max(0.5, z)} col={mix(mix("#6e6a3a", "#5a4630", cl(n * 2)), "#0f1a24", cl(n * 1.3 - 0.3))} />)}
        </g>
        <g transform={`translate(${960 - cam.x * PPM * z},${560 - cam.y * PPM * z}) scale(${z})`}>
          {/* eau (fond) + terre */}
          <clipPath id="wclip"><path d={waterPath} /></clipPath>
          <path d={waterPath} fill={mix("#3d7d86", "#0c2230", n)} />
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${17 * PPM + i * 7 * PPM + Math.sin(T * 0.3 + i) * 40},0 L${17 * PPM + i * 7 * PPM + 120},${5 * PPM} L${17 * PPM + i * 7 * PPM + 220},${5 * PPM} L${17 * PPM + i * 7 * PPM + 60},0 Z`} fill="#ffffff" opacity={0.05 * (1 - n)} />)}
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1" ><stop offset="0" stopColor={mix("#c9a86a", "#4a4634", nn)} /><stop offset="0.12" stopColor={mix("#a8834c", "#3a3628", nn)} /><stop offset="1" stopColor={mix("#5e4528", "#1e1c16", nn)} /></linearGradient>
          <path d={landPath} fill="url(#soil)" />
          {Array.from({ length: 30 }, (_, i) => { const X = viewL + random("st" + i) * (viewR - viewL); const Y = G(X) + 30 + random("sy" + i) * 260; return <ellipse key={i} cx={X} cy={Y} rx={10 + (i % 4) * 6} ry={5 + (i % 3) * 3} fill={mix("#7a5f3a", "#24201a", nn)} opacity={0.5} />; })}
          <path d={landPath} fill="none" stroke={mix("#8f7a45", "#20261d", n)} strokeWidth={6} />
          {/* herbes de la savane sur la terre ferme */}
          {Array.from({ length: 160 }, (_, i) => { const X = viewL + ((i * 97) % Math.max(1, viewR - viewL)); const Y = G(X); if (Y > -0.5 * PPM) return null; return <path key={i} d={`M${X},${Y} q${-4 + random("g" + i) * 8},-18 ${-10 + random("gg" + i) * 20},-26`} stroke={mix("#9a8a4a", "#3a4430", nn)} strokeWidth={3} fill="none" />; })}
          {/* roseaux aux berges */}
          {[18.5, 19.2, 20.1, 70.4, 71].map((xm, i) => <g key={i}>{[0, 1, 2, 3].map((j) => <path key={j} d={`M${xm * PPM + j * 9},${G(xm * PPM + j * 9)} q${4 + Math.sin(T + j) * 3},-60 ${-6 + j * 4},-110`} stroke={mix("#6f7f3a", "#1f2a1c", n)} strokeWidth={4} fill="none" />)}</g>)}
          {children}
          {/* acteurs */}
          {S.hippos.map((h) => <QuadP key={h.id} q={SPECIES[species] ? species : "hippo"} x={h.x} y={h.y} ppm={PPM * (h.s ?? 1)} st={{ T, ...h.st }} flip={h.flip} shadow={!!h.onGround} />)}
          {S.canoes.map((c, i) => <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.tilt * c.dir})`}><path d={`M${-2.5 * PPM},${-0.18 * PPM} Q0,${0.32 * PPM} ${2.5 * PPM},${-0.18 * PPM} L${2.3 * PPM},${-0.26 * PPM} L${-2.3 * PPM},${-0.26 * PPM} Z`} fill="#c0562e" /><path d={`M${-2.3 * PPM},${-0.24 * PPM} L${2.3 * PPM},${-0.24 * PPM}`} stroke="#7a3518" strokeWidth={5} /></g>)}
          {S.humans.map((p) => p.kind === "side"
            ? <PersonSide key={p.id} c={p.c} ppm={PPM} x={p.x} y={p.y} dir={p.dir} pose={p.pose} />
            : <PersonFront key={p.id} c={p.c} ppm={PPM} x={p.x} ground={p.inWater ? 1.2 * PPM : G(p.x)} hipY={p.hipY} T={T} pose={p.inWater ? { lh: [p.x - 45, -40], rh: [p.x + 45, -30] } : undefined} />)}
          {/* coque devant les jambes des pagayeurs */}
          {S.canoes.map((c, i) => c.tilt < 30 && <g key={"f" + i} transform={`translate(${c.x},${c.y}) rotate(${c.tilt * c.dir})`}><path d={`M${-2.5 * PPM},${-0.18 * PPM} Q0,${0.32 * PPM} ${2.5 * PPM},${-0.18 * PPM} L${2.4 * PPM},${-0.1 * PPM} Q0,${0.36 * PPM} ${-2.4 * PPM},${-0.1 * PPM} Z`} fill="#a9471f" /></g>)}
          {S.paddles.map((p, i) => <g key={i}><path d={`M${p.a[0]},${p.a[1]} L${p.b[0]},${p.b[1]}`} stroke="#8a6034" strokeWidth={6} strokeLinecap="round" /><ellipse cx={p.b[0]} cy={p.b[1]} rx={9} ry={26} fill="#8a6034" transform={`rotate(${Math.atan2(p.b[1] - p.a[1], p.b[0] - p.a[0]) * 57.3 - 90},${p.b[0]},${p.b[1]})`} /></g>)}
          {/* l'eau PAR-DESSUS : ce qui est immergé est teinté, la surface brille */}
          <g clipPath="url(#wclip)">
            <rect x={viewL} y={0} width={viewR - viewL} height={deep} fill="url(#wat)" />
            {Array.from({ length: 10 }, (_, i) => { const X = 18 * PPM + i * 5 * PPM + Math.sin(T * 0.25 + i) * 60; return <path key={i} d={`M${X},0 L${X + 160},${4.5 * PPM} L${X + 260},${4.5 * PPM} L${X + 70},0 Z`} fill="#fffbe6" opacity={0.06 * (1 - n)} />; })}
            {Array.from({ length: 50 }, (_, i) => <circle key={i} cx={18 * PPM + random("px" + i) * 52 * PPM} cy={(0.3 + ((random("py" + i) * 3.4 + T * 0.04 * (1 + (i % 3))) % 3.4)) * PPM} r={1.5 + (i % 3)} fill="#e8f4ef" opacity={0.35} />)}
          </g>
          {/* galets et herbes du lit */}
          {Array.from({ length: 40 }, (_, i) => { const X = 19 * PPM + random("gx" + i) * 52 * PPM; const Y = G(X); if (Y < 0.3 * PPM) return null; return i % 3 ? <ellipse key={i} cx={X} cy={Y - 3} rx={8 + (i % 4) * 5} ry={5 + (i % 3) * 2} fill={mix("#7d8a6a", "#16242a", n)} opacity={0.8} /> : <path key={i} d={`M${X},${Y} q${8 + Math.sin(T + i) * 6},-40 ${-4},-80`} stroke={mix("#4f7a4a", "#12241c", n)} strokeWidth={4} fill="none" />; })}
          <g clipPath="url(#wclip2)"><clipPath id="wclip2"><rect x={17.5 * PPM} y={-40} width={54 * PPM} height={80} /></clipPath><path d={`M${viewL},0 ${Array.from({ length: 80 }, (_, i) => { const X = viewL + (i * (viewR - viewL)) / 79; return `L${X.toFixed(0)},${(Math.sin(X * 0.02 + T * 2) * 3).toFixed(1)}`; }).join(" ")}`} stroke={mix("#d8f1f2", "#7aa0b0", n)} strokeWidth={4} fill="none" opacity={0.9} /></g>
          <path d={landPath} fill={kind === "ocean" ? "#d9c08a" : mix("#a98c56", "#2c2b21", cl(n * 1.2))} opacity={0} />
          {S.bubbles.map((b, i) => <circle key={i} cx={b[0]} cy={b[1]} r={5 + (i % 3) * 2} fill="none" stroke="#dff4f6" strokeWidth={2} opacity={0.7} />)}
          {S.splashes.map((s, i) => <g key={i} opacity={1 - s.t / 1.4}>{[-1, -0.5, 0, 0.5, 1].map((k) => <path key={k} d={`M${s.x + k * 40},0 q${k * 30},${-90 * Math.sin(Math.min(1, s.t * 1.5) * Math.PI)} ${k * 70},-10`} stroke="#ffffff" strokeWidth={6} fill="none" strokeLinecap="round" />)}</g>)}
          {S.arrows.map((a, i) => <g key={i}><path d={`M${a.a[0]},${a.a[1]} L${a.b[0]},${a.b[1]}`} stroke={a.col} strokeWidth={9} strokeDasharray="26 16" strokeDashoffset={-T * 60} /><path d={`M${a.b[0]},${a.b[1]} l-34,-20 l0,40 Z`} fill={a.col} /></g>)}
          {S.crosses.map((c, i) => <g key={i} transform={`translate(${c[0]},${c[1]})`}><circle r={46} fill="#fbf8f1" /><path d="M-24,-24 L24,24 M24,-24 L-24,24" stroke="#d63b30" strokeWidth={11} strokeLinecap="round" /></g>)}
        </g>
        {/* nuit : voile bleu */}
        {n > 0 && <rect width={1920} height={1080} fill="#0a1626" opacity={0.18 * n} />}
      </svg>
      {S.dark > 0 && <AbsoluteFill style={{ background: "#000", opacity: S.dark }} />}
    </AbsoluteFill>
  );
};
