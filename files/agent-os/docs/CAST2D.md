# Banque de personnages 2D (cast2d)

Style papier découpé (aplats sans contour, ombre douce). Planches : `remotion/public-cast/sheets/<id>.png`
(debout, bras levés, main tendue, profil, à genoux, allongé, nage, règle en mètres). Vue d'ensemble : `remotion/public-cast/cast-overview.jpg`.

| id | Personnage | Taille | Rôle |
|---|---|---|---|
| vous | Vous (nageur) | 1,75 m | le spectateur, personnage récurrent |
| vousMasque | Vous (masque et tuba) | 1,75 m | le spectateur sous l'eau |
| rachael | Rachael Shardlow, 10 ans | 1,40 m | piquée en 2009, rivière Calliope |
| sam | Sam, 13 ans | 1,58 m | son frère |
| pere | Le père de Rachael | 1,80 m | massage cardiaque |
| campeur / campeuse | Couple de campeurs | 1,78 / 1,66 m | apportent le vinaigre |
| flecker | Dr Hugo Flecker (1955) | 1,75 m | nomme la Chironex (1955) et le syndrome d'Irukandji (1952) |
| barnes | Jack Barnes (1961) | 1,78 m | se fait piquer volontairement |
| barnesFils | Son fils, 9 ans | 1,33 m | piqué avec lui |
| sauveteur | Sauveteur australien | 1,82 m | rouge et jaune |
| baigneurLycra | Baigneuse en combinaison | 1,68 m | protection anti-piqûres |
| chercheuse | Chercheuse (Sydney, 2019) | 1,65 m | piste d'antidote |

Animaux et objets (taille réelle, `things.tsx`) : méduse-boîte Chironex (cloche 0,16 m), Irukandji (0,02 m), crevette,
poisson, tortue (1 m), requin (3,5 m), souris, bouteille de vinaigre (0,30 m), bocal (0,25 m), pièce de 2 € (25,75 mm).

**Marche (27/11)** : `remotion/src/cast2d/walk.ts` — vraie marche de profil (voir le skill `cast2d`). Les barbes sont dessinées aussi de profil.
