// Docu2D (copie générique du kit Jelly8 : chemins d’assets relatifs au --public-dir, libellés traduits).
// Kit « papier découpé » (dissection Oceanverse, agent-os/docs/DISSECTION-OCEANVERSE.md) :
// étiquettes déchirées en minuscules qui POPPENT (0 → 1,15 → 1 en 0,3 s), badges ronds barrés, cartes et cadres photo
// déchirés qui glissent, sommaire 5 cartes, boutons J'aime / S'abonner avec curseur, grain papier.
import React from "react";
import { AbsoluteFill, OffthreadVideo, Img, staticFile, Easing, random } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const pop = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] });
export const PF = pop.fontFamily;
export const K = { cream: "#f3ecdc", ink: "#1d2a30", orange: "#e5533d", yellow: "#f2c14e", green: "#2a9d8f", teal: "#1f6e86", red: "#d63b30", white: "#fbf8f1" };
export const cl = (x: number) => Math.max(0, Math.min(1, x));
const ez = Easing.bezier(0.22, 1, 0.36, 1);
export const ease = (T: number, t0: number, d = 0.35) => ez(cl((T - t0) / d));
export const inout = (u: number) => Easing.inOut(Easing.cubic)(cl(u));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** pop avec dépassement : 0 → 1,15 → 1 en 0,3 s */
export const popK = (T: number, t0: number, d = 0.3) => { const u = cl((T - t0) / d); if (u <= 0) return 0; return u < 0.6 ? (u / 0.6) * 1.15 : 1.15 - ((u - 0.6) / 0.4) * 0.15; };
/** visibilité [t0, t1] avec sortie rapide — la sortie se fait PENDANT que les cartes/cadres glissent ([t1-0,3 ; t1-0,1]) : plus de texte qui reste seul après la photo (retour Alex 2026-11-27) */
export const vis = (T: number, t0: number, t1?: number) => { if (T < t0) return 0; if (t1 === undefined) return 1; const f = Math.max(t0 + 0.15, t1 - 0.34); return T > f ? Math.max(0, 1 - (T - f) / 0.12) : 1; };
export const a8 = (p: string) => staticFile(p);

/** Bord déchiré (clip-path polygon) déterministe. */
const torn = (seed: string, n = 28, amp = 2.2) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${(i / n) * 100}% ${random(seed + "t" + i) * amp}%`);
  for (let i = 0; i <= n; i++) pts.push(`${100 - random(seed + "r" + i) * amp * 0.6}% ${(i / n) * 100}%`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n) * 100}% ${100 - random(seed + "b" + i) * amp}%`);
  for (let i = n; i >= 0; i--) pts.push(`${random(seed + "l" + i) * amp * 0.6}% ${(i / n) * 100}%`);
  return `polygon(${pts.join(",")})`;
};

