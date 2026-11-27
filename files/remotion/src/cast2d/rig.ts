// BANQUE DE PERSONNAGES — rig 2D partagé (copie évolutive de Jelly2D/phys.ts). Physique 2D — UNE seule source de vérité pour la géométrie des personnages :
// les composants dessinent à partir de ces fonctions, et le vérificateur (scripts/j2d-physics.ts) contrôle
// les MÊMES nombres sur toutes les images avant tout rendu (même principe que characters/physics/bodycheck.ts).
//
// Règles contrôlées (demande d'Alex, 2026-11-26 : « la physique doit être respectée, aucun plan illogique ») :
//  1. appui    : un personnage debout a les deux pieds SUR le sol / le fond (± 6 px) ; un objet posé touche son support
//  2. eau      : la ligne d'eau tombe dans la bande annoncée (cheville, genou, taille, poitrine) ; tête hors de l'eau sauf plongée
//  3. échelle  : la taille d'un objet / la taille d'un humain = le rapport réel (± 30 %)
//  4. prise    : un objet tenu a son point de prise dans la main (± 10 px) ; une main qui « fait » quelque chose touche sa cible
//  5. gestes   : réanimation = genoux au sol, bras quasi tendus, mains sur le sternum ; personne ne flotte au-dessus d'un sol

export type V = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** angle « 0 = vers le bas, + vers la droite » d'un vecteur */
export const angOf = (vx: number, vy: number) => deg(Math.atan2(vx, vy));
const seg = (o: V, a: number, l: number): V => [o[0] + Math.sin(rad(a)) * l, o[1] + Math.cos(rad(a)) * l];
const rot = (p: V, a: number): V => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
export const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Tailles réelles (m) pour le contrôle d'échelle. */
export const REAL = { adult: 1.75, teen13: 1.58, child10: 1.4, child5: 1.1, vinegar: 0.3, jar: 0.25, jelly: 0.16 };

/** IK à deux os : depuis l'épaule/la hanche `o`, atteindre `t` ; `bend` = côté du coude (+1 / -1). Renvoie [angle1, angle2 relatif]. */
export const ik2 = (o: V, t: V, l1: number, l2: number, bend: 1 | -1): [number, number] => {
  let d = dist(o, t);
  d = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.01, d));
  const base = angOf(t[0] - o[0], t[1] - o[1]);
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a1 = base + bend * deg(Math.acos(c));
  const e = seg(o, a1, l1);
  const a2abs = angOf(t[0] - e[0], t[1] - e[1]);
  return [a1, a2abs - a1];
};

// ------------------------------------------------------------------------------------------- personnage de face

export const FS = { sh: 31, wa: 24, torso: 86, ua: 46, fa: 42, th: 56, sn: 54, aw: 17, lw: 21, headY: -116, headR: 28 };
export type Pose = { lean?: number; la?: number; la2?: number; ra?: number; ra2?: number; ll?: number; ll2?: number; rl?: number; rl2?: number; head?: number;
  /** cibles ABSOLUES (px écran) : mains et pieds placés par IK */
  lh?: V; rh?: V; lf?: V; rf?: V };
export type FigProps = { x: number; y: number; s?: number; pose?: Pose; child?: boolean; teen?: boolean; headK?: number };
export const figK = (p: { child?: boolean; teen?: boolean }) => (p.child ? 0.8 : p.teen ? 0.9 : 1);
/** hauteur dessinée (tête → semelle) en unités locales */
export const FIG_H = 144 + 4 + FS.th + FS.sn + 11;

