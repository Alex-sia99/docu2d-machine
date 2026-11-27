# Dissection — Depth Theory, « Why You'd Never Want To Meet A False Killer Whale »

Vidéo : https://www.youtube.com/watch?v=-lgv8EKdzsk (17 min 01, 2026). Analysée le 2026-11-26 :
1 021 images (1/s) relues une par une sur 35 planches (`out-niche/fkw/sheets/`), détection de coupes FFmpeg,
transcription horodatée (`out-niche/fkw/transcript.txt`), profil sonore.

> Le classement automatique du Labo (Qwen) annonçait « 42 % de vidéo IA » : **c'est faux**. Ce sont des
> illustrations 2D vectorielles animées. Ne pas se fier au champ `kind` du Labo pour ce type de chaîne.

## 1. Chiffres

| Mesure | Valeur |
|---|---|
| Durée / mots | 1 021 s / 2 747 mots → **161 mots/min** |
| Coupes franches | 174 (médiane 3,7 s, p25 2,6 s, p75 6,5 s) |
| Changement visuel (texte, étiquette, élément) | toutes les **~2 s** même sans coupe |
| Part 2D (illustration + infographie) | **≈ 88 %** |
| Part réelle (vidéos Pexels + photos CC/NOAA/archives) | **≈ 12 %**, plans de 3 à 5 s, jamais plus |
| Vidéo IA | 0 % visible |
| Son | voix continue −14,7 LUFS, nappe musicale discrète sans silence, quelques bulles/whooshes |

## 2. Le langage visuel (ce qu'il faut reproduire)

**Un seul monde graphique**, réutilisé tout le film :
- **Fond « sous l'eau »** : dégradé bleu profond, rayons de lumière obliques animés, particules qui flottent, bulles. C'est la toile de fond de 60 % des plans.
- **Fond « infographie »** : bleu-vert très sombre, grille fine, crochets d'angle, particules. Pour chiffres, comparaisons, schémas, graphiques, lois.
- **Coupe surface/fond** : ciel + côte en haut, eau avec rayons en bas (bateaux, nageurs, plongeurs).
- **Décors 2D narratifs** : bureau d'anatomiste 1846, port de Kiel à l'aube, bassin de marineland, plage d'échouage. Chaque anecdote a SON décor, en style plat avec ombrage doux.
- **Cartes** : beige sur bleu, épingle + étiquette, trajet en pointillés jaunes qui se dessine, compteur d'heures.

**Personnages et animaux** : vecteur plat, contour fin sombre, ombrage doux, proportions crédibles. L'animal vedette est vu de face (bouche, dents) et de profil, toujours le même dessin. Le spectateur, c'est un plongeur vu de dos (arrière de la tête, masque) au premier plan : le « vous » du récit.

**Typographie** (Montserrat Bold, capitales espacées) :
- Titre blanc en haut au centre, ou dans un coin quand le sujet occupe le centre.
- Sous-titre petit, en capitales très espacées, sous le titre.
- Mot-choc en **jaune** (« FRIGHTENING », « BIG FISH. »), danger en **rouge-saumon** (« ALMOST 1 IN 3 », « UP, NOT DOWN »).
- **Étiquette** : pastille noire, texte blanc, reliée au sujet par un trait fin (« CAMERA », « MOTHER », « BROADBILL SWORDFISH, ~3 M »).
- **Tampon** : rectangle jaune ou rouge incliné (« EXTINCT? », « MYTH? », « NOT DOCUMENTED », « CLOSED »).
- Cercle pointillé pour montrer un détail (coude de la nageoire, blessures).
- Révélation du texte : écriture rapide de gauche à droite.
- Citation : guillemets, gros texte blanc centré, attribution minuscule dessous.

**Infographie récurrente** : rangées d'icônes (17/19 proies, 80 estomacs, 1 baleine sur 3 en couleur), barres avant/après, échelle de profondeur avec jauge, règle graduée sur une dent, arbre de parenté, frise d'âge, compteur, chronomètre, onde sonore, cadres photo blancs inclinés sur fond grille, cartes de loi avec icône.

**Mouvement** : caméra quasi fixe avec lent zoom ou travelling (parallaxe), animaux qui nagent, éléments qui entrent en glissant. Aucun effet tape-à-l'œil, les transitions sont des coupes franches (parfois un fondu au noir entre chapitres).

**B-roll réel** : générique et non littéral. Dauphins communs dans un banc pour « food is fought for », orques pour « killer whales do », falaises de Colombie-Britannique, côte de Basse-Californie, chalutier de nuit, vue aérienne de Kona. Crédit en tout petit en bas à gauche (« Footage: X / Pexels », « Photo: NOAA Fisheries », « CC BY-SA »). Les photos de l'espèce exacte viennent de NOAA/Wikimedia et sont souvent posées dans un **cadre photo** sur fond grille.

## 3. Le récit

1. **Accroche à la 2e personne (0:00-0:42)** : « Picture this. You're 30 m down… » Sensations, approche de l'animal, il s'arrête devant le masque. « Your move. »
2. **« That really happened »** : nom, date, lieu, citation du témoin.
3. **Le paradoxe** (« food is almost never given away ») puis **promesse** : la liste de tout ce qu'on saura à la fin, et le titre dit à voix haute avec le titre à l'écran.
4. **Chapitres courts** de 60-90 s, chacun ouvert par une question (« So, what was that? », « So, what does it hunt? », « So, why do they share? »).
5. **Anecdotes datées** (1846, 1861, 1965, 1985, 2003, 2021…) : chacune a un décor 2D, un lieu sur la carte et un détail concret.
6. **Nuance et honnêteté** : « nobody has ever documented », « nobody knows », « almost certainly ». Les mythes sont tamponnés « MYTH? ».
7. **Interaction** : « So, what would you actually do? » Trois choix A/B/C en vignettes, compte à rebours 3-2-1, « pick one before I tell you », réponse cochée, puis règles concrètes (distance, loi, amendes) en cartes à icônes.
8. **Retournement final** : on ne doit pas craindre l'animal, c'est lui qui a à craindre de nous. Phrase-écho de l'ouverture.
9. **Appel** : « Which animal next? » avec un champ de commentaire qui s'écrit tout seul, puis écran de fin.

## 4. Règles qu'on en tire pour nos vidéos

- **88 % de 2D maison, 12 % de réel.** Aucune vidéo IA n'est nécessaire.
- **B-roll générique** : « une méduse », « une plage tropicale », « un labo », pas forcément l'espèce exacte. Les photos de l'espèce : Wikimedia/NOAA avec crédit.
- **Un nouvel élément à l'écran toutes les ~2 s**, une coupe toutes les ~4 s.
- **Un décor 2D par anecdote**, une carte pour chaque lieu, une infographie pour chaque chiffre.
- **Textes courts** reprenant les mots de la voix, posés à des emplacements fixes (haut-centre, bas-centre, coins) ; **tout contenu dans un cadre est centré** dans son cadre.
- **Chaque chiffre dit est sourcé**, et la vidéo dit « on ne sait pas » quand c'est le cas.
- **Le « vous »** (plongeur de dos) revient d'un chapitre à l'autre et porte le choix interactif.
