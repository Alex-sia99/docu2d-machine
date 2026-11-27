// BANQUE DE PERSONNAGES 2D — fiches réutilisables d'une vidéo à l'autre.
// Une fiche = identité visuelle FIXE (taille réelle, peau, cheveux, tenue, accessoires). Les poses sont partagées (rig.ts).
// Règle : on n'invente pas un personnage dans une scène ; on l'ajoute ici, on rend sa planche (CastSheet), on la regarde.
// Planches : remotion/public-cast/sheets/<id>.png · index : agent-os/docs/CAST2D.md

export type Hair = "short" | "long" | "bun" | "side" | "crew" | "bald";
export type Top = { kind: "tshirt" | "tank" | "shirt" | "polo" | "swimsuit" | "rashguard" | "labcoat" | "lycra"; col: string; col2?: string; tie?: string };
export type Bottom = { kind: "shorts" | "trousers" | "swimsuit" | "lycra" | "skirt"; col: string };
export type Character = {
  id: string; label: string; role: string;
  /** taille réelle (m) */
  height: number;
  /** tête plus grosse chez l'enfant (1 adulte, 1.12 ado, 1.22 enfant 10 ans, 1.32 enfant 5 ans) */
  headK: number;
  skin: string; skin2: string; hair: Hair; hairCol: string;
  top: Top; bottom: Bottom; shoes?: string;
  glasses?: boolean; mask?: boolean; snorkel?: boolean; beard?: boolean;
  /** année / contexte (les scènes d'époque passent en sépia) */
  era?: string;
};

const SK = { light: ["#f1c6a3", "#d9a37f"], tan: ["#e2ad84", "#c48a63"], brown: ["#b97c55", "#9a6243"], dark: ["#8a5a3c", "#6f4630"] } as const;

