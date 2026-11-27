// Dessin des personnages de la banque (style papier découpé façon Oceanverse : aplats sans contour, ombre douce).
// Toute la géométrie vient de rig.ts → le vérificateur physique lit exactement ce qui est dessiné.
import React from "react";
import { CAST, Character, rigScale } from "./cast";
import { figGeom, profGeom, standY, Pose, ProfPose, V, FS } from "./rig";

export const shade = (hex: string, k = 0.82) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
};
const PAPER_SHADOW = "drop-shadow(3px 6px 5px rgba(5,25,35,0.28))";
const getC = (c: Character | string) => (typeof c === "string" ? CAST[c] : c);

// ============================================================================================= vue de face

export type FrontProps = {
  c: Character | string; ppm: number;
  /** x du milieu des pieds */
  x: number;
  /** y du sol sous les pieds (personnage debout). Ignoré si `hipY` est donné. */
  ground?: number; hipY?: number;
  pose?: Pose; T?: number; idle?: boolean; opacity?: number;
};
/** Géométrie absolue (pour placer, tenir des objets et vérifier). */
export const frontGeom = (p: FrontProps) => {
  const c = getC(p.c); const s = rigScale(c, p.ppm);
  const y = p.hipY ?? standY(p.ground ?? 0, s);
  return { c, s, ...figGeom({ x: p.x, y, s, pose: p.pose, headK: c.headK }) };
};

const Head: React.FC<{ c: Character; hk: number; face?: "front" | "back" }> = ({ c, hk }) => {
  const cy = FS.headY - 28 * (hk - 1) * 0.6;
  const rx = 25 * hk, ry = 28 * hk;
  const H = c.hairCol;
  return (
    <g transform={`translate(0,${cy})`}>
      <ellipse cx={-rx + 1} cy={4} rx={5 * hk} ry={7 * hk} fill={c.skin2} />
      <ellipse cx={rx - 1} cy={4} rx={5 * hk} ry={7 * hk} fill={c.skin2} />
      <ellipse rx={rx} ry={ry} fill={c.skin} />
      {/* cheveux */}
      {c.hair === "short" && <path d={`M${-rx},${-2} Q${-rx - 2},${-ry - 4} 0,${-ry - 3} Q${rx + 2},${-ry - 4} ${rx},${-2} Q${rx * 0.6},${-ry * 0.55} 0,${-ry * 0.6} Q${-rx * 0.6},${-ry * 0.55} ${-rx},${-2} Z`} fill={H} />}
      {c.hair === "crew" && <path d={`M${-rx + 1},${-6} Q${-rx},${-ry - 1} 0,${-ry - 1} Q${rx},${-ry - 1} ${rx - 1},${-6} Q0,${-ry * 0.72} ${-rx + 1},${-6} Z`} fill={H} />}
      {c.hair === "side" && <path d={`M${-rx},${0} Q${-rx - 3},${-ry - 5} ${rx * 0.1},${-ry - 4} Q${rx + 4},${-ry - 2} ${rx},${-4} Q${rx * 0.2},${-ry * 0.7} ${-rx * 0.4},${-ry * 0.45} Q${-rx * 0.8},${-ry * 0.3} ${-rx},${0} Z`} fill={H} />}
      {c.hair === "long" && <path d={`M${-rx - 1},${6} Q${-rx - 3},${-ry - 5} 0,${-ry - 4} Q${rx + 3},${-ry - 5} ${rx + 1},${6} Q${rx * 0.5},${-ry * 0.5} ${rx * 0.05},${-ry * 0.62} Q${-rx * 0.5},${-ry * 0.5} ${-rx - 1},${6} Z`} fill={H} />}
      {c.hair === "bun" && <><circle cy={-ry - 8} r={11 * hk} fill={H} /><path d={`M${-rx},${-2} Q${-rx - 2},${-ry - 3} 0,${-ry - 2} Q${rx + 2},${-ry - 3} ${rx},${-2} Q0,${-ry * 0.62} ${-rx},${-2} Z`} fill={H} /></>}
      {c.hair === "bald" && <><path d={`M${-rx - 1},${4} Q${-rx - 2},${-10} ${-rx + 6},${-14} L${-rx + 8},${2} Z M${rx + 1},${4} Q${rx + 2},${-10} ${rx - 6},${-14} L${rx - 8},${2} Z`} fill={H} /></>}
      {/* visage */}
      {!c.mask && <><circle cx={-9 * hk} cy={1} r={2.8} fill="#1d1a18" /><circle cx={9 * hk} cy={1} r={2.8} fill="#1d1a18" /></>}
      <path d={`M${-6},${13 * hk} Q0,${17 * hk} 6,${13 * hk}`} stroke={shade(c.skin2, 0.75)} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={-15 * hk} cy={9 * hk} r={4} fill="#e88f7a" opacity={0.35} /><circle cx={15 * hk} cy={9 * hk} r={4} fill="#e88f7a" opacity={0.35} />
      {c.beard && <path d={`M${-rx * 0.8},${8} Q0,${ry + 10} ${rx * 0.8},${8} Q${rx * 0.4},${ry * 0.55} 0,${ry * 0.62} Q${-rx * 0.4},${ry * 0.55} ${-rx * 0.8},${8} Z`} fill={shade(H, 1.1)} />}
      {c.glasses && <g fill="none" stroke="#2a2520" strokeWidth={2.4}><circle cx={-9 * hk} cy={1} r={6.5} /><circle cx={9 * hk} cy={1} r={6.5} /><path d="M-2.5,1 L2.5,1" /></g>}
      {c.mask && <g><rect x={-rx + 3} y={-10} width={2 * rx - 6} height={20} rx={8} fill="#7fd0e8" opacity={0.85} /><rect x={-rx + 3} y={-10} width={2 * rx - 6} height={20} rx={8} fill="none" stroke="#2c3e50" strokeWidth={4} /><path d={`M${-rx - 2},-2 L${-rx + 3},-2 M${rx - 3},-2 L${rx + 2},-2`} stroke="#2c3e50" strokeWidth={4} /></g>}
      {c.snorkel && <path d={`M${rx * 0.4},${14 * hk} Q${rx + 8},${16 * hk} ${rx + 8},0 L${rx + 8},${-ry - 14}`} stroke="#f2c230" strokeWidth={6} fill="none" strokeLinecap="round" />}
    </g>
  );
};

