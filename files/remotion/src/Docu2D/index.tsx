// Docu2D — composition principale : storyboard JSON + timeline de voix → plan-séquence papier.
// Props : { sb (storyboard), tl (timeline), assets ({id:{file,kind,credit,start}}), root (dossier du run dans --public-dir) }.
// Tout est calculé : le LLM n'écrit que des beats typés ancrés sur des MOTS ; aucune coordonnée.
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { resolve, worldAt, isCard, wordTime, Storyboard, Timeline, Resolved } from "./timing";
import { WorldView, camAt, sceneAt, PPM } from "./world";
import { CARDS, tagSlot } from "./beats";
import { Tag, Grain, LikeSub } from "./paper";

export type DocuProps = { sb: Storyboard; tl: Timeline; assets: Record<string, any>; root: string; tail?: number };
export const FPS = 30;
export const docuMeta = async ({ props }: { props: DocuProps }) => ({ durationInFrames: Math.max(30, Math.ceil(((props.tl?.total ?? 10) + (props.tail ?? 0)) * FPS)) });

const LABELS: Record<string, { like: string; sub: string; subbed: string }> = {
  fr: { like: "J'aime", sub: "S'abonner", subbed: "Abonné" }, en: { like: "Like", sub: "Subscribe", subbed: "Subscribed" },
  es: { like: "Me gusta", sub: "Suscribirse", subbed: "Suscrito" }, de: { like: "Mag ich", sub: "Abonnieren", subbed: "Abonniert" },
  pt: { like: "Gostei", sub: "Inscrever-se", subbed: "Inscrito" }, it: { like: "Mi piace", sub: "Iscriviti", subbed: "Iscritto" },
};

export const Docu2D: React.FC<DocuProps> = ({ sb, tl, assets = {}, root = "" }) => {
  const f = useCurrentFrame(); const T = f / FPS;
  const R = useMemo(() => resolve(JSON.parse(JSON.stringify(sb)), tl), [sb, tl]);
  const beats = R.beats;
  const { cur, prev } = worldAt(beats, T);
  const cam = camAt(cur, prev, T);
  const S = sceneAt(sb.meta.world, cur, T, sb.meta.hero);
  // la caméra SUIT le héros quand il se déplace (broute, charge, marche au fond) : il ne sort jamais du cadre
  const FOLLOW: Record<string, number> = { under: 1.1, sleep: 1.2 }; // R6 : plus de caméra collée sur un animal qui marche (effet tapis roulant)
  const hero = S.hippos.find((h) => h.id === "hero");
  if (cur && hero && FOLLOW[cur.preset]) { const k = Math.min(1, Math.max(0, (T - cur.t0) / 1.1)); const kk = k * k * (3 - 2 * k); cam.x = cam.x + (hero.x / PPM + (hero.flip ? -0.8 : 0.8) - cam.x) * kk; cam.z = cam.z + (FOLLOW[cur.preset] - cam.z) * kk; if (cur.preset === "under" || cur.preset === "sleep") cam.y = cam.y + (hero.y / PPM - 1.0 - cam.y) * kk; }
  const cards = beats.filter((b) => isCard(b) && T >= b.t0 - 0.05 && T < b.t1 + 0.1);
  const dim = beats.filter(isCard).reduce((m, b) => Math.max(m, Math.min(1, (T - b.t0 + 0.2) / 0.4, (b.t1 + 0.1 - T) / 0.4)), 0);
  const tags = beats.filter((b) => b.type === "tag" && T >= b.t0 - 0.05 && T < b.t1 + 0.3);
  const cta = beats.find((b) => b.type === "cta" && T >= b.t0 - 0.05 && T < b.t1 + 0.3);
  const L = LABELS[sb.meta.lang] || LABELS.en;
  return (
    <AbsoluteFill style={{ background: "#0d1a22" }}>
      <WorldView kind={sb.meta.world} T={T} cam={cam} S={S} species={sb.meta.hero} />
      {dim > 0 && <AbsoluteFill style={{ background: "#0b1720", opacity: 0.5 * Math.max(0, dim) }} />}
      {cards.map((b) => { const C = CARDS[b.type]; return C ? <C key={b.id} b={b} T={T} sb={sb} root={root} assets={assets} /> : null; })}
      {tags.map((b) => { const [x, y] = tagSlot(!!b.card, b.slot ?? 0); return <Tag key={b.id} T={T} t0={b.t0} t1={b.t1} x={x} y={y} text={b.text} sub={b.sub} kind={b.kind || (b.card ? "white" : "white")} size={b.card ? 30 : 34} />; })}
      {cta && <LikeSub T={T} t0={cta.t0} t1={cta.t1} tLike={safeT(tl, cta, "like", cta.t0 + 1.2)} tSub={safeT(tl, cta, "sub", cta.t0 + 2.6)} labels={L} />}
      <Grain />
    </AbsoluteFill>
  );
};
const safeT = (tl: Timeline, b: Resolved, k: string, d: number) => { try { return b[k] ? wordTime(tl, b.line, b[k]) : d; } catch { return d; } };