export const CAST: Record<string, Character> = {
  vous: { id: "vous", label: "Vous", role: "le spectateur, nageur — personnage récurrent (« vous »)", height: 1.75, headK: 1, skin: SK.tan[0], skin2: SK.tan[1], hair: "short", hairCol: "#3a2a1f", top: { kind: "tshirt", col: "#e8643a" }, bottom: { kind: "shorts", col: "#26405e" } },
  vousMasque: { id: "vousMasque", label: "Vous (masque et tuba)", role: "le spectateur sous l'eau", height: 1.75, headK: 1, skin: SK.tan[0], skin2: SK.tan[1], hair: "short", hairCol: "#3a2a1f", top: { kind: "tshirt", col: "#e8643a" }, bottom: { kind: "shorts", col: "#26405e" }, mask: true, snorkel: true },
  rachael: { id: "rachael", label: "Rachael Shardlow, 10 ans", role: "piquée en 2009 dans la rivière Calliope, survit", height: 1.4, headK: 1.22, skin: SK.light[0], skin2: SK.light[1], hair: "long", hairCol: "#6b4128", top: { kind: "swimsuit", col: "#f2b33d" }, bottom: { kind: "swimsuit", col: "#f2b33d" } },
  sam: { id: "sam", label: "Sam, 13 ans", role: "frère de Rachael, la sort de l'eau", height: 1.58, headK: 1.12, skin: SK.light[0], skin2: SK.light[1], hair: "crew", hairCol: "#5a3a24", top: { kind: "tshirt", col: "#3d7bd6" }, bottom: { kind: "shorts", col: "#2b3a4a" } },
  pere: { id: "pere", label: "Le père de Rachael", role: "fait le massage cardiaque", height: 1.8, headK: 1, skin: SK.light[0], skin2: SK.light[1], hair: "short", hairCol: "#4a3424", top: { kind: "polo", col: "#2f6aa3" }, bottom: { kind: "shorts", col: "#3b4b3a" } },
  campeur: { id: "campeur", label: "Le campeur", role: "apporte le vinaigre", height: 1.78, headK: 1, skin: SK.tan[0], skin2: SK.tan[1], hair: "side", hairCol: "#2f2a26", top: { kind: "tshirt", col: "#5c9e6a" }, bottom: { kind: "shorts", col: "#7a6a4a" }, beard: true },
  campeuse: { id: "campeuse", label: "La campeuse", role: "apporte le vinaigre", height: 1.66, headK: 1, skin: SK.light[0], skin2: SK.light[1], hair: "bun", hairCol: "#8a5a2a", top: { kind: "tank", col: "#c45d8f" }, bottom: { kind: "shorts", col: "#2c4a6a" } },
  flecker: { id: "flecker", label: "Dr Hugo Flecker (1955)", role: "toxicologue et radiologue, nomme la Chironex et le syndrome d'Irukandji", height: 1.75, headK: 1, skin: SK.light[0], skin2: SK.light[1], hair: "bald", hairCol: "#b9b4aa", top: { kind: "shirt", col: "#ecebe4", tie: "#6b2f2f" }, bottom: { kind: "trousers", col: "#4a4a52" }, shoes: "#2a2420", glasses: true, era: "1955" },
  barnes: { id: "barnes", label: "Jack Barnes (1961)", role: "se fait piquer volontairement par une Irukandji", height: 1.78, headK: 1, skin: SK.tan[0], skin2: SK.tan[1], hair: "side", hairCol: "#3a3026", top: { kind: "shirt", col: "#e6dcc4" }, bottom: { kind: "shorts", col: "#6a6a5a" }, era: "1961" },
  barnesFils: { id: "barnesFils", label: "Le fils de Jack Barnes, 9 ans", role: "piqué avec son père en 1961", height: 1.33, headK: 1.24, skin: SK.tan[0], skin2: SK.tan[1], hair: "crew", hairCol: "#4a3a2a", top: { kind: "tshirt", col: "#d9c27a" }, bottom: { kind: "shorts", col: "#5a5a4a" }, era: "1961" },
  sauveteur: { id: "sauveteur", label: "Le sauveteur", role: "maître-nageur australien (rouge et jaune)", height: 1.82, headK: 1, skin: SK.brown[0], skin2: SK.brown[1], hair: "crew", hairCol: "#1f1a16", top: { kind: "rashguard", col: "#f2c230", col2: "#d8342c" }, bottom: { kind: "shorts", col: "#d8342c" } },
  baigneurLycra: { id: "baigneurLycra", label: "Baigneuse en combinaison", role: "combinaison intégrale anti-piqûres", height: 1.68, headK: 1, skin: SK.dark[0], skin2: SK.dark[1], hair: "bun", hairCol: "#1a1412", top: { kind: "lycra", col: "#2a4f7a", col2: "#41b3a3" }, bottom: { kind: "lycra", col: "#2a4f7a" } },
  chercheuse: { id: "chercheuse", label: "Chercheuse (Sydney, 2019)", role: "découverte d'une piste d'antidote", height: 1.65, headK: 1, skin: SK.light[0], skin2: SK.light[1], hair: "long", hairCol: "#2a1e18", top: { kind: "labcoat", col: "#f4f6f7", col2: "#4f86c6" }, bottom: { kind: "trousers", col: "#3b4a63" }, shoes: "#2a2a2a", glasses: true },
  // --- Docu2D « hippopotame » (2026-11-27)
  paul: { id: "paul", label: "Paul Templer, 27 ans (1996)", role: "guide de rivière sur le Zambèze, survit à l'attaque d'un hippopotame", height: 1.82, headK: 1, skin: SK.light[0], skin2: SK.light[1], hair: "short", hairCol: "#7a5a36", top: { kind: "shirt", col: "#b9a77a" }, bottom: { kind: "shorts", col: "#5d5a48" }, shoes: "#3b3026", era: "1996" },
  evans: { id: "evans", label: "Evans, apprenti guide (1996)", role: "apprenti de Paul Templer, mort noyé", height: 1.76, headK: 1, skin: SK.dark[0], skin2: SK.dark[1], hair: "crew", hairCol: "#15110e", top: { kind: "shirt", col: "#d9cfb4" }, bottom: { kind: "shorts", col: "#3e4a3a" }, shoes: "#2a221b", era: "1996" },
  pecheur: { id: "pecheur", label: "Pêcheur au bord du fleuve", role: "habitant des berges (Afrique subsaharienne)", height: 1.72, headK: 1, skin: SK.dark[0], skin2: SK.dark[1], hair: "crew", hairCol: "#15110e", top: { kind: "tshirt", col: "#3f7fb5" }, bottom: { kind: "trousers", col: "#6b5a40" }, shoes: "#2a221b" },
};

/** pixels par mètre du plan → échelle du rig (le rig mesure 269 unités de la tête à la semelle pour headK = 1) */
export const rigScale = (c: Character, ppm: number) => (c.height * ppm) / 269;
