// Docu2D — CARTES du storyboard. Mise en page FIXE et centrée par type (aucune coordonnée venant du LLM) :
// le contenu est calculé, les sous-éléments entrent sur LEUR mot (`_t`), tout sort avec la carte.
import React from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { Tag, Badge, Card, BigNum, Chapters, LikeSub, K, PF, ease, popK, vis, lerp, cl } from "./paper";
import { icon } from "./icons2";
import { QuadP, SPECIES, REAL, partPos } from "./bestiary";
import { PersonFront } from "../cast2d/people";
import { Resolved, Storyboard } from "./timing";
import WM from "./worldmap.json";

type P = { b: Resolved; T: number; sb: Storyboard; root: string; assets: Record<string, any> };
const CW = 1520, CH = 800, CY = 500; // carte standard : 1520 × 800 centrée à y = 500 (laisse 2 emplacements d'étiquettes dessous)

const Title: React.FC<{ text: string; size?: number; col?: string }> = ({ text, size = 64, col = K.ink }) => (
  <div style={{ fontFamily: PF, fontWeight: 800, fontSize: size, color: col, lineHeight: 1.12, textAlign: "center", maxWidth: CW - 160 }}>{text}</div>
);

export const TitleCard: React.FC<P> = ({ b, T }) => (
  <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={560} y={480}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `scale(${0.9 + 0.1 * ease(T, b.t0 + 0.2, 0.5)})` }}>
      <Title text={b.text} size={b.text.length > 50 ? 62 : 74} />
      {b.sub && <div style={{ fontFamily: PF, fontWeight: 600, fontSize: 32, color: K.orange }}>{b.sub}</div>}
    </div>
  </Card>
);

export const TocCard: React.FC<P> = ({ b, T, sb }) => {
  const ics = sb.chapters.map((c) => icon(c.icon));
  const upTo = sb.chapters.map((_, i) => (b.items?.[i]?._t ?? b.t0 + 0.3 + i * 0.5));
  return <Chapters T={T} t0={b.t0} t1={b.t1} icons={ics} upTo={upTo} title={b.title} y={500} />;
};

export const ChapterCard: React.FC<P> = ({ b, T, sb }) => {
  const n = (b.n ?? 1) - 1;
  const ics = sb.chapters.map((c) => icon(c.icon));
  return (
    <>
      <Chapters T={T} t0={b.t0} t1={b.t1} icons={ics} cur={n} y={430} />
      <Tag T={T} t0={b.t0 + 0.25} t1={b.t1} x={960} y={720} text={b.label ?? `Question ${n + 1}`} kind="orange" size={44} />
      <Tag T={T} t0={b.t0 + 0.45} t1={b.t1} x={960} y={810} text={b.text ?? sb.chapters[n]?.title ?? ""} size={34} />
    </>
  );
};

export const BigNumCard: React.FC<P> = ({ b, T }) => (
  <Card T={T} t0={b.t0} t1={b.t1} w={1100} h={620} y={480} bg={K.cream}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {b.icon && <svg width={150} height={150} viewBox="-50 -50 100 100" style={{ transform: `scale(${popK(T, b.t0 + 0.15)})` }}>{icon(b.icon)}</svg>}
      <div style={{ position: "relative", width: 1000, height: 200 }}><BigNum T={T} t0={b.t0 + 0.25} t1={b.t1} x={500} y={100} n={b.n} unit={b.unit} col={K.ink} unitCol={K.orange} size={String(b.n).length + String(b.unit || "").length > 13 ? 84 : String(b.n).length + String(b.unit || "").length > 9 ? 110 : 150} /></div>
      {b.sub && <div style={{ fontFamily: PF, fontWeight: 700, fontSize: 36, color: K.teal, opacity: cl((T - b.t0 - 0.5) / 0.3), textAlign: "center", maxWidth: 950 }}>{b.sub}</div>}
    </div>
  </Card>
);