/** Étiquette papier : `kind` blanc (défaut) / orange (question-choc) / jaune / vert. Centrée en (x,y). */
export const Tag: React.FC<{ T: number; t0: number; t1?: number; x: number; y: number; text: string; kind?: "white" | "orange" | "yellow" | "green" | "dark"; size?: number; rot?: number; sub?: string }> = ({ T, t0, t1, x, y, text, kind = "white", size = 30, rot, sub }) => {
  const v = vis(T, t0, t1); if (v <= 0) return null;
  const k = popK(T, t0);
  const bg = { white: K.white, orange: K.orange, yellow: K.yellow, green: K.green, dark: "#1e2b33" }[kind];
  const fg = kind === "white" || kind === "yellow" ? K.ink : "#ffffff";
  const r = rot ?? (random("rot" + text) - 0.5) * 4;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${r}deg) scale(${k})`, opacity: v, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ background: bg, color: fg, fontFamily: PF, fontWeight: 700, fontSize: size, lineHeight: 1.15, padding: `${size * 0.32}px ${size * 0.6}px ${size * 0.36}px`, clipPath: torn("tag" + text, 16, 6), whiteSpace: "pre", textAlign: "center", boxShadow: "0 6px 14px rgba(0,0,0,0.25)" }}>{text}</div>
      {sub && <div style={{ background: K.white, color: K.ink, fontFamily: PF, fontWeight: 600, fontSize: size * 0.6, padding: "4px 12px", clipPath: torn("sub" + sub, 12, 6), whiteSpace: "pre" }}>{sub}</div>}
    </div>
  );
};

/** Badge rond papier avec icône (SVG 100×100 centré), barré en rouge si `no`, légende dessous. */
export const Badge: React.FC<{ T: number; t0: number; t1?: number; x: number; y: number; r?: number; icon: React.ReactNode; label?: string; no?: boolean; ok?: boolean; ring?: string }> = ({ T, t0, t1, x, y, r = 56, icon, label, no, ok, ring }) => {
  const v = vis(T, t0, t1); if (v <= 0) return null;
  const k = popK(T, t0); const sk = ease(T, t0 + 0.3, 0.3);
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, transform: `scale(${k})`, opacity: v, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={2 * r} height={2 * r} viewBox="-50 -50 100 100" style={{ filter: "drop-shadow(0 5px 8px rgba(0,0,0,0.3))" }}>
        <circle r={47} fill={K.cream} stroke={ring ?? "none"} strokeWidth={ring ? 5 : 0} />
        <g transform="scale(0.62)">{icon}</g>
        {no && <><circle r={40} fill="none" stroke={K.red} strokeWidth={7} strokeDasharray={`${251 * sk} 251`} transform="rotate(-45)" /><path d="M-28,28 L28,-28" stroke={K.red} strokeWidth={7} strokeLinecap="round" strokeDasharray={80} strokeDashoffset={80 * (1 - sk)} /></>}
        {ok && <circle cx={34} cy={-34} r={11} fill={K.green} />}
      </svg>
      {label && <div style={{ marginTop: 6, background: K.white, color: K.ink, fontFamily: PF, fontWeight: 700, fontSize: 19, padding: "3px 12px 4px", clipPath: torn("lb" + label, 10, 8), whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  );
};

/** Carte papier (fond crème, bords déchirés) qui glisse depuis le bas avec une légère rotation ; contenu CENTRÉ. */
export const Card: React.FC<{ T: number; t0: number; t1?: number; x?: number; y?: number; w: number; h: number; rot?: number; bg?: string; children?: React.ReactNode; from?: "bottom" | "right" | "left" }> = ({ T, t0, t1, x = 960, y = 540, w, h, rot = -1.2, bg = K.cream, children, from = "bottom" }) => {
  if (T < t0 - 0.01) return null;
  const inn = ease(T, t0, 0.45), out = t1 !== undefined ? ease(T, t1 - 0.3, 0.3) : 0;
  if (out >= 1) return null;
  const off = (1 - inn) * 900 + out * 1100;
  const tx = from === "right" ? off : from === "left" ? -off : 0, ty = from === "bottom" ? off * (out > 0 ? -1 : 1) : 0;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translate(${tx}px,${ty}px) rotate(${rot * (1 - inn * 0.2)}deg)`, filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.35))" }}>
      <div style={{ position: "absolute", inset: 0, background: bg, clipPath: torn("card" + w + h + x, 40, 1.4), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** Cadre photo/vidéo déchiré (b-roll) avec crédit minuscule. */
export const Frame: React.FC<{ T: number; t0: number; t1?: number; x?: number; y?: number; w: number; h: number; src: string; video?: boolean; start?: number; credit: string; rot?: number; L?: number }> = ({ T, t0, t1, x = 960, y = 540, w, h, src, video, start = 0, credit, rot = 1.5 }) => {
  if (T < t0 - 0.01) return null;
  const inn = ease(T, t0, 0.4), out = t1 !== undefined ? ease(T, t1 - 0.3, 0.3) : 0;
  if (out >= 1) return null;
  const s = 1 + (T - t0) * 0.012;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translateY(${(1 - inn) * 800 - out * 1000}px) rotate(${rot}deg)`, filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.4))" }}>
      <div style={{ position: "absolute", inset: 0, background: K.white, clipPath: torn("fr" + src, 40, 1.2) }} />
      <div style={{ position: "absolute", left: 16, top: 16, right: 16, bottom: 44, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${s})` }}>
          {video ? <OffthreadVideo src={a8(src)} startFrom={Math.round(start * 30)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Img src={a8(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      </div>
      <div style={{ position: "absolute", left: 18, bottom: 12, fontFamily: PF, fontWeight: 500, fontSize: 15, color: "#5b5b55" }}>{credit}</div>
    </div>
  );
};

/** Gros nombre + unité (style Oceanverse « 6 tonnes »). */
export const BigNum: React.FC<{ T: number; t0: number; t1?: number; x: number; y: number; n: string; unit?: string; sub?: string; col?: string; size?: number; unitCol?: string }> = ({ T, t0, t1, x, y, n, unit, sub, col = "#ffffff", size = 110, unitCol }) => {
  const v = vis(T, t0, t1); if (v <= 0) return null;
  const k = popK(T, t0);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${k})`, opacity: v, textAlign: "center", fontFamily: PF }}>
      <div style={{ whiteSpace: "nowrap", textShadow: "0 4px 14px rgba(0,0,0,0.35)" }}><span style={{ fontWeight: 800, fontSize: size, color: col }}>{n}</span>{unit && <span style={{ fontWeight: 700, fontSize: Math.max(30, size * 0.32), color: unitCol ?? (col === "#ffffff" ? K.yellow : K.orange), marginLeft: 10 }}>{unit}</span>}</div>
      {sub && <div style={{ display: "inline-block", marginTop: 4, background: K.white, color: K.ink, fontWeight: 700, fontSize: Math.max(26, size * 0.2), padding: "3px 12px", clipPath: torn("bn" + sub, 10, 8) }}>{sub}</div>}
    </div>
  );
};

/** Grain papier plein écran (texture procédurale déterministe, multiply). */
export const Grain: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.18, backgroundImage: `url(${a8("paper.png")})`, backgroundSize: "512px 512px" }} />
);

/** Sommaire 5 cartes (Oceanverse) : `cur` = carte en cours (agrandie), `upTo` = nb de cartes visibles. */
export const Chapters: React.FC<{ T: number; t0: number; t1?: number; icons: React.ReactNode[]; cur?: number; upTo?: number[]; title?: string; y?: number }> = ({ T, t0, t1, icons, cur, upTo, title, y = 470 }) => {
  const v = vis(T, t0, t1); if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - 110, opacity: v, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end" }}>
        {icons.map((ic, i) => {
          const appear = upTo ? upTo[i] : t0 + i * 0.12;
          const k = popK(T, appear); if (k <= 0) return <div key={i} style={{ width: 150 }} />;
          const big = cur === i;
          return (
            <div key={i} style={{ width: big ? 190 : 150, height: big ? 236 : 186, transform: `scale(${k})`, background: big ? K.cream : "#d9d1bf", opacity: cur !== undefined && !big ? 0.55 : 1, clipPath: torn("ch" + i, 14, 3), position: "relative", display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.3))" }}>
              <div style={{ position: "absolute", left: 12, top: 10, width: 30, height: 30, borderRadius: 99, background: K.ink, color: "#fff", fontFamily: PF, fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
              <svg width={big ? 130 : 100} height={big ? 130 : 100} viewBox="-50 -50 100 100">{ic}</svg>
            </div>
          );
        })}
      </div>
      {title && <Tag T={T} t0={t0 + 0.25} x={960} y={y + 150} text={title} size={30} />}
    </div>
  );
};

/** Boutons J'aime / S'abonner + curseur qui clique (milieu de vidéo). */
export const LikeSub: React.FC<{ T: number; t0: number; tLike: number; tSub: number; t1?: number; labels?: { like: string; sub: string; subbed: string } }> = ({ T, t0, tLike, tSub, t1, labels = { like: "J'aime", sub: "S'abonner", subbed: "Abonné" } }) => {
  const v = vis(T, t0, t1); if (v <= 0) return null;
  const k = popK(T, t0);
  const liked = T > tLike, subbed = T > tSub;
  const cur: [number, number] = T < tLike ? [lerp(1200, 870, ease(T, t0 + 0.2, tLike - t0 - 0.2)), lerp(700, 560, ease(T, t0 + 0.2, tLike - t0 - 0.2))] : [lerp(870, 1045, ease(T, tLike + 0.3, tSub - tLike - 0.3)), 560];
  const press = (t: number) => (T > t && T < t + 0.15 ? 0.92 : 1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, transform: `scale(${k})`, transformOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", left: 960 - 300, top: 510, width: 600, display: "flex", gap: 24, justifyContent: "center", alignItems: "center", fontFamily: PF, fontWeight: 700, fontSize: 30 }}>
        <div style={{ padding: "14px 34px", borderRadius: 99, background: liked ? "#1f7a6f" : K.green, color: "#fff", transform: `scale(${press(tLike)})` }}>{labels.like}{liked ? " ✓" : ""}</div>
        <div style={{ padding: "14px 34px", borderRadius: 99, background: subbed ? "#2b3a42" : K.orange, color: "#fff", transform: `scale(${press(tSub)})` }}>{subbed ? labels.subbed + " ✓" : labels.sub}</div>
        <div style={{ width: 58, height: 58, borderRadius: 99, background: K.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}></div>
      </div>
      <svg width={40} height={48} viewBox="0 0 20 24" style={{ position: "absolute", left: cur[0], top: cur[1] }}><path d="M2,1 L2,19 L7,14 L10,22 L13,21 L10,13 L17,13 Z" fill="#fff" stroke="#1d2a30" strokeWidth={1.5} /></svg>
    </div>
  );
};
