// Docu2D — moteur de documentaire papier piloté par storyboard (machine « Docu Papier 2D »).
//   npx remotion bundle src/docu2d.tsx --public-dir public-d2 --out-dir build-d2
//   npx remotion render build-d2 Docu2D out.mp4 --props=<run>/props.json --muted
//   npx remotion still build-d2 BestiarySheet out.png --props='{"id":"hippo"}'
import "./index.css";
import React from "react";
import { Composition, registerRoot } from "remotion";
import { BestiarySheet } from "./Docu2D/Sheet";
import { Docu2D, docuMeta } from "./Docu2D/index";
import { CastSheet } from "./cast2d/Sheet";
import { Docu2DThumb } from "./Docu2D/Thumb";

const Root: React.FC = () => (
  <>
    <Composition id="Docu2D" component={Docu2D as any} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{} as any} calculateMetadata={docuMeta as any} />
    <Composition id="Docu2DThumb" component={Docu2DThumb as any} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{} as any} />
    <Composition id="BestiarySheet" component={BestiarySheet} durationInFrames={90} fps={30} width={1920} height={1080} defaultProps={{ id: "hippo" }} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ id: "vous" }} />
  </>
);
registerRoot(Root);
