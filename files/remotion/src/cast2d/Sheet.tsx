// Planche d'un personnage de la banque : face (debout, bras levés, main tendue), profil (debout, à genoux, allongé, nage),
// règle en mètres → on vérifie l'identité ET la taille réelle avant toute utilisation.
import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { CAST } from "./cast";
import { PersonFront, PersonSide } from "./people";

const pop = loadFont("normal", { weights: ["600", "800"], subsets: ["latin", "latin-ext"] });

export const CastSheet: React.FC<{ id: string }> = ({ id }) => {
  const c = CAST[id];
  const ppm = 230, ground = 900;
  const T = 1;
  const lab = (x: number, t: string) => <text x={x} y={985} textAnchor="middle" fontFamily={pop.fontFamily} fontWeight={600} fontSize={22} fill="#20404d">{t}</text>;
  return (
    <AbsoluteFill style={{ background: "#efe6d2" }}>
      <svg width={1920} height={1080}>
        {[0, 0.5, 1, 1.5, 2].map((m) => <g key={m}><line x1={60} x2={1880} y1={ground - m * ppm} y2={ground - m * ppm} stroke="#c9bb9b" strokeDasharray="6 8" /><text x={30} y={ground - m * ppm + 6} fontFamily={pop.fontFamily} fontSize={18} fill="#8a7a5a">{m} m</text></g>)}
        <line x1={60} x2={1880} y1={ground} y2={ground} stroke="#8a7a5a" strokeWidth={3} />
        <PersonFront c={c} ppm={ppm} x={200} ground={ground} />
        <PersonFront c={c} ppm={ppm} x={430} ground={ground} pose={{ la: -160, ra: 160, la2: 10, ra2: -10 }} />
        <PersonFront c={c} ppm={ppm} x={660} ground={ground} pose={{ rh: [800, ground - c.height * ppm * 0.55] }} />
        <PersonSide c={c} ppm={ppm} x={950} y={ground - (56 + 54 + 6) * (c.height * ppm / 269)} pose={{ torso: 2, thigh: 4, shin: 0, thigh2: -4, shin2: -2 }} />
        {/* à genoux, buste penché, bras tendus vers le sol devant lui */}
        <PersonSide c={c} ppm={ppm} x={1170} y={ground - 56 * (c.height * ppm / 269) - 6} pose={{ torso: 28, thigh: 0, shin: -90, hand: [1170 + 0.42 * c.height * ppm * 0.62, ground - 6] }} />
        {/* allongé sur le dos, tête à droite */}
        <PersonSide c={c} ppm={ppm} x={1420} y={ground - 22 * (c.height * ppm / 269)} dir={-1} pose={{ torso: -90, thigh: 90, shin: 90, hand: [1420 + 0.3 * c.height * ppm, ground - 10] }} />
        <PersonSide c={c} ppm={ppm} x={1720} y={ground - 300} pose={{ torso: 80, thigh: -100, shin: -100 + Math.sin(T) * 10, thigh2: -80, shin2: -80, hand: [1720 + 160, ground - 330] }} />
        {lab(200, "debout")}{lab(430, "bras levés")}{lab(660, "main tendue")}{lab(950, "profil")}{lab(1200, "à genoux")}{lab(1480, "allongé")}{lab(1760, "nage")}
      </svg>
      <div style={{ position: "absolute", left: 60, top: 40, fontFamily: pop.fontFamily, color: "#16323d" }}>
        <div style={{ fontWeight: 800, fontSize: 44 }}>{c.label}</div>
        <div style={{ fontWeight: 600, fontSize: 22, opacity: 0.8 }}>{c.role} · {c.height.toFixed(2)} m · id « {c.id} »{c.era ? ` · ${c.era}` : ""}</div>
      </div>
    </AbsoluteFill>
  );
};
