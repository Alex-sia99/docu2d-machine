// Animaux et objets de la banque, en TAILLE RÉELLE (mètres × ppm) — style papier découpé.
// Chaque objet expose ses points utiles (prise, base posée) pour que le vérificateur puisse contrôler.
import React from "react";
import { random } from "remotion";
import { V } from "./rig";
import { shade } from "./people";

const PAPER_SHADOW = "drop-shadow(3px 6px 5px rgba(5,25,35,0.28))";
export const SIZES = { chironexBell: 0.16, irukandjiBell: 0.02, vinegar: 0.3, jar: 0.25, coin2e: 0.02575, shrimp: 0.06, fish: 0.12, turtle: 1.0, shark: 3.5 };

// ---------------------------------------------------------------------------------------- méduse-boîte (Chironex)

/**
 * Méduse-boîte en vue 3/4 (style papier) : cloche cubique translucide, 4 pédalia, tentacules rubanés.
 * `bell` = largeur de cloche en px (réel : 0,16 m × ppm). `len` = longueur des tentacules en px.
 */
export const BoxJellyP: React.FC<{ T: number; x: number; y: number; bell: number; len: number; alpha?: number; hi?: number[]; eyes?: number; tilt?: number; nTent?: number; flipUp?: number }> = ({ T, x, y, bell, len, alpha = 1, hi = [], eyes = 0, tilt = 0, nTent = 8, flipUp = 0 }) => {
  const s = bell / 210;
  const pulse = Math.sin(T * 2.4);
  const corners: V[] = [[-112, 52], [-6, 82], [94, 50], [-22, 26]];
  const L = len / s;
  const strands = (ci: number) => {
    const [cx, cy] = corners[ci];
    const out = ci === 0 ? -1 : ci === 2 ? 1 : ci === 1 ? -0.15 : 0.2;
    const tip: V = [cx + out * 24, cy + 28];
    return Array.from({ length: nTent }, (_, i) => {
      const f = nTent === 1 ? 0.5 : i / (nTent - 1);
      const Li = L * (0.84 + random(`L${ci}-${i}`) * 0.26);
      const pts: string[] = [];
      for (let k = 0; k <= 16; k++) {
        const u = k / 16;
        const sway = Math.sin(T * 1.3 - u * 4.2 + i * 0.7 + ci * 1.9) * (5 + u * 24) * Math.min(1, L / 200);
        pts.push(`${(tip[0] + (f - 0.5) * 30 * (0.4 + u * 1.3) + sway).toFixed(1)},${(tip[1] + u * Li).toFixed(1)}`);
      }
      return { tip, d: pts.join(" ") };
    });
  };
  return (
    <g transform={`translate(${x},${y}) rotate(${tilt + flipUp * 180}) scale(${s})`} opacity={alpha}>
      {[3, 0, 2, 1].map((ci) => {
        const h = hi.includes(ci);
        const ss = strands(ci);
        const [cx, cy] = corners[ci]; const tip = ss[0].tip;
        return (
          <g key={ci} opacity={ci === 3 ? 0.45 : 1}>
            {ss.map((q, i) => <polyline key={i} points={q.d} fill="none" stroke={h ? "#f7c948" : "#e8f7ff"} strokeWidth={h ? 3.4 : 2.6} strokeLinecap="round" strokeDasharray={h ? undefined : "8 3"} opacity={0.85} />)}
            <path d={`M${cx - 9},${cy - 8} Q${(cx + tip[0]) / 2 - 10},${cy + 16} ${tip[0] - 7},${tip[1]} L${tip[0] + 7},${tip[1]} Q${(cx + tip[0]) / 2 + 10},${cy + 10} ${cx + 9},${cy - 8} Z`} fill={h ? "rgba(247,201,72,0.7)" : "rgba(214,240,255,0.65)"} />
          </g>
        );
      })}
      <g transform={`scale(${1 + pulse * 0.035},${1 - pulse * 0.03})`}>
        <path d="M-14,-96 C-22,-40 -18,10 -10,46 L6,46 C10,10 12,-40 4,-96 Z" fill="#ffd9e6" opacity={0.35} />
        <path d="M-112,52 L-118,-78 Q-116,-112 -84,-128 L-14,-150 Q-4,-152 -4,-140 L-6,82 Z" fill="#dff4ff" opacity={0.62} />
        <path d="M-6,82 L-4,-140 Q-4,-152 8,-149 L70,-130 Q96,-118 98,-84 L94,50 Z" fill="#a9dcf5" opacity={0.5} />
        <path d="M-118,-78 Q-116,-112 -84,-128 L-14,-150 Q-4,-153 8,-149 L70,-130 Q96,-118 98,-84 Q60,-112 -6,-120 Q-80,-112 -118,-78 Z" fill="#f4fcff" opacity={0.7} />
        <path d="M-112,52 Q-60,40 -6,82 Q44,48 94,50" fill="none" stroke="#ffffff" strokeWidth={6} opacity={0.5} />
        <path d="M-98,-70 Q-92,-104 -62,-118" stroke="#ffffff" strokeWidth={7} strokeLinecap="round" opacity={0.6} fill="none" />
        {([[-60, 34], [46, 34], [-24, 8]] as V[]).map(([ex, ey], i) => (
          <g key={i} opacity={i === 2 ? 0.45 : 1}>
            {eyes > 0 && <circle cx={ex} cy={ey} r={14 + eyes * 8} fill="none" stroke="#f7c948" strokeWidth={4} opacity={eyes} />}
            <circle cx={ex} cy={ey + 2} r={5.5} fill="#24323d" />
          </g>
        ))}
      </g>
    </g>
  );
};

