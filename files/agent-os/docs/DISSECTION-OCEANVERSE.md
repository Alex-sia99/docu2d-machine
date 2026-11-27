# Dissection — Oceanverse : Couches des Abysses (chaîne FR)

Chaîne : https://www.youtube.com/channel/UC-8nCGsfVE8vAXo9fbKB5DA — lancée début octobre 2026, 9 vidéos de 22 à 28 min,
mélange FR / EN. Analyse du 2026-11-26 (`out-niche/ch2/`).

| Vidéo | Vues (26/11) |
|---|---|
| Pourquoi le Prédateur le Plus Mortel de L'océan Refuse de Nous Tuer (orques, 27:49) | **814 530** (11 005 likes) |
| J'ai Lâché Des Orques Dans 11 Océans Préhistoriques (22:15) | 246 811 |
| Pourquoi Le Calmar Colossal N'a Jamais Attaqué Personne | 41 783 |
| Pourquoi Les Cachalots Terrifient Tout L'Océan | 38 014 |
| (suivantes) | 13 000 – 30 000 |

Méthode : 1 image / 2 s sur les 5 premières minutes, 1 / 4 s ensuite, 4 passages à **10 i/s** pour le mouvement,
vue d'ensemble des 2 autres formats, transcriptions FR (163 et 160 mots/min).

## 1. Le constat qui change tout : AUCUNE coupe

La détection de coupes (seuil 0,22) trouve **1 coupe en 27 min**. Toute la vidéo est **un plan-séquence dans un seul
océan** : la caméra plonge de la surface au fond, glisse latéralement, recule ; les éléments entrent et sortent du cadre.
Transitions observées à 10 i/s :
- **Plongée de caméra** : le ciel sort par le haut en ~0,6 s (accélération puis freinage), le sujet apparaît en fondu
  depuis l'obscurité de la profondeur (0,8 → 1,5 s).
- **Décor-carte** : une scène entière (plage, diorama) est une feuille qui rétrécit / glisse pour révéler l'océan derrière (~0,3 s).
- **Cartes papier** (photo, carte géographique, schéma) qui entrent en glissant avec une légère rotation, puis ressortent.

## 2. Le langage graphique : papier découpé

- Océan **bleu-vert** (#1f6e86 → #0e3f57), rayons doux, grain papier sur tout l'écran, vignette légère.
- Surface vue en coupe : ciel **beige chaud** (#f2dfb6) avec soleil en cercles concentriques, vagues en couches de papier.
- Décors : fond rocheux, forêts d'algues, plage en aplat sable, banquise ; tout en aplats sans contour, ombre portée douce.
- **Le « vous »** : un tout petit personnage (t-shirt orange, short bleu marine), toujours le même, qui flotte et bat des bras.
  Les animaux sont simples, en aplats sans contour, nets.
- **Étiquettes** : papier blanc déchiré, texte noir **en minuscules** (Poppins gras) ; questions-chocs sur papier
  **orange-rouge** (« Et si elles décidaient de nous chasser ? », « on est cuit ») ; mots-clés sur papier **jaune** ou **vert**.
- **Badges ronds** papier avec icône ; un trait rouge les barre (« pas de carapace », « pas de vitesse »).
- **Photos réelles** dans des cadres blancs à bords déchirés, crédit minuscule (NOAA, etc.), qui entrent et ressortent vite.
- **Sommaire** : 5 cartes numérotées (icônes) posées en ligne ; elles reviennent à chaque chapitre avec la carte en cours
  agrandie et le titre « Raison 2 · Ce qu'elles apprennent de leurs mères ».
- Infographies dans le même papier : barres de vitesse (humain 10 km/h, orque 56, voiture en ville 48), balance
  (orque = éléphant), frise chronologique en ruban de papier, jauge, thermomètre, rayon de supermarché d'humains emballés.

## 3. Le mouvement (mesuré à 10 i/s)

- **Pop** : échelle 0 → 1,15 → 1 en ~0,3 s ; puis le trait rouge se dessine en ~0,3 s.
- Les animaux **traversent** le cadre en continu ; rien n'est jamais figé (dérive, battements, bulles).
- Les textes ne s'écrivent pas lettre à lettre : l'étiquette entière **apparaît** (pop / glisse).
- Caméra jamais immobile : légère dérive permanente.

## 4. Le récit (vidéo à 814 k)

1. **Accroche à la 2e personne** : « Vous venez de tomber en pleine mer. Pas de carapace, pas de vitesse… »
2. **Paradoxe** (« le prédateur le plus mortel… sauf nous ») et **promesse chiffrée** : « 4 raisons, plus une 5e
   hypothèse, la plus dérangeante » → sommaire en 5 cartes.
3. **Humour + comparaisons du quotidien** : « un nugget de poulet aveugle, sourd et très lent », « un passage au
   supermarché », plus rapide « qu'une voiture en ville », pèse « un éléphant », « de Paris à Reims ».
4. **Appel au milieu** (4:18) : « Dans la suite… » (3 badges teaser) puis boutons **J'aime / S'abonner** cliqués par un
   curseur (« Abonné ✓ »), formulé comme un service : « un like emmène cette question vers plus de monde ».
5. Chapitres « Raison N », chacun ouvert par une question, appuyés sur des anecdotes datées et localisées.
6. Fin émotionnelle + écran de fin « série / épisode suivant ».

## 5. Ce qu'on reprend pour nos vidéos

- **Plan-séquence** : un monde unique, une caméra qui voyage ; les schémas et photos arrivent en cartes papier.
- **Papier** : grain, étiquettes déchirées en minuscules, badges barrés, cadres photo déchirés.
- **Sommaire 5 cartes** + rappel à chaque chapitre.
- **Appel au milieu** avec teaser « Dans la suite ».
- **Comparaisons du quotidien** et une pointe d'humour.
- **Un « vous » unique et constant**, issu de la banque de personnages (`remotion/src/cast2d/`).
- Durée cible plus longue (leurs 22-28 min ; Alex vise 8 min pour la prochaine version).
