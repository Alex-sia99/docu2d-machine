// Vérificateur Docu2D (OBLIGATOIRE avant rendu) : ancrages des beats, durées lisibles, encombrement des étiquettes,
// longueur des textes, physique du monde (pieds, sol, chevauchements, flottaison) image par image à 30 i/s,
// part de plans réels. Sortie : 0 anomalie ou la liste.  npx tsx scripts/d2-check.ts <props.json> [--json]
import fs from "fs";
import { resolve, worldAt, isCard } from "../src/Docu2D/timing";
import { sceneAt, checkScene } from "../src/Docu2D/world";

const file = process.argv[2]; const asJson = process.argv.includes("--json");
const P = JSON.parse(fs.readFileSync(file, "utf8"));
const { beats, issues } = resolve(P.sb, P.tl);
const all: { rule: string; msg: string }[] = [...issues];
// physique du monde
const seen = new Set<string>();
for (let f = 0; f < P.tl.total * 30; f++) {
  const T = f / 30; const { cur } = worldAt(beats, T);
  for (const i of checkScene(sceneAt(P.sb.meta.world, cur, T, P.sb.meta.hero), T, P.sb.meta.world, P.sb.meta.hero)) { const k = i.rule + i.msg.replace(/t=[\d.]+ /, "").replace(/[\d.]+ (px|m)/g, ""); /* une anomalie répétée ne compte qu'une fois */ if (!seen.has(k)) { seen.add(k); all.push(i); } }
}
// assets présents
for (const b of beats) if ((b.type === "broll" || b.type === "photo") && !P.assets?.[b.asset]) all.push({ rule: "asset", msg: `plan « ${b.asset} » absent des assets` });
// part de plans réels (temps d'écran des cartes broll/photo)
const full = beats.filter((b) => b.type === "broll" || b.type === "photo");
const real = full.filter((b) => !P.assets?.[b.asset]?.ai).reduce((a, b) => a + (b.t1 - b.t0), 0);
const aiT = full.filter((b) => P.assets?.[b.asset]?.ai).reduce((a, b) => a + (b.t1 - b.t0), 0);
const cardsT = beats.filter(isCard).reduce((a, b) => a + (b.t1 - b.t0), 0);
const out = { anomalies: all, realPct: +(100 * real / P.tl.total).toFixed(1), aiPct: +(100 * aiT / P.tl.total).toFixed(1), cardPct: +(100 * cardsT / P.tl.total).toFixed(1), beats: beats.length, total: P.tl.total };
if (asJson) console.log(JSON.stringify(out));
else {
  for (const i of all) console.log(`✗ [${i.rule}] ${i.msg}`);
  console.log(`plans réels : ${out.realPct} % · images IA : ${out.aiPct} % · cartes : ${out.cardPct} % · ${out.beats} beats · ${out.total.toFixed(1)} s`);
  console.log(all.length ? `✗ ${all.length} anomalie(s)` : "✓ storyboard + physique : 0 anomalie");
}
process.exit(all.length ? 1 : 0);
