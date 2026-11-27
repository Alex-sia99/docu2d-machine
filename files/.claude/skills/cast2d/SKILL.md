---
name: cast2d
description: Banque de personnages 2D réutilisables (style papier découpé) pour les vidéos Remotion de la niche animaux — fiches, poses, tailles réelles, rig IK et vérificateur physique. À utiliser dès qu'une vidéo 2D met en scène des humains, des animaux ou des objets.
---

# cast2d — banque de personnages 2D

Code : `remotion/src/cast2d/` · planches : `remotion/public-cast/sheets/<id>.png` · index : `agent-os/docs/CAST2D.md`.

## Principe
- **Une fiche par personnage** (`cast.ts`) : taille réelle (m), proportion de tête (enfant), peau, coiffure, tenue, accessoires, époque.
  On n'invente jamais un personnage dans une scène : on l'ajoute à `CAST`, on rend sa planche, on la REGARDE.
- **Tout en mètres** : chaque plan fixe un `ppm` (pixels par mètre) ; personnages (`PersonFront`, `PersonSide`), animaux et
  objets (`things.tsx`, `SIZES`) en dérivent leur taille → les rapports d'échelle sont justes par construction
  (bouteille de vinaigre 0,30 m, bocal 0,25 m, cloche de Chironex 0,16 m, Irukandji 0,02 m, pièce de 2 € 25,75 mm).
- **Rig** (`rig.ts`) : géométrie de face (`figGeom`) et de profil (`profGeom`), IK deux os pour les mains et les pieds
  (`pose.rh`, `pose.lf`, `pose.hand`…). Le dessin ET le vérificateur lisent la même géométrie.
- **Pieds au sol** : `PersonFront` reçoit `ground` (y du sol sous les pieds) ; jamais une position de bassin au jugé.

## Marche (refus d'Alex du 27/11 : « je refuse que mes personnes marchent comme ça »)
- Un personnage qui SE DÉPLACE est **de profil** avec le vrai cycle de `walk.ts` : `walkSide(c, ppm, x0, x1, u, ground)`
  (appui 60 % / balancier 40 %, pied d'appui FIXE, bassin qui monte au milieu de l'appui, bras opposés, buste penché 4°).
  La phase vient de la DISTANCE parcourue → une arrivée freinée ralentit les pas sans patiner. Trajet = nombre entier de
  cycles → départ et arrivée en double appui. Deux tronçons enchaînés : même longueur de cycle (sinon les pieds sautent).
- Dans une scène : `mover(id, c, ppm, ground, T, segs, front, side)` (`Jelly8/layouts.ts`) = profil pendant les segments,
  face à l'arrêt, demi-tour « carte qui pivote » (`turnK`, 0,14 s). `actorPts(a)` donne tête / taille / genou / pied
  quel que soit le côté (étiquettes, marques, tentacules).
- Main tenue en marchant : main proche `hand` (objet) / main du fond `hand2` (tenir quelqu'un derrière soi).
- **Jamais** de personnage de face qui glisse en travers de l'écran ; de face, un genou plié raccourcit la jambe dans
  l'axe (plus de genoux qui partent sur le côté → jambes croisées).
- Vérificateur : règles « marche » (de face interdite), « jambes » (croisées), « glisse » (pied d'appui qui bouge entre
  deux images, 30 i/s), pieds dessinés = cibles, pied d'appui au sol.

## Poses de base (voir les planches)
debout · bras levés · main tendue (IK) · profil · à genoux (massage cardiaque : buste penché, bras tendus, mains sur le
sternum) · allongé sur le dos · nage.

## Règles physiques (vérifiées par le script de la vidéo, ex. `npx tsx scripts/j8-physics.ts`)
pieds sur le sol/le fond · niveau d'eau conforme au texte (taille, poitrine…) · tête hors de l'eau · échelle réelle ·
objet tenu dans la main · objet posé sur son support · gestes logiques. Checklist complète :
`agent-os/docs/CHECKLIST-NICHE-ANIMAUX.md`.

## Ajouter un personnage
1. Fiche dans `cast.ts` (copier une fiche proche). 2. `npx remotion still build-j8 CastSheet public-cast/sheets/<id>.png --props='{"id":"<id>"}' --scale=0.6`.
3. Regarder la planche (taille sur la règle, identité lisible). 4. Ajouter la ligne dans `agent-os/docs/CAST2D.md`.