/** Irukandji (Carukia barnesi) : cloche ~2 cm, 4 tentacules très fins. */
export const Irukandji: React.FC<{ T: number; x: number; y: number; bell: number; len?: number }> = ({ T, x, y, bell, len = bell * 6 }) => {
  const s = bell / 40;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {[-14, -5, 5, 14].map((dx, i) => <path key={i} d={`M${dx},18 q${Math.sin(T * 2 + i) * 6},${len / s / 2} ${dx * 0.3},${len / s}`} stroke="#eaf8ff" strokeWidth={1.6} fill="none" opacity={0.8} />)}
      <path d="M-20,18 L-21,-10 Q-20,-24 0,-25 Q20,-24 21,-10 L20,18 Q0,12 -20,18 Z" fill="#dff4ff" opacity={0.7} />
      <path d="M-14,-14 Q-10,-20 -2,-21" stroke="#fff" strokeWidth={3} fill="none" opacity={0.7} />
    </g>
  );
};

// ---------------------------------------------------------------------------------------- petits animaux

export const ShrimpP: React.FC<{ x: number; y: number; len: number; T: number; flip?: boolean }> = ({ x, y, len, T, flip }) => {
  const s = len / 80;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s}) rotate(${Math.sin(T * 3 + x) * 4})`} style={{ filter: PAPER_SHADOW }}>
      <path d="M-40,0 Q-30,-22 0,-20 Q30,-18 40,0 Q34,14 18,16 Q30,22 24,32 Q8,24 0,14 Q-24,16 -40,0 Z" fill="#f2a27a" />
      <path d="M-20,-18 L-22,10 M-4,-20 L-6,14 M12,-19 L10,12" stroke="#d9805b" strokeWidth={3} />
      <path d="M38,-4 Q70,-30 96,-26 M38,-2 Q72,-12 98,-4" stroke="#d9805b" strokeWidth={2} fill="none" />
      <circle cx={30} cy={-8} r={3.5} fill="#2a2420" />
    </g>
  );
};
export const FishP: React.FC<{ x: number; y: number; len: number; T: number; flip?: boolean; col?: string }> = ({ x, y, len, T, flip, col = "#cfdbe2" }) => {
  const s = len / 100;
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`} style={{ filter: PAPER_SHADOW }}>
      <path d="M-50,0 Q-12,-26 32,-6 L52,-22 Q46,0 52,22 L32,6 Q-12,26 -50,0 Z" transform={`skewY(${Math.sin(T * 6 + x) * 3})`} fill={col} />
      <path d="M-20,-10 Q-6,-2 -20,10" stroke={shade(col, 0.8)} strokeWidth={3} fill="none" />
      <circle cx={-34} cy={-3} r={3.4} fill="#1d1a18" />
    </g>
  );
};
export const TurtleP: React.FC<{ x: number; y: number; len: number; T: number }> = ({ x, y, len, T }) => {
  const s = len / 300; const f = Math.sin(T * 2) * 18;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} style={{ filter: PAPER_SHADOW }}>
      <path d={`M-40,-30 Q-90,${-70 - f} -150,${-60 - f} Q-110,-30 -46,-12 Z M40,-28 Q90,${-70 + f} 150,${-56 + f} Q110,-26 46,-10 Z`} fill="#7c9a5a" />
      <path d="M-40,30 Q-80,50 -96,40 Q-70,22 -44,18 Z M40,30 Q80,50 96,40 Q70,22 44,18 Z" fill="#6e8a4f" />
      <ellipse rx={70} ry={52} fill="#8a6b43" />
      <path d="M0,-52 L0,52 M-48,-30 L48,30 M-48,30 L48,-30" stroke="#6a5030" strokeWidth={4} />
      <ellipse cy={-70} rx={22} ry={26} fill="#8fae6a" />
      <circle cx={-8} cy={-78} r={3.5} fill="#1d1a18" /><circle cx={8} cy={-78} r={3.5} fill="#1d1a18" />
    </g>
  );
};
export const SharkP: React.FC<{ x: number; y: number; len: number; o?: number }> = ({ x, y, len, o = 1 }) => {
  const s = len / 560;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={o} style={{ filter: PAPER_SHADOW }}>
      <path d="M-220,0 Q-120,-60 40,-50 L70,-130 L110,-46 Q190,-36 240,-4 Q190,30 60,36 L30,80 L10,38 Q-110,40 -220,0 Z M-220,0 L-300,-70 L-276,0 L-300,70 Z" fill="#6f8799" />
      <path d="M-200,8 Q0,46 230,4 Q190,30 60,36 Q-110,40 -200,8 Z" fill="#e8eef2" />
      <circle cx={170} cy={-14} r={6} fill="#1d1a18" />
    </g>
  );
};
export const MouseP: React.FC<{ x: number; y: number; len: number }> = ({ x, y, len }) => {
  const s = len / 170;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} style={{ filter: PAPER_SHADOW }}>
      <path d="M60,10 Q120,20 140,-20" stroke="#e0a9a9" strokeWidth={7} fill="none" strokeLinecap="round" />
      <ellipse rx={70} ry={42} fill="#eef2f4" />
      <circle cx={-56} cy={-30} r={22} fill="#eef2f4" /><circle cx={-56} cy={-30} r={11} fill="#f2b6b6" />
      <path d="M-60,-10 Q-100,0 -96,14 Q-80,20 -60,12 Z" fill="#eef2f4" />
      <circle cx={-78} cy={-2} r={4} fill="#1d1a18" /><circle cx={-98} cy={10} r={4} fill="#f2a0a0" />
    </g>
  );
};