/** Comparaison d'échelle : chaque élément dessiné à sa taille RÉELLE sur une même ligne de sol. */
export const CompareCard: React.FC<P> = ({ b, T }) => {
  const items: any[] = b.items || [];
  const metric = b.metric === "length" ? "l" : "h";
  const maxH = Math.max(...items.map((it) => (REAL[it.who]?.h ?? 1)));
  const totalL = items.reduce((a, it) => a + (REAL[it.who]?.l ?? 1) + 0.5, 0);
  const ppm = Math.min(440 / maxH, 1400 / totalL);
  let x = (1520 - totalL * ppm) / 2;
  const gy = 650;
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      <svg width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[1, 2, 3, 4].map((m) => m * ppm < 520 && <g key={m}><line x1={60} x2={CW - 60} y1={gy - m * ppm} y2={gy - m * ppm} stroke="#d8ccb3" strokeDasharray="8 8" /><text x={70} y={gy - m * ppm - 8} fontFamily={PF} fontSize={20} fill="#9a8e74">{m} m</text></g>)}
        <line x1={60} x2={CW - 60} y1={gy} y2={gy} stroke={K.ink} strokeWidth={4} />
        {items.map((it, i) => {
          const L = (REAL[it.who]?.l ?? 1); const cx = x + (L * ppm) / 2; x += (L + 0.5) * ppm;
          const k = popK(T, it._t ?? b.t0 + 0.3 + i * 0.3); if (k <= 0) return null;
          return <g key={i} transform={`translate(${cx},${gy}) scale(${k}) translate(${-cx},${-gy})`}>
            {SPECIES[it.who] ? <QuadP q={it.who} x={cx} y={gy} ppm={ppm} st={{ T }} /> : it.who === "car" ? <Car x={cx} y={gy} ppm={ppm} col={it.col} /> : <PersonFront c={it.who === "child" ? "rachael" : "vous"} ppm={ppm} x={cx} ground={gy} T={T} />}
            <text x={cx} y={gy + 50} textAnchor="middle" fontFamily={PF} fontWeight={800} fontSize={36} fill={K.ink}>{it.label}</text>
            {it.value && <text x={cx} y={gy + 92} textAnchor="middle" fontFamily={PF} fontWeight={800} fontSize={34} fill={K.orange}>{it.value}</text>}
          </g>;
        })}
      </svg>
    </Card>
  );
};
const Car: React.FC<{ x: number; y: number; ppm: number; col?: string }> = ({ x, y, ppm, col = "#4a7fb5" }) => {
  const L = 4.2 * ppm, H = 1.45 * ppm, w = 0.33 * ppm;
  return <g transform={`translate(${x - L / 2},${y})`}>
    <path d={`M0,${-w} L0,${-H * 0.55} Q${L * 0.05},${-H * 0.62} ${L * 0.2},${-H * 0.62} L${L * 0.32},${-H} L${L * 0.72},${-H} L${L * 0.85},${-H * 0.62} Q${L},${-H * 0.6} ${L},${-H * 0.4} L${L},${-w} Z`} fill={col} />
    <path d={`M${L * 0.35},${-H * 0.93} L${L * 0.5},${-H * 0.93} L${L * 0.5},${-H * 0.65} L${L * 0.27},${-H * 0.65} Z M${L * 0.54},${-H * 0.93} L${L * 0.7},${-H * 0.93} L${L * 0.8},${-H * 0.65} L${L * 0.54},${-H * 0.65} Z`} fill="#cfe6ef" />
    <circle cx={L * 0.2} cy={-w} r={w} fill="#2b3a42" /><circle cx={L * 0.8} cy={-w} r={w} fill="#2b3a42" />
  </g>;
};