/** Géométrie complète d'un personnage de face (repère écran) + angles finaux (IK résolue). */
export const figGeom = (p: FigProps) => {
  const pose = p.pose ?? {};
  const sc = (p.s ?? 1) * figK(p);
  const lean = pose.lean ?? 0;
  const toLocal = (P: V): V => rot([(P[0] - p.x) / sc, (P[1] - p.y) / sc], -lean);
  const toAbs = (q: V): V => { const r = rot(q, lean); return [p.x + r[0] * sc, p.y + r[1] * sc]; };
  const shL: V = [-FS.sh + 6, -FS.torso + 10], shR: V = [FS.sh - 6, -FS.torso + 10];
  const hipL: V = [-12, 4], hipR: V = [12, 4];
  let [la, la2] = [pose.la ?? -14, pose.la2 ?? 0], [ra, ra2] = [pose.ra ?? 14, pose.ra2 ?? 0];
  let [ll, ll2] = [pose.ll ?? -4, pose.ll2 ?? 0], [rl, rl2] = [pose.rl ?? 4, pose.rl2 ?? 0];
  if (pose.lh) [la, la2] = ik2(shL, toLocal(pose.lh), FS.ua, FS.fa, -1);
  if (pose.rh) [ra, ra2] = ik2(shR, toLocal(pose.rh), FS.ua, FS.fa, 1);
  // pieds : la cible est la SEMELLE → la cheville est 11 unités au-dessus
  // Vue de FACE : un genou plié avance vers la caméra → la jambe RACCOURCIT dans l'axe (jamais de genou qui part
  // sur le côté : c'est ce qui faisait croiser les jambes, refus d'Alex du 27/11).
  let kL = 1, kR = 1;
  const legTo = (hip: V, t: V): [number, number, number] => { const d = dist(hip, t); return [angOf(t[0] - hip[0], t[1] - hip[1]), 0, Math.min(1, d / (FS.th + FS.sn))]; };
  if (pose.lf) { const t = toLocal(pose.lf); [ll, ll2, kL] = legTo(hipL, [t[0] + 6, t[1] - 11]); }
  if (pose.rf) { const t = toLocal(pose.rf); [rl, rl2, kR] = legTo(hipR, [t[0] - 6, t[1] - 11]); }
  const elL = seg(shL, la, FS.ua), haL = seg(elL, la + la2, FS.fa), elR = seg(shR, ra, FS.ua), haR = seg(elR, ra + ra2, FS.fa);
  const knL = seg(hipL, ll, FS.th * kL), anL = seg(knL, ll + ll2, FS.sn * kL), knR = seg(hipR, rl, FS.th * kR), anR = seg(knR, rl + rl2, FS.sn * kR);
  const local = { shL, shR, hipL, hipR, elL, haL, elR, haR, knL, anL, knR, anR };
  const abs = Object.fromEntries(Object.entries(local).map(([k, v]) => [k, toAbs(v as V)])) as Record<keyof typeof local, V>;
  return {
    sc, lean, angles: { la, la2, ra, ra2, ll, ll2, rl, rl2 }, local, ...abs,
    soleL: toAbs([anL[0] - 6, anL[1] + 11]), soleR: toAbs([anR[0] + 6, anR[1] + 11]),
    headTop: toAbs([0, FS.headY - FS.headR * (p.headK ?? 1)]), chin: toAbs([0, FS.headY + FS.headR * (p.headK ?? 1)]),
    waist: toAbs([0, -10]), chest: toAbs([0, -FS.torso + 34]), shoulderY: toAbs([0, -FS.torso + 10])[1],
    heightPx: FIG_H * sc,
  };
};
/** y du bassin pour qu'un personnage debout (jambes droites) pose ses semelles à `groundY`. */
export const standY = (groundY: number, s: number, kind: { child?: boolean; teen?: boolean } = {}) => groundY - (4 + FS.th + FS.sn + 11) * s * figK(kind);

// ------------------------------------------------------------------------------------------- personnage de profil

export const PS = { torso: 84, neck: 10, headR: 27, ua: 46, fa: 42, th: 56, sn: 54 };
export type ProfPose = { torso?: number; thigh?: number; shin?: number; thigh2?: number; shin2?: number; hand?: V; hand2?: V; head?: number;
  /** SEMELLES visées (px écran, absolues) : jambe proche / jambe du fond, posées par IK (genou vers l'avant) */
  foot?: V; foot2?: V;
  /** bras sans cible : angle de l'épaule (0 = le long du corps, + vers l'avant) et pli du coude (+ vers l'avant) */
  arm?: number; elbow?: number; arm2?: number; elbow2?: number };