// ---------------------------------------------------------------------------------------- objets

/** Bouteille de vinaigre — hauteur réelle 0,30 m. Repère : (x,y) = POINT DE PRISE (milieu du corps). */
export const vinegarPts = (x: number, y: number, h: number, tilt = 0) => {
  const s = h / 272; const r = (tilt * Math.PI) / 180;
  const R = (px: number, py: number): V => [x + (px * Math.cos(r) - py * Math.sin(r)) * s, y + (px * Math.sin(r) + py * Math.cos(r)) * s];
  return { grip: [x, y] as V, mouth: R(0, -196), base: R(0, 76), s };
};
export const VinegarP: React.FC<{ x: number; y: number; h: number; tilt?: number }> = ({ x, y, h, tilt = 0 }) => {
  const s = h / 272;
  return (
    <g transform={`translate(${x},${y}) rotate(${tilt}) scale(${s}) translate(0,-20)`} style={{ filter: PAPER_SHADOW }}>
      <path d="M-16,-150 L16,-150 L16,-120 Q44,-100 44,-60 L44,80 Q44,96 28,96 L-28,96 Q-44,96 -44,80 L-44,-60 Q-44,-100 -16,-120 Z" fill="#f6ecd2" />
      <path d="M-44,10 L44,10 L44,80 Q44,96 28,96 L-28,96 Q-44,96 -44,80 Z" fill="#e8c46a" opacity={0.6} />
      <rect x={-20} y={-176} width={40} height={28} rx={4} fill="#c94f3f" />
      <rect x={-40} y={-40} width={80} height={46} rx={3} fill="#ffffff" />
      <text x={0} y={-11} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={14} fill="#2a2420">VINAIGRE</text>
    </g>
  );
};
/** Bocal — hauteur réelle 0,25 m. Repère : (x,y) = CENTRE DE LA BASE (posé sur un support). */
export const JarP: React.FC<{ x: number; y: number; h: number; hl?: boolean; children?: React.ReactNode }> = ({ x, y, h, hl, children }) => {
  const s = h / 366;
  return (
    <g transform={`translate(${x},${y}) scale(${s}) translate(0,-160)`} style={{ filter: PAPER_SHADOW }}>
      <rect x={-120} y={-170} width={240} height={330} rx={26} fill="#cfeef3" fillOpacity={0.35} stroke={hl ? "#f7c948" : "#eaf8fb"} strokeWidth={hl ? 9 : 5} />
      <rect x={-112} y={-110} width={224} height={262} rx={20} fill="#7fc6d8" fillOpacity={0.3} />
      <rect x={-132} y={-206} width={264} height={40} rx={8} fill="#8a6a3a" />
      {children}
      <path d="M-92,-120 L-92,110" stroke="#ffffff" strokeWidth={9} opacity={0.4} strokeLinecap="round" />
    </g>
  );
};
/** Pièce de 2 € (25,75 mm). */
export const Coin2e: React.FC<{ x: number; y: number; d: number }> = ({ x, y, d }) => (
  <g transform={`translate(${x},${y})`} style={{ filter: PAPER_SHADOW }}>
    <circle r={d / 2} fill="#d8c27a" /><circle r={d * 0.36} fill="#c9ccd1" />
    <text y={d * 0.12} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={d * 0.36} fill="#5a5a5a">2€</text>
  </g>
);
