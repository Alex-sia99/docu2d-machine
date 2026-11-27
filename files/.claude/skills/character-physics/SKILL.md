---
name: character-physics
description: "Physique du corps et des interactions pour les personnages 3D en code (Alex v6, Claude, agents) dans Remotion/Three.js : comment tenir un objet, s'asseoir, s'allonger sur un support qui épouse le corps, travailler sur un ordinateur, regarder, garder une pose neutre crédible — et le VÉRIFICATEUR automatique (anatomie, collisions, prises, appuis, « au travail ») à passer sur TOUTES les images avant tout rendu. À utiliser dès qu'un personnage tient, touche, porte, s'assoit, s'allonge, s'appuie, tape, ou interagit avec un objet ; avant d'envoyer une vidéo à Alex ; quand il signale « la physique / l'anatomie / les collisions ne sont pas respectées », « les bras n'importe comment », « il flotte », « il ne travaille pas »."
---

# Physique du personnage — règles, méthode, vérificateur

Alex ne doit plus avoir à corriger un bras dans le buste, une main dans une tasse, un corps qui flotte au-dessus d'un
hamac ou un Claude « à côté de l'ordinateur ». Ce skill donne la méthode et l'outil qui l'empêchent **avant** le rendu.

## Le principe

1. **L'interaction part de l'objet**, jamais de la main : on place l'objet (tasse, clavier, tissu), on calcule où vont les
   paumes / les bouts de bras / le dos pour le toucher, puis **l'objet suit la main résolue** (milieu des paumes après IK).
2. **Le support épouse le corps** (tissu, coussin, sable) : on pose le corps (recherche), puis on déforme le support sous
   sa silhouette avec LA MÊME fonction dans le rendu et dans le contrôle. Un maillage rigide sous un corps = « une planche ».
3. **Poses = fonctions pures** (un fichier `poses*.ts` sans React) lues par le rendu ET par le vérificateur.
4. **Le vérificateur passe sur toutes les images, sans rendu** (`npx tsx …`, quelques secondes). Rien ne se rend avant
   « OK — 0 violation ». Puis on regarde des **gros plans** de chaque interaction (pas seulement le plan large).

## Le vérificateur

`remotion/src/characters/physics/bodycheck.ts` — volumes MESURÉS sur alex6.glb (buste elliptique dont la largeur suit la
hauteur, tête, capsules bras/avant-bras/mains/cuisses/tibias, paume à 1,7 cm de l'os, main de 24,8 cm).

| Règle | Ce qu'elle attrape |
|---|---|
| `MAINS_TRAVERSEES` | les deux mains (ou main / autre avant-bras) qui s'interpénètrent |
| `MAINS_CROISEES` | mains croisées devant le corps sans que ce soit voulu (`allowCrossed`) |
| `DANS_LE_BUSTE` | main, avant-bras, bras dans le volume du buste |
| `DANS_LA_TETE` | main ou objet dans la tête |
| `ARTICULATION` | coude ou genou plié au-delà du possible (< 30° intérieur) |
| `PRISE` | objet tenu : paume trop loin (> 1,5 cm) ou dans l'objet ; doigts dans l'objet |
| `OBJET_DANS_CORPS` | un solide de la scène traverse un membre |
| `FLOTTE` / `ENFONCE` | point d'appui au-dessus / sous la surface qui doit le porter |
| `NE_TRAVAILLE_PAS` | qui « travaille » ne fait pas face à son outil, ou ses bras ne sont pas sur le clavier |

Tolérances **calibrées sur des poses validées par Alex** (repos bras tendus, gestes de parole du film v6) + 2 cm : près
de l'aisselle la peau suit le bras (un buste rigide y voit 5-8 cm « dedans » sans défaut visible) ; une main posée sur le
sweat l'enfonce de ~4 cm. Toute nouvelle tolérance se calibre de la même façon : une pose validée doit passer, la pose
refusée doit échouer (c'est le test de l'outil).

Exemple complet : `remotion/scripts/live6-check.ts` (écrans de live : tasse à deux mains, Claude qui tape, corps dans un
hamac). `remotion/scripts/surface-map.cjs` fabrique la carte de hauteurs d'un support (GLB) pour les contrôles d'appui.

## Règles de mise en scène du corps (apprises sur les retours d'Alex)

- **Repos** : bras TENDUS le long du corps (poignet à 0,31 m de l'axe, 0,775 m de haut), jamais coudes pliés mains devant.
- **Tenir à deux mains** (tasse) : paumes de part et d'autre de l'objet, doigts vers l'avant qui l'entourent, coudes bas
  et dehors ; jamais les poignets qui se croisent. Taille de l'objet à l'échelle des mains du personnage (main 25 cm →
  tasse ×1,7). Pas de contact bouche-tasse (les volumes du visage ne le garantissent pas) : on monte la tasse sous le menton.
- **Mains posées sur le ventre** : chacune de son côté, doigts vers le bas — des mains de 25 cm croisées se chevauchent.
- **Main sans doigts articulés** : jamais d'objet tenu dans une main ouverte ; tenu à deux mains ou posé.
- **S'allonger** (hamac, transat) : en DIAGONALE dans un hamac (comme en vrai), corps posé par recherche (inclinaison du
  tronc, bassin, flexion des hanches), tissu creusé sous la silhouette avec remontée sur les côtés ; caméra en légère
  plongée sinon le bord du tissu cache tout. La tête se relève pour regarder (jusqu'à 6 cm), elle ne rentre pas dans le tissu. **Les pieds aussi** : talons posés sur le tissu (il cède ≤ 13 cm, le genou plie pour le reste) — tout point d'extrémité (talon, orteils, cheville, coude, main) se contrôle, ne jamais en retirer un de la liste.
- **Travailler sur un ordinateur** : face à l'écran (±30°), bouts des bras SUR les touches (écart 0-3 cm), clavier entre
  les bras. Claude5 a `typing` (épaules avancées, bras allongés, frappes alternées) et `claudeArmTips()` (même chaîne de
  transformations que le rendu). Si l'écran est caché à la caméra, montrer le travail en hologramme au-dessus.
- **Regard** : un personnage de profil ne regarde pas « derrière lui » (on ne voit que l'arrière du crâne) ; il regarde
  devant lui, l'objet qu'il manipule quand il le bouge, et la caméra un court moment.
- **Boucles** : `period` sur Alex6 et Claude5 (oscillations arrondies à un nombre entier de cycles) ; raccord vérifié en
  PSNR dernière → première image.

## Décors

- **Jamais de fond photo / HDRI** derrière les personnages (refusé : « ça colle pas avec les graphismes »). Monde 3D
  construit, cohérent avec le personnage : la ville du film (`CityBackdrop`), mer en shader, ciel en dégradé, modèles
  Polyfork / Hunyuan / Poly Haven. Les textures PBR sont permises comme matériaux (bois, sable), pas comme décor.

## Avant d'envoyer

1. Vérificateur : `OK — 0 violation` sur toutes les images.
2. Gros plans de chaque interaction (mains + objet, corps + support, qui travaille) à plusieurs instants.
3. Planche 1 image/s de la vidéo finale + scan d'images noires.

Détail des erreurs déjà rencontrées et de leur correction : [references/erreurs.md](references/erreurs.md).
