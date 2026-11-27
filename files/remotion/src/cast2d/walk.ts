// BANQUE DE PERSONNAGES — MARCHE (cycle réel, vue de profil).
// Refus d'Alex du 27/11 : « je refuse que mes personnes marchent comme ça » (personnage de face qui glisse en croisant
// les jambes). Règles de ce module :
//  1. un personnage qui se DÉPLACE est de PROFIL (on ne marche pas de face en travers de l'écran) ;
//  2. cycle réel : appui 60 % / balancier 40 %, double appui, pied d'appui FIXE au sol (aucune glisse) ;
//  3. le bassin monte au milieu de l'appui et descend au contact du talon (≈ 2,5 % de la taille) ;
//  4. bras en opposition des jambes, coude qui se plie vers l'avant ;
//  5. le trajet est découpé en un nombre ENTIER de cycles → départ et arrivée en double appui (pose propre) ;
//  6. demi-tour / passage face ↔ profil = « carte qui pivote » (écrasement horizontal ≈ 0,14 s).
// La phase est tirée de la DISTANCE parcourue (pas du temps) : un départ lent ou une arrivée freinée ralentissent les pas
// sans jamais faire patiner les pieds. Vérifié par chk.walk + le contrôle de glisse du vérificateur.
import { CAST, rigScale } from "./cast";
import { V, PS, ProfPose } from "./rig";

export const GAIT = {
  /** longueur d'un cycle (2 pas) en unités rig — 160 ≈ 1,04 m pour un adulte de 1,75 m */
  cycle: 160,
  stance: 0.6,
  /** pied posé à ± reach·cycle du bassin au contact / au décollage */
  reach: 0.3,
  /** hauteur max du pied en balancier (unités rig) */
  lift: 14,
  /** amplitude du balancement de bras (°) */
  arm: 20,
  /** bassin au plus haut = 0,955 × longueur de jambe (genou jamais verrouillé) */
  hipMax: 0.955,
  /** extension max autorisée (anti genou hyper-tendu) */
  reachMax: 0.985,
  /** buste penché vers l'avant (°) */
  lean: 4,
};

const smooth = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
const fract = (u: number) => u - Math.floor(u);

export type WalkFoot = { p: V; stance: boolean };
export type WalkState = { x: number; y: number; dir: 1 | -1; pose: ProfPose; feet: [WalkFoot, WalkFoot] };

/** Cycle ajusté pour que `dist` px = un nombre entier de cycles (départ et arrivée en double appui). */
export const cycleFor = (dist: number, s: number, cycle = GAIT.cycle) => { const c0 = cycle * s; const n = Math.max(1, Math.round(Math.abs(dist) / c0)); return Math.abs(dist) / n; };

/**
 * Personnage qui marche de x0 à x1 (px), `u` = progression 0..1 (déjà lissée par l'appelant), sur le sol `ground(x)`.
 * `extra` : surcharges (ex. hand = point tenu → le bras proche porte un objet ; hand2 = main du fond qui tient quelqu'un).
 */
export const walkSide = (c: string, ppm: number, x0: number, x1: number, u: number, ground: (x: number) => number, extra: Partial<ProfPose> = {}, cycle = GAIT.cycle): WalkState => {
  const s = rigScale(CAST[c], ppm);
  const dir: 1 | -1 = x1 >= x0 ? 1 : -1;
  const D = Math.abs(x1 - x0);
  const C = cycleFor(D, s, cycle);
  const d = D * Math.max(0, Math.min(1, u));
  const x = x0 + dir * d;
  const L = (PS.th + PS.sn) * s;
  const foot = (ph: number): { off: number; lift: number; stance: boolean } => {
    const uu = fract(ph);
    if (uu < GAIT.stance) return { off: (GAIT.reach - uu) * C, lift: 0, stance: true };
    const v = (uu - GAIT.stance) / (1 - GAIT.stance);
    return { off: -GAIT.reach * C - v * (1 - GAIT.stance) * C + smooth(v) * C, lift: Math.sin(Math.PI * v) * GAIT.lift * s, stance: false };
  };
  // départ en double appui : jambe proche à 0,55 (derrière), jambe du fond à 0,05 (devant)
  const uA = d / C + 0.55, uB = uA + 0.5;
  const fa = foot(uA), fb = foot(uB);
  const sole = (f: { off: number; lift: number }): V => { const fx = x + dir * f.off; return [fx, ground(fx) - f.lift]; };
  const pA = sole(fa), pB = sole(fb);
  // bassin : assez bas pour atteindre chaque pied (avec la marge reachMax), jamais plus haut que hipMax
  const need = (p: V, off: number) => p[1] - 8 * s - Math.min(Math.sqrt(Math.max(0, (GAIT.reachMax * L) ** 2 - off * off)), GAIT.hipMax * L);
  const y = Math.max(need(pA, fa.off), need(pB, fb.off));
  const nA = Math.max(-1.2, Math.min(1.2, fa.off / (GAIT.reach * C))), nB = Math.max(-1.2, Math.min(1.2, fb.off / (GAIT.reach * C)));
  const pose: ProfPose = {
    torso: GAIT.lean, foot: pA, foot2: pB,
    // bras proche en opposition de la jambe proche
    arm: -GAIT.arm * nA, elbow: 8 + 16 * Math.max(0, -nA),
    arm2: -GAIT.arm * nB, elbow2: 8 + 16 * Math.max(0, -nB),
    ...extra,
  };
  return { x, y, dir, pose, feet: [{ p: pA, stance: fa.stance }, { p: pB, stance: fb.stance }] };
};

/** Écrasement horizontal d'un demi-tour (carte papier qui pivote) : 1 hors transition, → 0,15 au moment du changement. */
export const TURN = 0.14;
export const turnK = (T: number, tSwitch: number) => { const k = Math.abs(T - tSwitch) / TURN; return k >= 1 ? 1 : Math.max(0.15, k); };