/** Barres horizontales (échelle linéaire ou logarithmique annoncée) ; la barre `hi` en orange. */
export const BarsCard: React.FC<P> = ({ b, T }) => {
  const items: any[] = b.items || []; const log = !!b.log;
  const vmax = Math.max(...items.map((it) => it.value));
  const f = (v: number) => (log ? Math.log10(Math.max(1, v)) / Math.log10(vmax) : v / vmax);
  const rowH = Math.min(120, 560 / items.length);
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 40, display: "flex", justifyContent: "center" }}><Title text={b.title || ""} size={56} /></div>
      {log && <div style={{ position: "absolute", right: 70, top: 120, fontFamily: PF, fontSize: 24, color: "#8a7f68" }}>{b.logNote || "échelle logarithmique"}</div>}
      {items.map((it, i) => {
        const t = it._t ?? b.t0 + 0.4 + i * 0.4; const g = ease(T, t, 0.7); const y = 170 + i * rowH + (560 - items.length * rowH) / 2;
        if (T < t - 0.02) return null;
        return <div key={i} style={{ position: "absolute", left: 70, top: y, height: rowH - 18, width: CW - 140, display: "flex", alignItems: "center", gap: 18, opacity: cl((T - t) / 0.2) }}>
          <svg width={rowH - 24} height={rowH - 24} viewBox="-50 -50 100 100">{icon(it.icon)}</svg>
          <div style={{ width: 290, fontFamily: PF, fontWeight: 800, fontSize: 38, color: K.ink }}>{it.label}</div>
          <div style={{ height: (rowH - 18) * 0.62, width: Math.max(8, f(it.value) * 640 * g), background: it.hi ? K.orange : K.teal, borderRadius: 6 }} />
          <div style={{ fontFamily: PF, fontWeight: 800, fontSize: 38, color: it.hi ? K.orange : K.ink, opacity: cl((T - t - 0.5) / 0.3), whiteSpace: "nowrap" }}>{it.display ?? it.value.toLocaleString("fr-FR")}</div>
        </div>;
      })}
    </Card>
  );
};