/** Personnage de face. */
export const PersonFront: React.FC<FrontProps> = (p) => {
  const g = frontGeom(p);
  const { c } = g; const L = g.local;
  const bob = p.idle && p.T !== undefined ? Math.sin(p.T * 1.6) * 2 : 0;
  const stroke = (d: string, col: string, w: number) => <path d={d} stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  const legD = (h: V, k: V, an: V) => `M${h[0]},${h[1]} L${k[0]},${k[1]} L${an[0]},${an[1]}`;
  const part = (o: V, e: V, f: number): V => [o[0] + (e[0] - o[0]) * f, o[1] + (e[1] - o[1]) * f];
  const legCol = c.bottom.kind === "trousers" || c.bottom.kind === "lycra" ? c.bottom.col : c.skin;
  const armFull = ["shirt", "labcoat", "lycra", "rashguard"].includes(c.top.kind);
  const armCol = armFull ? c.top.col : c.skin;
  const shoe = c.shoes ?? (c.bottom.kind === "lycra" ? c.bottom.col : c.skin);
  const T = -FS.torso;
  return (
    <g opacity={p.opacity ?? 1} style={{ filter: PAPER_SHADOW }}>
      <g>
        <g transform={`translate(${p.x},${frontHipY(p)}) rotate(${g.lean}) scale(${g.s}) translate(0,${bob})`}>
          {/* jambes */}
          {stroke(legD(L.hipL, L.knL, L.anL), shade(legCol, 0.93), FS.lw)}
          {stroke(legD(L.hipR, L.knR, L.anR), legCol, FS.lw)}
          <ellipse cx={L.anL[0] - 6} cy={L.anL[1] + 5} rx={14} ry={7} fill={shoe} />
          <ellipse cx={L.anR[0] + 6} cy={L.anR[1] + 5} rx={14} ry={7} fill={shoe} />
          {/* bas */}
          {c.bottom.kind === "shorts" && <>{stroke(`M${L.hipL[0]},${L.hipL[1]} L${part(L.hipL, L.knL, 0.5)[0]},${part(L.hipL, L.knL, 0.5)[1]}`, c.bottom.col, FS.lw + 7)}{stroke(`M${L.hipR[0]},${L.hipR[1]} L${part(L.hipR, L.knR, 0.5)[0]},${part(L.hipR, L.knR, 0.5)[1]}`, c.bottom.col, FS.lw + 7)}<rect x={-27} y={-8} width={54} height={22} rx={6} fill={c.bottom.col} /></>}
          {(c.bottom.kind === "trousers" || c.bottom.kind === "lycra") && <rect x={-26} y={-8} width={52} height={20} rx={6} fill={c.bottom.col} />}
          {c.bottom.kind === "swimsuit" && <path d="M-25,-8 L25,-8 L22,12 Q0,22 -22,12 Z" fill={c.bottom.col} />}
          {/* cheveux longs : DERRIÈRE le buste */}
          {c.hair === "long" && (() => { const hk = c.headK, rx = 25 * hk, ry = 28 * hk, cy = FS.headY - 28 * (hk - 1) * 0.6; return <path d={`M${-rx - 2},${cy - 4} Q${-rx - 6},${cy + ry + 26} ${-rx + 6},${cy + ry + 40} L${rx - 6},${cy + ry + 40} Q${rx + 6},${cy + ry + 26} ${rx + 2},${cy - 4} Z`} fill={shade(c.hairCol, 0.85)} />; })()}
          {/* torse */}
          {c.top.kind === "labcoat" && <path d={`M${-FS.sh - 2},${T + 18} L${-FS.sh - 8},62 L${FS.sh + 8},62 L${FS.sh + 2},${T + 18} Z`} fill={c.top.col} />}
          <path d={`M${-FS.wa},8 L${-FS.sh},${T + 18} Q${-FS.sh},${T} ${-FS.sh + 14},${T} L${FS.sh - 14},${T} Q${FS.sh},${T} ${FS.sh},${T + 18} L${FS.wa},8 Z`} fill={c.top.kind === "labcoat" ? c.top.col2 ?? "#4f86c6" : c.top.col} />
          {c.top.kind === "labcoat" && <path d={`M${-FS.sh},${T + 14} L${-8},${T + 2} L-8,62 L${-FS.sh - 8},62 Z M${FS.sh},${T + 14} L8,${T + 2} L8,62 L${FS.sh + 8},62 Z`} fill={c.top.col} />}
          {c.top.kind === "rashguard" && <rect x={-FS.sh + 2} y={T + 34} width={2 * FS.sh - 4} height={12} fill={c.top.col2} />}
          {c.top.kind === "lycra" && <path d={`M${-FS.sh + 4},${T + 30} L${FS.sh - 4},${T + 22}`} stroke={c.top.col2} strokeWidth={7} />}
          {c.top.kind === "polo" && <path d={`M-12,${T} L0,${T + 14} L12,${T}`} fill="none" stroke={shade(c.top.col, 0.75)} strokeWidth={5} />}
          {c.top.tie && <path d={`M-4,${T + 4} L4,${T + 4} L6,${T + 40} L0,${T + 48} L-6,${T + 40} Z`} fill={c.top.tie} />}
          {c.top.kind === "swimsuit" && <path d={`M-14,${T} L-9,${T + 10} M14,${T} L9,${T + 10}`} stroke={c.skin} strokeWidth={6} />}
          {/* bras */}
          {stroke(`M${L.shL[0]},${L.shL[1]} L${L.elL[0]},${L.elL[1]} L${L.haL[0]},${L.haL[1]}`, armCol, FS.aw)}
          {stroke(`M${L.shR[0]},${L.shR[1]} L${L.elR[0]},${L.elR[1]} L${L.haR[0]},${L.haR[1]}`, armCol, FS.aw)}
          {(c.top.kind === "tshirt" || c.top.kind === "polo") && <>{stroke(`M${L.shL[0]},${L.shL[1]} L${part(L.shL, L.elL, 0.45)[0]},${part(L.shL, L.elL, 0.45)[1]}`, c.top.col, FS.aw + 6)}{stroke(`M${L.shR[0]},${L.shR[1]} L${part(L.shR, L.elR, 0.45)[0]},${part(L.shR, L.elR, 0.45)[1]}`, c.top.col, FS.aw + 6)}</>}
          {c.top.kind === "swimsuit" || c.top.kind === "tank" ? null : null}
          <circle cx={L.haL[0]} cy={L.haL[1]} r={10} fill={c.skin} /><circle cx={L.haR[0]} cy={L.haR[1]} r={10} fill={c.skin} />
          {/* cou + tête */}
          <rect x={-8} y={T - 16} width={16} height={20} fill={c.skin2} />
          <Head c={c} hk={c.headK} />
        </g>
      </g>
    </g>
  );
};
/** y du bassin d'un personnage de face (sol ou hipY). */
export const frontHipY = (p: FrontProps) => { const c = getC(p.c); return p.hipY ?? standY(p.ground ?? 0, rigScale(c, p.ppm)); };



