// Planche du bestiaire : chaque espèce à l'échelle réelle (grille 1 m) + l'espèce `id` en grand, gueule fermée / ouverte / marche.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { QuadP, SPECIES, REAL } from "./bestiary";
import { PF, K } from "./paper";
import { PersonFront } from "../cast2d/people";

export const BestiarySheet: React.FC<{ id?: string }> = ({ id = "hippo" }) => {
  const f = useCurrentFrame(); const T = f / 30;
  const ppm = 120, ground = 1000;
  const ids = Object.keys(SPECIES);
  let xx = 60;
  return (
    <AbsoluteFill style={{ background: K.cream, fontFamily: PF }}>
      <svg width={1920} height={1080}>
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1={0} x2={1920} y1={ground - i * ppm} y2={ground - i * ppm} stroke="#d8ccb3" strokeWidth={1} />)}
        <line x1={0} x2={1920} y1={ground} y2={ground} stroke={K.ink} strokeWidth={3} />
        {/* ligne du haut : l'espèce en grand, trois états */}
        {[{ gape: 0 }, { gape: 120 }, { moving: true, dist: T * 1.2 }].map((st, i) => (
          <g key={i} transform={`translate(${330 + i * 620},${430}) scale(0.55)`}>
            <QuadP q={id} x={0} y={0} ppm={ppm * 1.6} st={{ T, ...st }} />
          </g>
        ))}
        {/* ligne du bas : toutes les espèces + un humain de 1,75 m, à la même échelle */}
        <g transform={`translate(0,0)`}>
          <PersonFront c="vous" ppm={ppm * 0.5} x={50} ground={ground} T={T} />
          {ids.map((k) => { const L = (REAL[k]?.l ?? 3) * 0.5 * ppm * 0.5; const x = (xx += L + 40) - L / 2 + 40; return <g key={k}><QuadP q={k} x={x} y={ground} ppm={ppm * 0.5} st={{ T }} /><text x={x} y={ground + 40} textAnchor="middle" fontSize={22} fontWeight={700} fill={K.ink}>{SPECIES[k].name.fr}</text></g>; })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