/** Plan réel (vidéo ou photo libre) dans un cadre déchiré, crédit en petit (généré depuis credits). */
export const BrollCard: React.FC<P> = ({ b, T, root, assets }) => {
  const a = assets[b.asset] || {}; if (!a.file) return null;
  const inn = ease(T, b.t0, 0.4), out = ease(T, b.t1 - 0.3, 0.3); if (T < b.t0 - 0.01 || out >= 1) return null;
  const s = 1 + (T - b.t0) * 0.012; const w = 1380, h = 776;
  return (
    <div style={{ position: "absolute", left: 960 - w / 2, top: 500 - h / 2, width: w, height: h, transform: `translateY(${(1 - inn) * 800 - out * 1000}px) rotate(${b.rot ?? -1}deg)`, filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.4))" }}>
      <div style={{ position: "absolute", inset: 0, background: K.white }} />
      <div style={{ position: "absolute", left: 16, top: 16, right: 16, bottom: 46, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${s})` }}>
          {a.kind === "video" ? <OffthreadVideo src={staticFile(root ? `${root}/${a.file}` : a.file)} startFrom={Math.round((b.start ?? a.start ?? 0) * 30)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Img src={staticFile(root ? `${root}/${a.file}` : a.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      </div>
      <div style={{ position: "absolute", left: 18, bottom: 12, fontFamily: PF, fontWeight: 500, fontSize: 17, color: "#5b5b55" }}>{a.credit}</div>
    </div>
  );
};

/** Carte du monde (Natural Earth, domaine public) : pays surlignés, épingles. */
const proj = (lon: number, lat: number): [number, number] => [(lon + 180) * 10, (90 - lat) * 10];
const C: Record<string, any> = (WM as any).countries;
export const MapCard: React.FC<P> = ({ b, T, sb }) => {
  const lang = sb.meta.lang === "fr" ? "fr" : "en";
  const focus = typeof b.focus === "string" ? (C[b.focus]?.label ?? [1800, 900]) : proj(b.focus?.[0] ?? 0, b.focus?.[1] ?? 0);
  const z0 = b.zoom0 ?? 0.45, z1 = b.zoom ?? 2.2; const z = lerp(z0, z1, ease(T, b.t0 + 0.3, 1.4));
  const hi = new Set<string>(b.highlight || []);
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY} bg="#a9d3dd">
      <svg width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`translate(${CW / 2},${CH / 2}) scale(${z}) translate(${-focus[0]},${-focus[1]})`}>
          {Object.entries(C).map(([k, c]) => <path key={k} d={c.d} fill={hi.has(k) ? (T > b.t0 + 0.9 ? K.orange : "#e9d8a8") : "#e9d8a8"} stroke="#b9a578" strokeWidth={1.2 / z} />)}
          {(b.pins || []).map((p: any, i: number) => {
            const at = typeof p.where === "string" && C[p.where] ? C[p.where].label : proj(p.lonlat?.[0] ?? 0, p.lonlat?.[1] ?? 0);
            const k = popK(T, p._t ?? b.t0 + 1); if (k <= 0) return null;
            return <g key={i} transform={`translate(${at[0]},${at[1]}) scale(${1 / z})`}>
              <path d="M0,0 C-12,-18 -18,-26 -18,-36 A18,18 0 1 1 18,-36 C18,-26 12,-18 0,0 Z" fill={K.yellow} stroke={K.ink} strokeWidth={3} transform={`scale(${k})`} />
              <g transform={`translate(28,-44) scale(${k})`}><rect x={0} y={-30} width={(p.label?.length ?? 6) * 19 + 34} height={48} rx={6} fill={K.ink} /><text x={17} y={3} fontFamily={PF} fontWeight={800} fontSize={28} fill="#fff">{p.label}</text></g>
            </g>;
          })}
          {(b.names || []).filter((k: string) => C[k]).map((k: string) => T > b.t0 + 1.1 && <text key={k} x={C[k].label[0]} y={C[k].label[1] + 34 / z} textAnchor="middle" fontFamily={PF} fontWeight={800} fontSize={44 / z} fill={K.ink}>{C[k][lang]}</text>)}
        </g>
      </svg>
    </Card>
  );
};

/** Anatomie : l'espèce en grand, étiquettes reliées à des points NOMMÉS du gabarit (canine, œil, narine…). */
export const AnatomyCard: React.FC<P> = ({ b, T }) => {
  const sp = b.species || "hippo"; const q = SPECIES[sp];
  const gOpen = b.gape ? b.gape * ease(T, (b.gapeAt ? b._gape : b.t0) + 0.4, 0.9) : 0;
  const span = q.len + q.head.neck + q.head.len + 0.6, hTot = q.top + (b.gape ? q.head.len * 0.9 : 0.3);
  const ppm = Math.min(900 / span, 520 / hTot);
  const ox = CW / 2 - ((q.head.neck + q.head.len - 0.3) / 2) * ppm - 120, oy = 690;
  const labels: any[] = b.labels || [];
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      <svg width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0 }}>
        <QuadP q={sp} x={ox} y={oy} ppm={ppm} st={{ T, gape: gOpen }} />
        {labels.map((l, i) => {
          const pp = partPos(sp, l.part, ppm, { gape: gOpen }); if (!pp) return null;
          const k = ease(T, l._t ?? b.t0 + 0.5 + i * 0.4, 0.35); if (k <= 0) return null;
          const px = ox + pp[0], py = oy + pp[1];
          const lx = l.side === "left" ? 230 : l.side === "bottom" ? px : CW - 250, ly = l.side === "bottom" ? 740 : 120 + i * 110;
          return <g key={i} opacity={k}><circle cx={px} cy={py} r={9} fill={K.orange} stroke="#fff" strokeWidth={3} /><path d={`M${px},${py} L${lerp(px, lx, k)},${lerp(py, ly, k)}`} stroke={K.orange} strokeWidth={4} /></g>;
        })}
      </svg>
      {labels.map((l, i) => {
        const pp = partPos(sp, l.part, ppm, { gape: gOpen }); if (!pp) return null;
        const px = ox + pp[0];
        const lx = l.side === "left" ? 230 : l.side === "bottom" ? px : CW - 250, ly = l.side === "bottom" ? 740 : 120 + i * 110;
        return <Tag key={i} T={T} t0={(l._t ?? b.t0 + 0.5 + i * 0.4) + 0.3} t1={b.t1} x={lx} y={ly} text={l.text} sub={l.sub} kind={l.kind || "white"} size={30} />;
      })}
    </Card>
  );
};

export const QuizCard: React.FC<P> = ({ b, T }) => {
  const opts: string[] = b.options || []; const rev = b._reveal ?? Infinity;
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <Title text={b.question} size={50} />
        <div style={{ display: "flex", gap: 30 }}>
          {opts.map((o, i) => { const ok = T > rev && i === b.answer, bad = T > rev && i !== b.answer; const k = popK(T, b.t0 + 0.4 + i * 0.25);
            return <div key={i} style={{ transform: `scale(${k * (ok ? 1.08 : 1)})`, opacity: bad ? 0.4 : 1, width: 360, padding: "34px 20px", background: ok ? K.green : K.white, color: ok ? "#fff" : K.ink, fontFamily: PF, fontWeight: 800, fontSize: 36, textAlign: "center", borderRadius: 12, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>{o}</div>; })}
        </div>
      </div>
    </Card>
  );
};

export const TimelineCard: React.FC<P> = ({ b, T }) => {
  const evs: any[] = b.items || []; const x0 = 140, x1 = CW - 140, y = 430;
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      <svg width={CW} height={CH} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={x0} x2={lerp(x0, x1, ease(T, b.t0 + 0.2, 0.8))} y1={y} y2={y} stroke={K.ink} strokeWidth={6} strokeLinecap="round" />
        {evs.map((e, i) => { const x = lerp(x0 + 60, x1 - 60, evs.length > 1 ? i / (evs.length - 1) : 0.5); const k = popK(T, e._t ?? b.t0 + 0.5 + i * 0.5); if (k <= 0) return null;
          return <g key={i} transform={`translate(${x},${y}) scale(${k})`}><circle r={18} fill={K.orange} stroke="#fff" strokeWidth={4} /><text y={-44} textAnchor="middle" fontFamily={PF} fontWeight={800} fontSize={54} fill={K.ink}>{e.year}</text></g>; })}
      </svg>
      {evs.map((e, i) => { const x = lerp(x0 + 60, x1 - 60, evs.length > 1 ? i / (evs.length - 1) : 0.5); const t = e._t ?? b.t0 + 0.5 + i * 0.5;
        return T > t ? <div key={i} style={{ position: "absolute", left: x - 180, top: y + 50, width: 360, textAlign: "center", fontFamily: PF, fontWeight: 700, fontSize: 34, color: K.ink, opacity: cl((T - t - 0.15) / 0.25), lineHeight: 1.2 }}>{e.text}</div> : null; })}
    </Card>
  );
};

export const QuoteCard: React.FC<P> = ({ b, T }) => (
  <Card T={T} t0={b.t0} t1={b.t1} w={1300} h={560} y={480}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 60 }}>
      <div style={{ fontFamily: PF, fontWeight: 800, fontSize: 120, color: K.orange, lineHeight: 0.6 }}>“</div>
      <Title text={b.text} size={b.text.length > 70 ? 46 : 56} />
      {b.by && <div style={{ fontFamily: PF, fontWeight: 600, fontSize: 28, color: K.teal }}>{b.by}</div>}
    </div>
  </Card>
);

export const IconsCard: React.FC<P> = ({ b, T }) => {
  const items: any[] = b.items || []; const gap = Math.min(420, 1360 / Math.max(1, items.length));
  return (
    <Card T={T} t0={b.t0} t1={b.t1} w={CW} h={CH} y={CY}>
      {b.title && <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center" }}><Title text={b.title} size={58} /></div>}
      {items.map((it, i) => { const x = CW / 2 + (i - (items.length - 1) / 2) * gap; const t = it._t ?? b.t0 + 0.4 + i * 0.4;
        return <React.Fragment key={i}><Badge T={T} t0={t} t1={b.t1} x={x} y={b.title ? 400 : 360} r={120} icon={icon(it.icon)} no={it.no && T > t + 0.4} ok={it.ok} />{T > t + 0.15 && <div style={{ position: "absolute", left: x - gap / 2 + 10, width: gap - 20, top: (b.title ? 400 : 360) + 140, textAlign: "center", fontFamily: PF, fontWeight: 800, fontSize: 34, lineHeight: 1.15, color: it.no ? "#9a3b30" : K.ink, opacity: cl((T - t - 0.15) / 0.25) }}>{it.label}</div>}</React.Fragment>; })}
    </Card>
  );
};

export const OutroCard: React.FC<P> = ({ b, T }) => (
  <Card T={T} t0={b.t0} t1={b.t1 + 30} w={1300} h={520} y={500}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <svg width={140} height={120} viewBox="0 0 140 120"><path d="M10,10 L130,10 L130,80 L60,80 L30,110 L34,80 L10,80 Z" fill={K.orange} /><circle cx={45} cy={45} r={7} fill="#fff" /><circle cx={70} cy={45} r={7} fill="#fff" /><circle cx={95} cy={45} r={7} fill="#fff" /></svg>
      <Title text={b.text} size={54} />
    </div>
  </Card>
);

const END_L: Record<string, { like: string; sub: string; subbed: string }> = { fr: { like: "J'aime", sub: "S'abonner", subbed: "Abonné" }, en: { like: "Like", sub: "Subscribe", subbed: "Subscribed" }, es: { like: "Me gusta", sub: "Suscribirse", subbed: "Suscrito" }, de: { like: "Mag ich", sub: "Abonnieren", subbed: "Abonniert" }, pt: { like: "Gostei", sub: "Inscrever-se", subbed: "Inscrito" }, it: { like: "Mi piace", sub: "Iscriviti", subbed: "Iscritto" } };
/** Écran de fin : question en commentaire + J'aime / S'abonner cliqués, tenu jusqu'au bout de la vidéo. */
export const EndCard: React.FC<P> = ({ b, T, sb }) => (
  <>
    <Card T={T} t0={b.t0} t1={b.t1 + 60} w={1300} h={380} y={330}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <svg width={120} height={100} viewBox="0 0 140 120"><path d="M10,10 L130,10 L130,80 L60,80 L30,110 L34,80 L10,80 Z" fill={K.orange} /><circle cx={45} cy={45} r={7} fill="#fff" /><circle cx={70} cy={45} r={7} fill="#fff" /><circle cx={95} cy={45} r={7} fill="#fff" /></svg>
        <Title text={b.text} size={52} />
      </div>
    </Card>
    <div style={{ position: "absolute", inset: 0, transform: "translateY(250px)" }}><LikeSub T={T} t0={b.t0 + 1.2} tLike={b.t0 + 2.6} tSub={b.t0 + 4.0} labels={END_L[sb.meta.lang] || END_L.en} /></div>
  </>
);

export const CARDS: Record<string, React.FC<P>> = {
  title: TitleCard, toc: TocCard, chapter: ChapterCard, bignum: BigNumCard, compare: CompareCard, bars: BarsCard, broll: BrollCard, photo: BrollCard,
  map: MapCard, anatomy: AnatomyCard, quiz: QuizCard, timeline: TimelineCard, quote: QuoteCard, icons: IconsCard, outro: OutroCard, end: EndCard,
};
/** emplacements d'étiquettes : sous la carte (2) ou dans le monde (3). */
export const tagSlot = (onCard: boolean, s: number): [number, number] => onCard ? [960, [948, 1018, 1018][s] ?? 1018] : ([[960, 150], [960, 236], [960, 322]][s] ?? [960, 322]) as [number, number];