/**
 * Profil tourné vers la droite (dir=1) ou la gauche (dir=-1). Repère : (x,y) = hanche.
 * torso = inclinaison du buste (0 debout, + vers l'avant). Jambes : angles ABSOLUS (0 = vers le bas, + vers l'avant).
 * Allongé sur le dos, tête à droite : dir=-1, torso=-90, cuisses/tibias = +90.
 */
export const profGeom = (x: number, y: number, s: number, dir: 1 | -1, pose: ProfPose, child = false) => {
  const sc = s * (child ? 0.8 : 1);
  const toAbs = (q: V): V => [x + q[0] * sc * dir, y + q[1] * sc];
  const toLocal = (P: V): V => [(P[0] - x) / (sc * dir), (P[1] - y) / sc];
  const t = pose.torso ?? 0;
  const up = (l: number): V => [Math.sin(rad(t)) * l, -Math.cos(rad(t)) * l];
  const sh = up(PS.torso - 8), neck = up(PS.torso), head: V = up(PS.torso + PS.neck + PS.headR);
  // semelle = 8 unités sous la cheville
  const legIK = (sole: V): [number, number] => { const t = toLocal(sole); const [a1, a2] = ik2([0, 0], [t[0], t[1] - 8], PS.th, PS.sn, 1); return [a1, a1 + a2]; };
  const [th1, sh1] = pose.foot ? legIK(pose.foot) : [pose.thigh ?? 0, pose.shin ?? 0];
  const [th2, sh2] = pose.foot2 ? legIK(pose.foot2) : [pose.thigh2 ?? pose.thigh ?? 0, pose.shin2 ?? pose.shin ?? 0];
  const knee = seg([0, 0], th1, PS.th), foot = seg(knee, sh1, PS.sn);
  const knee2 = seg([0, 0], th2, PS.th), foot2 = seg(knee2, sh2, PS.sn);
  const arm = (h?: V, ang?: number, elb?: number) => { const [a1, a2] = h ? ik2(sh, toLocal(h), PS.ua, PS.fa, -1) : ang !== undefined ? [ang, elb ?? 10] : [10, -10]; const el = seg(sh, a1, PS.ua); const ha = seg(el, a1 + a2, PS.fa); return { el, ha, a2 }; };
  const A = arm(pose.hand, pose.arm, pose.elbow), A2 = arm(pose.hand2 ?? (pose.arm2 === undefined ? pose.hand : undefined), pose.arm2, pose.elbow2);
  const L = { sh, neck, head, knee, foot, knee2, foot2, el: A.el, ha: A.ha, el2: A2.el, ha2: A2.ha };
  const abs = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, toAbs(v as V)])) as Record<keyof typeof L, V>;
  return { sc, dir, torso: t, local: L, ...abs, hip: [x, y] as V, sole: toAbs([foot[0], foot[1] + 8]), sole2: toAbs([foot2[0], foot2[1] + 8]), elbow: A.a2, elbow2: A2.a2, chest: toAbs(up(PS.torso * 0.62)), heightPx: (PS.torso + PS.neck + 2 * PS.headR + PS.th + PS.sn) * sc };
};

// ------------------------------------------------------------------------------------------- sols

/** Sol / fond en ligne brisée [[x,y]…] → y(x). */
export const groundAt = (pts: V[], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0); }
  return pts[pts.length - 1][1];
};

// ------------------------------------------------------------------------------------------- vérifications

