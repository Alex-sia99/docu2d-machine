// Miniature Docu2D : l'espèce en grand, gueule ouverte (menace), sur le monde du film + 2-3 mots en très gros
// (codes des miniatures les plus vues de la niche : un animal, une émotion, un texte court, fort contraste).
import React from "react";
import { AbsoluteFill } from "remotion";
import { WorldView, sceneAt } from "./world";
import { QuadP, SPECIES } from "./bestiary";
import { PF } from "./paper";
import { DocuProps } from "./index";

export const Docu2DThumb: React.FC<DocuProps & { thumbText?: string }> = ({ sb, thumbText }) => {
  const hero = sb?.meta?.hero && SPECIES[sb.meta.hero] ? sb.meta.hero : "hippo";
  const q = SPECIES[hero];
  const text = (thumbText || (sb as any)?.thumbText || "").toUpperCase();
  const S = sceneAt(sb?.meta?.world || "savane", undefined, 3);
  S.hippos = [];
  const ppm = 560 / (q.len + q.head.len + q.head.neck);
  return (
    <AbsoluteFill>
      <WorldView kind={sb?.meta?.world || "savane"} T={3} cam={{ x: 14, y: -2.2, z: 1.0 }} S={S} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 62% 55%, rgba(255,210,120,0.0) 0%, rgba(10,20,30,0.55) 80%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <QuadP q={hero} x={1080} y={1010} ppm={ppm} st={{ T: 3, gape: 140 }} />
      </svg>
      {text && <div style={{ position: "absolute", left: 70, top: 90, width: 900, fontFamily: PF, fontWeight: 800, fontSize: text.length > 14 ? 130 : 170, lineHeight: 0.95, color: "#ffd84a", textTransform: "uppercase",
        WebkitTextStroke: "10px #111", paintOrder: "stroke fill", textShadow: "0 12px 30px rgba(0,0,0,0.6)" }}>{text}</div>}
    </AbsoluteFill>
  );
};