// ============================================================================================= vue de profil

export type SideProps = { c: Character | string; ppm: number; x: number; y: number; dir?: 1 | -1; pose: ProfPose; opacity?: number };
export const sideGeom = (p: SideProps) => { const c = getC(p.c); const s = rigScale(c, p.ppm); return { c, ...profGeom(p.x, p.y, s, p.dir ?? 1, p.pose) }; };

/** Personnage de profil (tourné vers +x si dir = 1). (x,y) = hanche. */
export const PersonSide: React.FC<SideProps> = (p) => {
  const g = sideGeom(p); const c = g.c; const L = g.local;
  const dir = p.dir ?? 1;
  const st = (pts: V[], col: string, w: number) => <path d={"M" + pts.map((q) => q.join(",")).join(" L")} stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  const legCol = c.bottom.kind === "trousers" || c.bottom.kind === "lycra" ? c.bottom.col : c.skin;
  const armFull = ["shirt", "labcoat", "lycra", "rashguard"].includes(c.top.kind);
  const armCol = armFull ? c.top.col : c.skin;
  const t = g.torso;
  const rad = (d: number) => (d * Math.PI) / 180;
  const fwd: V = [Math.cos(rad(t)), Math.sin(rad(t))]; // direction « avant » (visage)
  const hk = c.headK;
  const torsoCol = c.top.kind === "labcoat" ? c.top.col : c.top.col;
  return (
    <g transform={`translate(${p.x},${p.y}) scale(${g.sc * dir},${g.sc})`} opacity={p.opacity ?? 1} style={{ filter: PAPER_SHADOW }}>
      {/* membres arrière */}
      {st([[0, 0], L.knee2, L.foot2], shade(legCol, 0.8), 20)}
      {st([L.sh, L.el2, L.ha2], shade(armCol, 0.8), 16)}
      {/* torse */}
      {st([[0, 0], L.neck], torsoCol, 44)}
      {c.bottom.kind === "shorts" && st([[0, 0], [L.knee[0] * 0.5, L.knee[1] * 0.5]], c.bottom.col, 30)}
      {c.bottom.kind === "swimsuit" && st([[0, 0], [L.knee[0] * 0.15, L.knee[1] * 0.15]], c.bottom.col, 34)}
      {/* jambe avant */}
      {st([[0, 0], L.knee, L.foot], legCol, 21)}
      {c.bottom.kind === "shorts" && st([[0, 0], [L.knee[0] * 0.5, L.knee[1] * 0.5]], c.bottom.col, 28)}
      <ellipse cx={L.foot[0] + 8} cy={L.foot[1] + 2} rx={14} ry={6} fill={c.shoes ?? (c.bottom.kind === "lycra" ? c.bottom.col : c.skin)} transform={`rotate(${t > 45 || t < -45 ? 0 : 0} ${L.foot[0]} ${L.foot[1]})`} />
      {/* tête */}
      <g transform={`translate(${L.head[0]},${L.head[1]}) rotate(${t + (p.pose.head ?? 0)}) scale(${hk})`}>
        {c.hair === "long" && <path d="M-26,-6 Q-34,30 -22,46 L-4,40 Q-14,10 -10,-6 Z" fill={shade(c.hairCol, 0.85)} />}
        <circle r={27} fill={c.skin} />
        <path d="M24,-4 Q34,2 25,8 Z" fill={c.skin} />
        <path d={c.hair === "bald" ? "M-26,6 Q-30,-10 -18,-16 L-12,4 Z" : "M-28,6 Q-30,-28 4,-29 Q24,-28 27,-12 Q8,-20 -6,-14 Q-14,-6 -12,8 Z"} fill={c.hairCol} />
        {c.hair === "bun" && <circle cx={-22} cy={-22} r={11} fill={c.hairCol} />}
        <circle cx={-4} cy={2} r={5} fill={c.skin2} />
        {!c.mask && <circle cx={13} cy={-3} r={2.8} fill="#1d1a18" />}
        {c.beard && <path d="M26,6 Q24,27 6,28 Q-9,26 -12,10 Q-2,16 8,13 Q18,18 26,6 Z" fill={shade(c.hairCol, 1.1)} />}
        {c.glasses && <circle cx={13} cy={-3} r={6.5} fill="none" stroke="#2a2520" strokeWidth={2.4} />}
        {c.mask && <rect x={6} y={-12} width={20} height={18} rx={6} fill="#7fd0e8" stroke="#2c3e50" strokeWidth={4} />}
        {c.snorkel && <path d="M20,14 Q-2,22 -10,2 L-12,-40" stroke="#f2c230" strokeWidth={6} fill="none" strokeLinecap="round" />}
        <path d="M14,14 Q19,16 22,13" stroke={shade(c.skin2, 0.75)} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </g>
      {/* bras avant */}
      {st([L.sh, L.el, L.ha], armCol, 17)}
      {(c.top.kind === "tshirt" || c.top.kind === "polo") && st([L.sh, [L.sh[0] + (L.el[0] - L.sh[0]) * 0.45, L.sh[1] + (L.el[1] - L.sh[1]) * 0.45]], c.top.col, 23)}
      <circle cx={L.ha[0]} cy={L.ha[1]} r={10} fill={c.skin} />
      {void fwd}
    </g>
  );
};
