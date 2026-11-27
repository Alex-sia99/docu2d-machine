// Miniature Docu2D : l'espèce en grand, gueule ouverte (menace), sur le monde du film + 2-3 mots en très gros
// (codes des miniatures les plus vues de la niche : un animal, une émotion, un texte court, fort contraste).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { WorldView, sceneAt } from "./world";
import { QuadP, SPECIES } from "./bestiary";
import { PF } from "./paper";
import { DocuProps } from "./index";

/** Mode IA (par défaut dans la machine) : fond = image IA au code de la niche (animal gravé énorme, humain minuscule, flèche rouge),
 *  texte posé ici (net, sans faute d'accent) : blanc, les mots entre *astérisques* en rouge. */
const ThumbAI: React.FC<{ bg: string; text: string; root?: string }> = ({ bg, text, root }) => {
  const words = text.split(/\s+/).filter(Boolean); const len = text.replace(/\*/g, "").length;
  const size = len > 22 ? 108 : len > 14 ? 128 : 150;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile(root ? `${root}/${bg}` : bg)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 60, top: 50, width: 1020, fontFamily: "'Arial Black', 'Montserrat', sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.02, textTransform: "uppercase", color: "#fff", textShadow: "0 6px 24px rgba(0,0,0,0.85)" }}>
        {words.map((w, i) => { const red = /\*/.test(w); return <span key={i} style={{ color: red ? "#ff1f1f" : "#fff" }}>{w.replace(/\*/g, "")}{i < words.length - 1 ? " " : ""}</span>; })}
      </div>
    </AbsoluteFill>
  );
};

export const Docu2DThumb: React.FC<DocuProps & { thumbText?: string; thumbBg?: string }> = ({ sb, thumbText, thumbBg, root }: any) => {
  if (thumbBg) return <ThumbAI bg={thumbBg} text={thumbText || ""} root={root} />;
  const hero = sb?.meta?.hero && SPECIES[sb.meta.hero] ? sb.meta.hero : "hippo";
  const q = SPECIES[hero];
  const text = (thumbText || (sb as any)?.thumbText || "").toUpperCase();
  const S = sceneAt(sb?.meta?.world || "savane", undefined, 3, sb?.meta?.hero);
  S.hippos = [];
  const ppm = 560 / (q.len + q.head.len + q.head.neck);
  return (
    <AbsoluteFill>
      <WorldView kind={sb?.meta?.world || "savane"} T={3} cam={{ x: 14, y: -2.2, z: 1.0 }} S={S} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 62% 55%, rgba(255,210,120,0.0) 0%, rgba(10,20,30,0.55) 80%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* gueule ouverte = menace réelle chez l'hippopotame, le crocodile, le lion ; les autres CHARGENT (un buffle n'ouvre pas la gueule) */}
        <QuadP q={hero} x={1080} y={1010} ppm={ppm} st={["hippo", "crocodile", "lion"].includes(hero) ? { T: 3, gape: 140 } : { T: 3, moving: true, run: true, dist: 0.9, headDown: 16 }} />
      </svg>
      {text && <div style={{ position: "absolute", left: 70, top: 90, width: 900, fontFamily: PF, fontWeight: 800, fontSize: text.length > 14 ? 130 : 170, lineHeight: 0.95, color: "#ffd84a", textTransform: "uppercase",
        WebkitTextStroke: "10px #111", paintOrder: "stroke fill", textShadow: "0 12px 30px rgba(0,0,0,0.6)" }}>{text}</div>}
    </AbsoluteFill>
  );
};
