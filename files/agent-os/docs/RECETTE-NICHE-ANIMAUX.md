# Recette — niche « Animaux Motion 3D » (prédateurs / créatures marines)

Étude du 2026-11-26 sur les 5 chaînes fournies par Alex (Depth Theory, Squidium, IntoTheBlue, IntoTheJungle,
BeyondTheWild) + vidéo test « Why You'd Never Want To Meet A Box Jellyfish » (3 min 12). Banque de niche :
`node scripts/niche-lab.js --niche "Animaux Motion 3D" --digest`.

## Mesures du labo (14 vidéos décortiquées image par image, 2026-11-26)

Durée médiane 17,4 min · plan médian **5 s** · **10,4 plans/min** · **164 mots/min** · habillage sur 73 % des plans.
Types de plans : stock vidéo 30 % · **vidéo IA 23 %** · graphiques 16 % · texte animé 14 % · autre 12 % · photo 3 %.
Caméra : surtout plans fixes animés (zoom/pan lents). Aucun avatar.
Verdicts récurrents : immersion « you » dès la 1re seconde, structure en entonnoir / descente progressive, chiffres
comme balises de progression (« le 1er chiffre… le 2e… »), études citées et montrées (PNAS, Nature), motion design
comme PREUVE (balances, comparaisons d'échelle), vidéo IA pour l'invisible (anatomie, abysses, combats).

## Ce qui marche chez les concurrents

| Chaîne | Abonnés | Meilleure vidéo | Style |
|---|---|---|---|
| Depth Theory | 37,6 k | 10 M — *Why You'd Never Want To Meet A Sperm Whale* (10 min) | animation 2D plate (plongeur « toi », créatures vectorielles, rayons), texte rouge souligné, peu de b-roll |
| Squidium | 7 k | 2,4 M — *Why Orcas are Terrified of the Humpback Whales* (20 min) | scènes IA cinématiques bleu-vert + infographies marine (étiquettes, cartes photo, articles surlignés, chiffres, barres orange, grilles de points, carte satellite dorée) + b-roll drone |
| IntoTheBlue | 1,2 k | *We Were Wrong About The Greenland Shark* | clone de la formule Squidium |
| BeyondTheWild | 1 k | 187 k — *Why Jaguars Are So Much More Dangerous Than Leopards* | même formule, animaux terrestres |
| IntoTheJungle | 194 | — | même formule, jungle |

**Formules de titre** : « Why You'd Never Want To Meet A ___ », « Why ___ Get Creepier The Deeper You Go »,
« Why ___ Are Terrified Of ___ », « ___ Looked Nothing Like We Thought », « The Only ___ That ___ ».

**Miniatures** : fond NOIR, une créature (gravure N&B très détaillée chez Depth Theory, photo-réaliste détourée chez
Squidium), souvent un plongeur minuscule + lampe + flèche rouge, 2-4 mots en Montserrat Black : blanc + 1 mot rouge,
points de suspension (« IT HEARS YOU.. », « WE CAN'T EXPLAIN », « RANKED BY KILLS »).

**Script** (Depth Theory, 168 mots/min) : accroche à la 2e personne (« Picture this. You're… »), le danger qu'on
ne voit pas venir → « on pense à X, mais… » → présentation (« So let's talk about why you'd never want to meet one »)
→ faits chiffrés avec comparaisons concrètes (bus, éléphants, ballon) et humour sec → la partie « vraiment
inquiétante » → « que ferais-tu ? » (options 1-2-3-4, toutes vaines sauf une) → retournement (« en fait ils ne nous
chassent pas ») → protection / état actuel → appel à commenter (« Which creature next? »).
Squidium : ouverture sur une anecdote datée et nommée (chercheur, lieu, année), étude scientifique citée et surlignée.

## Notre recette (vidéo test)

- **Voix** : ElevenLabs Chris (`iP95p4xoKVk53GoZ742B`), eleven_v4, anglais ; `agentic-tour-tts.js --dir <Dir>
  --vo <vo> --public public-bj --align` puis `vo-tighten.js` (silences internes ≤ 0,3 s, tempo 1,05, pauses × 0,75)
  → 547 mots = 3 min 12.
- **Images** : GPT Image 2.6 Flare (`kie-batch.js <lot.json> <dossier>`), 2K, `background: transparent` pour les
  cut-outs (créature, requin, croco), plans « caméra » (sous l'eau, plage), macros scientifiques (œil, cnidocyte,
  cellules), base de miniature gravure. ~0,04-0,06 $ l'image.
- **B-roll** : Pexels, repérage visuel `pexels-scout.js <dossier> "requête"…` (planches de vignettes) puis `--get id nom` ;
  jamais une autre espèce présentée comme le sujet (les méduses Pexels servent à « la plupart des méduses dérivent »).
- **Vidéo IA** : Grok Imagine image→vidéo 1080p 6 s (0,24 $) sur les images GPT Image 2.6 (`image_urls: [{dataUrl}]`
  via `kie-batch.js`) — 6 plans (accroche, harpon, venin, chasse, baigneuse, combinaison).
- **3D** : la créature en code (Three.js) pour les plans héros (révélation, forme, rideau de tentacules, yeux, nage,
  finale) — `remotion/src/BoxJelly/Jelly3D.tsx`.
- **Motion design** : `remotion/src/BoxJelly/ui.tsx` (fond marine quadrillé + neige, Kicker, RedLine, Tag, Callout,
  BigNumber, Waffle, Bar, PhotoCard, Cutout, Mark, FilmLook).
- **Musique** : `suno-gen.js` (dark ambient underwater documentary). **Effets** : ElevenLabs sound-generation
  (whoosh, impact, tick, heart, sting, bubbles) posés sur les mots (`sfx.json`). **Mix** : `bj-mix.js` (ducking,
  loudnorm −15 LUFS).
- **Rendu** : `npx remotion bundle src/boxjelly.tsx --public-dir public-bj --out-dir build-bj` puis
  `npx remotion render build-bj BoxJelly out/bj/box-jelly.mp4 --gl=angle --concurrency=4 --timeout=120000 --muted`.

## Pièges rencontrés

- Windows : `src/boxjelly.tsx` et le dossier `src/BoxJelly/` → `import "./BoxJelly"` résout le fichier racine
  (registerRoot appelé deux fois). Importer `./BoxJelly/index`.
- `public-as` pèse 766 Mo et est copié à chaque bundle → dossier public dédié par projet (`public-bj`), clips Pexels
  recadrés à 14 s / CRF 23.
- Méduse en nage : basculer la cloche par un ROULIS (cloche devant), pas par une inclinaison vers la caméra.
- Vérifier chaque mot-repère du montage contre la timeline (script de contrôle) avant de rendre.
- **Vidéo livrée SANS VOIX (2026-11-26)** : `vo-tighten.js` appliquait `afade=t=out:st=0` → répliques muettes
  (−91 dB), et la relecture ne contrôlait que l'image + le volume global (la musique masquait l'absence de voix).
  Corrigé ; `bj-mix.js` refuse désormais une réplique muette et finit par un **contrôle d'écoute** (transcription
  faster-whisper de 20 s de la vidéo finale, échec si aucune parole). Ne jamais livrer sans ce contrôle.
- `sidechaincompress` s'arrête à la fin de la clé (la voix) → la sortie était coupée de 4 s : `apad=whole_dur` sur la voix.
- Repères de mots en français : normaliser les accents (NFD) avant la comparaison (sinon « méduse » → « mduse ») —
  voir `remotion/src/BoxJellyFR/tl.ts`.

## Version française (2026-11-26, demande d'Alex)

- Voix : **voix clonée d'Alex** (`"voice": "alex"` dans script.json → `Voix_Alex` du .env), vouvoiement, eleven_v4 fr ;
  603 mots → 3 min 01 après `vo-tighten` (mêmes réglages).
- Code : `remotion/src/BoxJellyFR/` (script, timeline, tl.ts accents, index.tsx = montage EN traduit et recalé sur les
  mots FR, `make-sfx.js` = effets posés sur les mots FR), entrée `src/boxjellyfr.tsx`, bundle `build-bjfr`
  (`--public-dir public-bj`, mêmes assets), compositions `BoxJellyFR` et `BJThumbFR` (« 24 YEUX.. »).
- **Vraies photos** : Wikimedia Commons (API `generator=search` sur l'espèce) — Chironex en aquarium (Guido Gautsch,
  CC BY-SA 2.0), poste de vinaigre / panneau « Stingers » (Genet, CC BY-SA 4.0) ; crédit affiché sous la carte
  (composant `RealPhoto`) + à remettre dans la description YouTube.
- **Pixabay** : `lib/pixabay.js` (clé `PIXABAY` du .env), intégré à `pexels-scout.js` (`--src pixabay|pexels|both`,
  `--images` pour les photos, ids « pb… »/« pbi… »). Pas de vraie méduse-boîte non plus → méduses génériques
  (« la plupart dérivent »).
- **Méduse 3D revue** d'après la photo et le spécimen de musée : pédalies = bras charnus en « main » sous chaque coin,
  à moitié noyés dans la paroi (plus de joint) ; tentacules qui NAISSENT dans la paume (doigt épais → filament) et
  suivent la pulsation de la cloche (uniform `uPulse`) ; faisceaux presque parallèles et blanchâtres ; gonades en X,
  manubrium à 4 lèvres, vélarium ; cloche 12 % plus haute que large.

## Comparaison vidéo test ↔ concurrents (v3, 2026-11-26)

| Critère | Concurrents (mesuré) | Notre v3 | Verdict |
|---|---|---|---|
| Titre / accroche / structure | « Why You'd Never Want… », « Picture this », options vaines, retournement, CTA | identique | **pareil** |
| Rythme | 10,4 plans/min, 164 mots/min | ~12 plans/min, ~175 mots/min | **pareil, un peu plus nerveux** |
| Grammaire visuelle | fond marine, étiquettes, cartes, chiffres, barres, carte dorée, texte rouge souligné | même kit (ui.tsx) | **pareil** |
| La créature | 2D plate (Depth Theory) ou image/vidéo IA (Squidium) | **méduse 3D en code**, anatomie juste (4 × 15 tentacules, 24 yeux), réutilisable sous tous les angles + cut-outs et vidéos IA | **mieux** |
| Preuves | chiffres et études citées | chaque chiffre a son visuel, étude Lau et al. 2019 citée, limites dites (« lab + mice only ») | **mieux** |
| Son | voix + musique, peu d'effets | voix + musique en ducking + 30 effets calés sur les mots, −14 LUFS | **mieux** |
| Part de vidéo IA | 23 % | ~15 % (6 clips) | **en dessous** |
| Images réelles de l'espèce | Squidium montre de vraies photos créditées | aucune (Pexels n'a pas l'espèce) | **en dessous** → Wikimedia Commons avec crédits |
| Durée | médiane 17 min | 3 min (test demandé) | à allonger pour la monétisation |
| Coût | — | ≈ 2,3 $ (12 + 2 images, 6 clips IA, musique) + 3 k caractères ElevenLabs | — |

**Apport de valeur** : la créature 3D en code (un actif réutilisable d'une vidéo à l'autre et que les autres n'ont pas),
la rigueur (faits vérifiés, limites dites) et le sound design. **À combler pour la machine** : vraies images de
l'espèce (Wikimedia, crédits), plus de vidéo IA, format 10-20 min (chapitres = « descente progressive »).

## Synchro textes / voix (retour d'Alex, 2026-11-26)

- Mesure : la voix colle à la timeline (faster-whisper `small` avec horodatage des mots : écart médian 0,09 s). Les
  décalages venaient du montage : machine à écrire du `Kicker` à 0,035 s/lettre (1,5 s pour une phrase), textes posés
  sur le DERNIER mot d'une phrase juste avant la coupe (visibles 0,1-0,5 s), textes sans rapport exact avec la phrase.
- Règles : un texte s'écrit en ≤ 0,3 s (Kicker) ; il apparaît sur le PREMIER mot de la phrase qu'il résume, avec les
  mots de la phrase ; il reste ≥ 1,5 s avant la coupe, sinon on déplace la coupe (pas le texte).
- Outro : le champ « Ajouter un commentaire… » propose une créature après l'autre (`BoxJellyFR/outro.json` :
  queue de 11 s, écriture/pause/effacement) ; `bj-mix.js` lit `outro.json` (tail) et enchaîne la musique sur
  elle-même en fondu de 4 s (plus de raccord sec quand la vidéo dépasse le morceau).

## Devis format concurrent (~17 min), réglages « éco » (2026-11-26)

Prix relevés dans le catalogue Kie (1 crédit = 0,005 $). La vidéo test utilisait des réglages premium non demandés
(images 2K, vidéos 1080p).

| Poste | Premium (vidéo test) | Éco proposé |
|---|---|---|
| Image | GPT Image 2.6 Flare 2K high ≈ 0,04-0,06 $ | **GPT Image 2.6 Economy 1K 0,025 $** (fond transparent OK) — alt. nano-banana-2-lite 0,02 $, z-image 0,004 $ |
| Vidéo IA 6 s | Grok Imagine i2v 1080p 0,24 $ | **Grok Imagine i2v 720p 0,135 $** (4,5 crédits/s) — alt. Seedance 2 mini 720p ≈ 0,15 $ |
| Musique | Suno V5.5 ≈ 0,06 $ / génération (2 titres) | idem |

Vidéo test (3 min) refaite en éco : 6 clips × 0,135 + 14 images × 0,025 + musique ≈ **1,22 $** (au lieu de 2,10 $).

17 min (format médian concurrent, ~177 plans à 10,4 plans/min, 23 % de plans vidéo IA) :

| Poste | Quantité | Coût éco |
|---|---|---|
| Vidéos IA 720p 6 s | 35-45 clips | 4,70-6,10 $ |
| Images IA 1K (sources des clips + détourages + macros) | ~80 | 2,00 $ |
| Musique Suno | 3 générations (6 titres) | 0,18 $ |
| Étude / analyse (OpenRouter) | ponctuelle | ≈ 0,10 $ |
| B-roll Pexels/Pixabay, photos Wikimedia, 3D en code, rendu Remotion | — | 0 $ |
| **Total cash** | | **≈ 7-8,50 $** (≈ 12-14 $ aux réglages premium) |
| Voix ElevenLabs (voix d'Alex) | ≈ 19 000 caractères | dans l'abonnement : le Starter (40 k/mois) ne couvre que **2 vidéos de 17 min par mois** |

## Version 2D « façon Depth Theory » (Jelly2D, 2026-11-26)

Demande d'Alex : 5 min, **aucune vidéo IA**, b-roll réel générique (Pexels/Pixabay/Wikimedia), tout le reste en 2D,
inspiré à fond de Depth Theory (dissection : [DISSECTION-DEPTH-THEORY.md](DISSECTION-DEPTH-THEORY.md)).
Code : `remotion/src/Jelly2D/` (art.tsx = monde 2D : fonds océan/grille/coupe/carte, méduse-boîte 3/4, personnages,
accessoires ; ui.tsx = textes/étiquettes/tampons/cartes CENTRÉES ; index.tsx = 60 plans calés sur les mots),
entrée `src/jelly2d.tsx`, assets `public-bj/jelly2d/`. Plans : `npx tsx scripts/j2d-shots.ts` ; effets : `npx tsx scripts/j2d-sfx.ts`.
Voix : `agentic-tour-tts.js --dir Jelly2D --vo jelly2d --public public-bj --align` puis `vo-tighten.js … --tempo 1.0 --max 0.3 --pause 0.95` (≈ 175 mots/min, proche du concurrent).

### Registre des faits (chaque chiffre à l'écran en vient)

| Affirmation | Source |
|---|---|
| ≥ 64 morts en Australie depuis 1883 ; tentacules jusqu'à 3 m, millions de cnidocytes ; mort en 2 à 5 min ; « assez de venin pour 60 adultes » (formulé « on dit ») | Wikipédia EN *Chironex fleckeri* |
| Cardwell, 20 janv. 1955, garçon de 5 ans ; Hugo Flecker trouve 3 sortes de méduses ; Southcott (Adélaïde) publie le 29 déc. 1955 ; Chiron + nex = « main de la mort » | idem (section Taxonomie) |
| Cloche ≈ 16 cm, jusqu'à 35 cm ; 15 tentacules par coin ; 15 cm contractés / 3 m en chasse ; quasi transparente bleu pâle ; chasse le jour, repos au fond la nuit | idem |
| 24 yeux en 4 grappes, certains forment des images, objets noirs = fuite, traitement sans cerveau inconnu | idem |
| Potassium qui fuit (hyperkaliémie) → arrêt cardiaque ; ≈ 3 m de tentacule = dose mortelle ; enfants les plus touchés | idem |
| 225 piqûres Top End 1991-2004 : 8 % hospitalisés, 1 décès (enfant de 3 ans) | idem |
| Vinaigre (acide acétique 4-6 %) désactive les cnidocytes non tirés ; bandage compressif abandonné (fait tirer) | idem |
| Rachael Shardlow, 10 ans, rivière Calliope (Gladstone), fin 2009 : frère Sam 13 ans, couple de campeurs + vinaigre, RCP par le père, 2 jours de coma, 1 mois d'hôpital | RNZ 24/12/2009, NZ Herald, Fox News (avril 2010) |
| Saison novembre-mai, filets anti-méduses, combinaison lycra, vinaigre | qld.gov.au (Dangerous marine life) |
| Antidote 2019 (Univ. de Sydney, Lau et al., *Nature Communications*) : médicament anti-cholestérol existant (2-hydroxypropyl-β-cyclodextrine), souris, jusqu'à 15 min après ; pas encore prouvé chez l'humain | sydney.edu.au 01/05/2019 |
| Tortues de mer parmi les rares prédateurs, peau épaisse | Wikipédia EN |

**Retiré** : la vitesse « 1,5 m/s » de la v2 n'a aucune source solide (0,1 à 2 m/s selon les sites) → plus jamais affichée.

## Version 8 min « plan-séquence papier » (Jelly8, 2026-11-26)

Demande d'Alex : étudier Oceanverse ([DISSECTION-OCEANVERSE.md](DISSECTION-OCEANVERSE.md)), revoir tous ses refus
([CHECKLIST-NICHE-ANIMAUX.md](CHECKLIST-NICHE-ANIMAUX.md)), monter une **banque de personnages** réutilisables et refaire
la vidéo en entier en visant 8 min. Code : `remotion/src/Jelly8/` (entrée `src/jelly8.tsx`, bundle `build-j8`, `--public-dir public-bj`).

- **Un seul océan, une caméra qui voyage** (Oceanverse : 1 coupe en 27 min). `world.tsx` : sol `G(x)` (plage en pente douce
  jusqu'à x = 900, tombant, grand bleu), stations caméra `camAt` (ease cubique), voile sombre quand une carte papier s'ouvre.
  Les scènes humaines (rivière, plage, bureau 1955, plage 1961) sont des **dioramas** avec leur propre sol et leur échelle (px/m).
- **Personnages = banque `cast2d`** (`remotion/src/cast2d/`, fiches `public-cast/sheets/`, index [CAST2D.md](CAST2D.md), skill `cast2d`) :
  tailles réelles en mètres, rig face + profil, IK des mains et des pieds. On ne dessine plus de personnage ad hoc dans un film.
- **Physique vérifiée avant tout rendu** : `npx tsx scripts/j8-physics.ts` échantillonne chaque scène à 10 i/s (pieds au sol,
  niveau d'eau, tête hors de l'eau, échelle, objets tenus ou posés, RCP à genoux bras tendus, personne debout sur une personne allongée).
  Il a trouvé 31 vraies anomalies sur la première version, toutes corrigées → **0 anomalie obligatoire**.
- Langage papier : étiquettes déchirées minuscules en Poppins, badges barrés, pop 0 → 1,15 → 1 en 0,3 s, cadres photo déchirés pour le b-roll,
  sommaire 5 cartes qui revient à chaque chapitre, CTA au milieu + « dans la suite », personnage « vous » récurrent.
- Voix : 49 répliques, 1 363 mots, voix clonée d'Alex (`agentic-tour-tts.js --dir Jelly8 --vo jelly8 --public public-bj --align`
  puis `vo-tighten.js --tempo 1.0 --max 0.32 --pause 1.35`). Musique `jelly8/music/bed-long.mp3` (fondue enchaînée sur elle-même),
  effets `npx tsx scripts/j8-sfx.ts`, mix `bj-mix.js … --dir Jelly8 --music jelly8/music/bed-long.mp3 --mvol 0.16`.
- Repères de mots : `w(id, "=mot")` pour un mot exact (sinon « A » attrape « Alors »), `nth` pour la 2e occurrence.

Faits ajoutés (en plus du registre Jelly2D) :

| Affirmation | Source |
|---|---|
| Irukandji (*Carukia barnesi*) ≈ 2 cm de cloche ; symptômes 5 min à 2 h après (≈ 30 min en moyenne) ; Flecker nomme le syndrome en 1952 ; Jack Barnes, Cairns 1961, se pique volontairement avec son fils de 9 ans et un sauveteur ; 2 décès probables (formulé « en seraient mortes ») | Wikipédia EN *Irukandji jellyfish*, *Irukandji syndrome* |
| Cousine méditerranéenne *Carybdea marsupialis* | Wikipédia EN *Carybdea marsupialis* |
| Œil du haut qui regarde à travers la surface la canopée des mangroves (*Tripedalia cystophora*, Caraïbes) ; statolithe | Garm & Nilsson 2011, résumé Wikipédia EN *Box jellyfish* |
| Plus de 170 protéines dans le venin | Wikipédia EN *Chironex fleckeri* |
| ADN environnemental pour repérer les méduses dans un échantillon d'eau | études eDNA de l'université James Cook — **à recouper avant toute réutilisation** |

**Livraison (2026-11-26)** : 7 min 51, b-roll réel 12,1 % de l'écran (mesuré par `npx tsx scripts/j8-broll.ts`, 8,6 % avant ajout
de 6 plans génériques), 0 anomalie physique, 0 image noire, −13,2 LUFS, voix contrôlée par transcription au début, sur la réplique corrigée
l20, à la fin. Fichiers : `agent-os/output/niche-animaux/meduse-boite-8min-1080p.mp4` et `-telegram.mp4` (720p, 18 Mo), Telegram message 612.

**v8.1 (2026-11-27), retours d'Alex** : (1) « les déplacements sont pas bons, ils croisent les jambes » → la banque a une
vraie **marche de profil** (`remotion/src/cast2d/walk.ts` : cycle appui 60 % / balancier 40 %, phase tirée de la DISTANCE
→ aucun patinage, trajet en nombre entier de cycles, demi-tour papier de 0,14 s ; `mover()` dans `Jelly8/layouts.ts`) ;
de face, un genou plié raccourcit la jambe dans l'axe au lieu de partir sur le côté. Vérificateur : marche de face
interdite, jambes croisées, glisse du pied d'appui (30 i/s, 614 images de marche) → 0 anomalie. (2) Schéma du syndrome
d'Irukandji refait : silhouettes de face ET de dos, douleurs posées sur la poitrine / le dos avec trait de rappel,
symptômes en colonne alignée avec icônes. (3) **Pas de fair use** : sources libres ajoutées au repérage
(`lib/opensources.js` : Commons, NASA, Internet Archive, YouTube CC, Openverse ; `--src libre`, `--credits`) → première
trouvaille : une **vraie Irukandji** (*Carukia barnesi*) filmée par Courtney, Sachlikidis, Jones & Seymour (PLOS ONE 2015,
CC BY 4.0, image éclaircie) sur « sa piqûre ressemble à une piqûre de moustique ». B-roll réel 13,1 %.
Feuille de route de la future machine : [FEUILLE-DE-ROUTE-MACHINE-DOCU2D.md](FEUILLE-DE-ROUTE-MACHINE-DOCU2D.md).
**Livraison v8.1 (2026-11-27)** : 7 min 51, 0 anomalie physique (614 images de marche contrôlées), b-roll réel 13,1 %, 0 image noire,
−13,2 LUFS, voix contrôlée par transcription au début, à 4:52 (plan Irukandji) et à la fin. Fichiers :
`agent-os/output/niche-animaux/meduse-boite-8min-v8.1-1080p.mp4` et `-telegram.mp4` (720p, 19,7 Mo), Telegram message 613.
Description YouTube prête (chapitres, sources des faits, **sources des images**) : `out-niche/j8-description.txt`.

## v8.2 + première vidéo terrestre (27/11/2026)
Retours d'Alex sur la v8.1 : (1) **coupures nettes de la voix** (flagrant à 1:38) — les fichiers ElevenLabs finissent
souvent par un bruit parasite ~0,35 s après la phrase, tronqué par la fin du fichier ; `vo-tighten.js` coupe désormais au
début de la vraie pause finale (≥ 0,13 s, jamais l'occlusion d'un « p ») + fondus ; les départs des répliques sont
gardés identiques (seules les fins changent) ; 49 fins de phrase retranscrites. (2) **Texte qui reste après la photo** —
`vis()` fait sortir étiquettes/badges PENDANT que la carte glisse. (3) **Massage cardiaque équivoque** (sauveteur à cheval
sur l'enfant) — sauveteur agenouillé DERRIÈRE la victime, vu de face, bras tendus, bassin caché par son corps ; règle
`kneelBehind` + contrôle « au niveau de la poitrine, jamais du bassin ». Livré : Telegram 616 (`meduse-boite-8min-v8.2-*`).

**Hippopotame (9 min 56)** — premier film du moteur générique Docu2D (storyboard ancré sur les mots) : histoire vraie de
Paul Templer (Zambèze, 1996) en accroche, 5 questions, chiffre « 500 morts/an » présenté honnêtement (estimation
d'encyclopédie, fourchette 500-3 000, pas de données médicales), plans réels libres 11 %, voix clonée d'Alex (débit
204 mots/min de parole). Fichiers : `agent-os/output/machines/d2-hippo/` (script, storyboard, timeline, final.mp4),
description `out-niche/hippo-description.txt`.