export type Issue = { rule: string; msg: string };
export type Check = () => Issue[];
const fmt = (n: number) => n.toFixed(1);
export const chk = {
  /** semelles sur le sol (± tol px) */
  feetOn(id: string, g: ReturnType<typeof figGeom>, ground: (x: number) => number, tol = 6): Issue[] {
    const out: Issue[] = [];
    for (const [k, p] of [["gauche", g.soleL], ["droit", g.soleR]] as [string, V][]) {
      const d = p[1] - ground(p[0]);
      if (Math.abs(d) > tol) out.push({ rule: "appui", msg: `${id} : pied ${k} ${d < 0 ? "flotte" : "s'enfonce"} de ${fmt(Math.abs(d))} px` });
    }
    return out;
  },
  /** niveau d'eau dans la bande annoncée */
  water(id: string, g: ReturnType<typeof figGeom>, wy: number, band: "cheville" | "genou" | "taille" | "poitrine" | "libre"): Issue[] {
    const kneeY = (g.knL[1] + g.knR[1]) / 2, ankleY = (g.anL[1] + g.anR[1]) / 2;
    const B: Record<string, [number, number]> = {
      cheville: [ankleY - 18 * g.sc, ankleY + 12 * g.sc], genou: [kneeY - 22 * g.sc, kneeY + 22 * g.sc],
      taille: [g.waist[1] - 22 * g.sc, g.waist[1] + 18 * g.sc], poitrine: [g.shoulderY, g.chest[1] + 16 * g.sc],
    };
    const [a, b] = band === "libre" ? [-1e9, 1e9] : B[band];
    const out: Issue[] = [];
    if (wy < a || wy > b) out.push({ rule: "eau", msg: `${id} : eau à ${fmt(wy)} px, attendu « ${band} » entre ${fmt(a)} et ${fmt(b)}` });
    if (g.chin[1] > wy) out.push({ rule: "eau", msg: `${id} : la tête est sous l'eau (menton ${fmt(g.chin[1])} > eau ${fmt(wy)})` });
    return out;
  },
  /** rapport de taille réel objet / humain (± tol) */
  scale(id: string, objPx: number, humanPx: number, objReal: number, humanReal: number, tol = 0.3): Issue[] {
    const r = objPx / humanPx, want = objReal / humanReal;
    return Math.abs(r / want - 1) > tol ? [{ rule: "échelle", msg: `${id} : rapport ${fmt(r * 100)} % de l'humain, réel ${fmt(want * 100)} % (± ${tol * 100} %)` }] : [];
  },
  /** un point (main, prise) touche sa cible */
  touch(id: string, a: V, b: V, tol = 10): Issue[] {
    const d = dist(a, b);
    return d > tol ? [{ rule: "prise", msg: `${id} : écart ${fmt(d)} px (max ${tol})` }] : [];
  },
  /** un objet posé touche son support */
  rests(id: string, bottomY: number, supportY: number, tol = 4): Issue[] {
    const d = bottomY - supportY;
    return Math.abs(d) > tol ? [{ rule: "appui", msg: `${id} : ${d < 0 ? "flotte" : "s'enfonce"} de ${fmt(Math.abs(d))} px au-dessus du support` }] : [];
  },
  /** vue de face : la jambe gauche reste à gauche (genoux ET pieds), jamais de jambes croisées */
  uncrossed(id: string, g: ReturnType<typeof figGeom>): Issue[] {
    const out: Issue[] = [];
    if (g.knL[0] > g.knR[0] - 4 * g.sc) out.push({ rule: "jambes", msg: `${id} : genoux croisés (${fmt(g.knL[0])} / ${fmt(g.knR[0])})` });
    if (g.soleL[0] > g.soleR[0] - 4 * g.sc) out.push({ rule: "jambes", msg: `${id} : pieds croisés (${fmt(g.soleL[0])} / ${fmt(g.soleR[0])})` });
    return out;
  },
  /** coude quasi tendu (réanimation) */
  straight(id: string, elbowRel: number, tolDeg = 18): Issue[] {
    return Math.abs(elbowRel) > tolDeg ? [{ rule: "geste", msg: `${id} : coude plié de ${fmt(Math.abs(elbowRel))}° (bras tendus attendus)` }] : [];
  },
};
