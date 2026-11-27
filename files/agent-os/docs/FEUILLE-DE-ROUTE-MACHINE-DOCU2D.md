# Feuille de route — machine « Docu Papier 2D » (animaux, puis tout sujet explicatif)

> Rédigée le 27/11/2026 après Jelly8 (méduse-boîte, 7 min 51, Telegram 612) et la v8.1 (marche réelle + schéma du
> syndrome refait + vraie Irukandji en b-roll libre). **Aucune machine n'est créée tant qu'Alex n'a pas validé ce plan.**
> Nom provisoire : « Docu Papier 2D ». Banque de niche : **Docu Animaux 2D** (Depth Theory, Squidium, IntoTheBlue,
> IntoTheJungle, BeyondTheWild, Oceanverse).

---

## 1. Ce qu'on sait déjà faire (et qui est réutilisable tel quel)

| Brique | Où | État |
|---|---|---|
| Langage papier (étiquettes déchirées, badges, pop, cartes, cadres photo, sommaire, CTA milieu, outro commentaire) | `remotion/src/Jelly8/paper.tsx`, `icons.tsx` | prêt |
| Monde en plan-séquence (sol `G(x)`, stations caméra, dioramas avec leur propre échelle) | `remotion/src/Jelly8/world.tsx` | à généraliser (océan seulement) |
| **Banque de personnages** : 13 fiches à taille réelle, rig face + profil, IK mains/pieds, **marche réelle de profil** (27/11) | `remotion/src/cast2d/` (`cast.ts`, `rig.ts`, `people.tsx`, `walk.ts`, `things.tsx`), `docs/CAST2D.md`, skill `cast2d` | prêt |
| **Vérificateur physique** (pieds au sol, niveau d'eau, échelle, prise, gestes, jambes croisées, marche de face interdite, glisse des pieds) | `cast2d/rig.ts` `chk`, `Jelly8/layouts.ts checkLayout`, `scripts/j8-physics.ts` | prêt, à brancher sur un storyboard générique |
| Voix clonée + alignement mot à mot + resserrage | `agentic-tour-tts.js --align`, `vo-tighten.js`, `elevenlabs.js` | prêt |
| Musique, effets, mix −14 LUFS + **contrôle d'écoute** (transcription) | `suno-gen.js`, `j8-sfx.ts`, `bj-mix.js` | prêt |
| **B-roll légal** : Pexels, Pixabay, **Wikimedia Commons, NASA, Internet Archive, YouTube CC, Openverse** (27/11), crédits auto + bloc description | `lib/opensources.js`, `scripts/pexels-scout.js` (`--src libre`, `--credits`) | prêt |
| Mesure du b-roll, planches de relecture, repérage d'images | `j8-broll.ts`, `j8-times.ts`, ffmpeg `tile` | prêt (liste à générer automatiquement) |
| Labo de niche (scan chaînes, décorticage plan par plan, synthèse) | `lib/lab.js`, `scripts/niche-lab.js`, banque **Docu Animaux 2D** | prêt |
| Checklist des refus d'Alex | `docs/CHECKLIST-NICHE-ANIMAUX.md` | prêt, à transformer en contrôles automatiques |

**Ce qui est encore « fait main » dans Jelly8 et doit devenir de la donnée** : `index.tsx` (≈ 600 lignes) place chaque
étiquette, carte et plan à la main, avec des coordonnées. C'est LE chantier de la machine : remplacer ce placement manuel
par un **storyboard JSON** (écrit par le LLM, calé sur les mots de la voix) + un **moteur de mise en page** déterministe
qui place, et des **contrôles** qui refusent ce qui est mal placé. Ce n'est donc pas un clone de Time Travel (vidéo IA
scène par scène) : le bon squelette est celui de **Data Ranking** (Remotion piloté par JSON, voix phrase par phrase)
+ la ressource partagée de **Stickman** (bibliothèque de personnages).

---

## 1 bis. Ce que mesure la banque « Docu Animaux 2D » (Labo, 27/11, 22 vidéos décortiquées sur 6 chaînes)

| Mesure | Valeur | Ce qu'on en fait |
|---|---|---|
| Durée médiane | **20 min** (Oceanverse : 22 à 28 min) | 8 min reste notre défaut demandé par Alex, mais la niche tourne plutôt autour de 20 min → curseur jusqu'à 30 min, et **décision à prendre** (§ 10) |
| Débit de voix | **164 mots/min** | sert à dimensionner le script (à recaler sur la voix choisie) |
| Rythme | 1 changement de plan toutes les **6 s** (9,2 / min) | dans un plan-séquence, un « beat » (carte, étiquette, mouvement de caméra) toutes les ~6 s |
| Textes / infographies à l'écran | **75 %** du temps | confirme le langage papier + infographies |
| Répartition (indicative) | b-roll vidéo 25 %, graphiques 15 %, texte animé 14 %, « vidéo IA » 28 % | le Labo classe souvent la 2D maison en « IA » (déjà constaté) → à relire, pas à copier |
| Chaînes | Depth Theory 1,35 M vues de moyenne · Squidium 290 k · Oceanverse 179 k · BeyondTheWild 60 k · IntoTheBlue 7 k · IntoTheJungle 1 k | Depth Theory et Oceanverse = modèles ; Squidium à décortiquer de plus près |

**Titres qui marchent (Oceanverse, vues)** : « Pourquoi le Prédateur le Plus Mortel de L'océan Refuse de Nous Tuer »
(815 k) · « Pourquoi Les Orques Ont Peur Des Cachalots » (395 k) · « J'ai Lâché Des Orques Dans 11 Océans
Préhistoriques » (247 k). Deux formules : **« Pourquoi [créature] [paradoxe] »** et **« J'ai lâché [créature] dans
[N] [mondes] »** — à mettre dans le générateur de titres avec les formules anglaises de Depth Theory.

## 2. Paramètres de la machine (écran de lancement)

| Paramètre | Valeurs | Défaut | Remarques |
|---|---|---|---|
| **Sujet** | texte libre (« la méduse-boîte ») ou 💡 Idée (banque + sujets déjà produits exclus) | — | jamais de sujet inventé sans validation |
| **Famille** | animal marin · animal terrestre · insecte / araignée · oiseau · phénomène naturel · corps humain · espace · « et si… » | déduite du sujet | choisit le monde (océan, jungle, savane, ciel, intérieur du corps…) et le bestiaire |
| **Format de titre** | « Pourquoi vous ne voudriez jamais rencontrer… » · « Plus on descend, plus… » · « J'ai lâché X dans… » (Oceanverse) · « Le ___ le plus dangereux… » | selon la banque | formules tirées des titres les plus vus de la banque |
| **Durée** | 3 à 30 min | **8 min** | dimensionne le nombre de questions / chapitres ; débit de la voix MESURÉ (pas supposé) |
| **Langue** | FR, EN, ES, DE, PT, IT… | FR | voix, textes à l'écran, titre, description, tags dans la langue du PUBLIC |
| **Voix** | voix clonée d'Alex (ElevenLabs), Will, autres voix ElevenLabs, Inworld (éco) | voix d'Alex | bouton d'aperçu ; quota ElevenLabs affiché (voir § 6) |
| **Style** | papier Oceanverse · infographie Depth Theory · **mélange** | mélange | |
| **B-roll réel** | cible en % de l'écran | **12 %** | mesuré avant rendu, refus en dessous de la cible − 2 |
| **Sources autorisées** | Pexels, Pixabay, Commons, NASA, Archive (organismes publics seulement), YouTube CC, Openverse | toutes sauf YouTube CC | YouTube CC coûte 100 unités de quota par recherche |
| **Images IA** | non · **en dernier recours** · oui | en dernier recours | seulement pour une espèce / un objet introuvable ; jamais de « fausse photo » |
| **Vidéo IA** | non · oui | **non** | |
| **Fair use** | **désactivé** (décision d'Alex du 27/11) | non | s'il est un jour activé : extraits ≤ 8 s, commentés, **cités automatiquement** dans la description et listés dans le run |
| **Musique** | Suno (ambiance), volume | lit musical, 0,16 | |
| **Miniature** | style, texte (3 mots max), créature | auto | i2i ancré sur le style des miniatures les plus vues de la banque |
| **Mode** | semi (je valide le storyboard) · auto | **semi** | |
| **Publication** | chaîne, date, privé / public | privé | |

**Faut-il une proportion « IA vs fair use » ?** Non : avec le fair use coupé, une proportion n'a pas de sens. Trois
interrupteurs (images IA, vidéo IA, sources) + un curseur (b-roll réel %) suffisent. La machine affiche après coup la
répartition réelle (dessin 2D / b-roll réel / IA) et refuse de sortir si une règle est violée.

---

## 3. Banque de personnages et bestiaire : oui, et c'est déjà commencé

- **Personnages humains** : la banque `cast2d` est la ressource partagée (même principe que `stickman-cast.js`).
  Étape « casting » : le LLM liste les rôles du script (âge, époque, métier, tenue) → la machine pioche dans la banque →
  ce qui manque devient une nouvelle **fiche** (taille réelle, peau, cheveux, haut, bas, accessoires), sa planche est
  rendue, regardée (vision) puis ajoutée. Jamais de personnage dessiné au cas par cas dans un film.
- **Bestiaire (le vrai manque)** : aujourd'hui `things.tsx` n'a que méduse-boîte, Irukandji, crevette, poisson, requin,
  souris (+ vinaigre, bocal, pièce de 2 €). Chaque nouvelle espèce demande un modèle 2D. Plan :
  1. **gabarits paramétriques** par grande famille (poisson, requin, raie, méduse, céphalopode, crustacé, cétacé,
     reptile, oiseau, insecte, araignée, mammifère quadrupède, serpent) : proportions, couleurs, motifs, nageoires…
     → une espèce = une fiche de paramètres, avec sa taille réelle en mètres pour le contrôle d'échelle ;
  2. **repli** (si « images IA en dernier recours ») : illustration papier découpé générée puis détourée, marquée IA ;
  3. une photo réelle de l'espèce (Commons) sert de **référence** pour régler la fiche (comme les pédalies de la méduse).
- **Objets** : même principe (taille réelle, point de prise, base posée) — le contrôle physique les lit déjà.

---

## 4. Le pipeline (étapes de la machine)

1. **Sujet** (+ 💡 depuis la banque, sujets déjà produits exclus).
2. **Registre des faits** : Wikipédia / Wikidata + source primaire pour chaque chiffre ; un chiffre « surprenant » est
   relu sur l'étude elle-même (leçon du « 170 protéines » → « 170 toxines possibles »). Les incertitudes sont dites.
3. **Script** (A-G-E-N-T) : accroche « vous », sommaire en cartes, questions / chapitres, CTA au milieu + « dans la
   suite », fin en commentaire. Longueur calculée sur le débit mesuré de la voix choisie.
4. **Voix** : TTS réplique par réplique, alignement mot à mot, resserrage ; cache par réplique (seules les répliques
   modifiées sont refaites).
5. **Storyboard JSON** calé sur les MOTS : pour chaque réplique, des « beats » typés (carte chiffre, comparaison
   d'échelle, carte du monde, frise, schéma du corps, diorama avec personnages, b-roll, quiz, chapitre…), chacun avec
   son mot d'entrée et de sortie.
6. **Casting + bestiaire** (§ 3).
7. **B-roll** : repérage sur les sources autorisées → planche → choix par vision (Qwen) → crédits enregistrés.
8. **Mise en page automatique + contrôles** : centrage dans les cadres, aucun chevauchement, texte ≥ 1,5 s lisible,
   écriture ≤ 0,3 s, lisibilité sur le fond, **physique 0 anomalie**, b-roll ≥ cible, mots à l'écran = mots dits.
9. **Relecture** : planches 1 image/s + revue par vision ; en semi, Alex valide le storyboard ici.
10. **Rendu** Remotion (bundle par run).
11. **Mix** (musique, effets, −14 LUFS) + **contrôle d'écoute** (transcription début / milieu / fin, refus si muet).
12. **Packaging** : titre (formules de la banque), description avec **chapitres** + **« Sources des images »**
    (généré depuis `credits.json`), tags, miniature.
13. **Stock / publication** (privé par défaut), envoi Telegram 720p.

---

## 5. Combien de temps pour monter une vidéo ?

**Mesuré sur Jelly8 (8 min)** :
- étude de la chaîne → vidéo livrée : environ **2 h de travail en session** pour la v8 (horodatages des fichiers),
  puis une passe de retouches après relecture ; s'y ajoute la création de la banque de personnages et du vérificateur
  physique (faite une fois pour toutes) ;
- rendu : **≈ 15 min** (14 144 images, 6 en parallèle) ;
- voix : 2 à 5 min (49 répliques) ; mix + contrôle d'écoute : ≈ 3 min ; contrôle physique : quelques secondes.

**Objectif machine** (estimation, à vérifier sur les 3 vidéos de validation) : **60 à 90 min de calcul** par vidéo de
8 min, dont ≈ 15 min de rendu, et **≈ 10 min de temps d'Alex** en mode semi (valider le storyboard, regarder le
résultat). Le premier film d'une nouvelle famille (nouveau monde, nouvelles espèces) prendra plus longtemps tant que le
bestiaire se remplit.

---

## 6. Coûts et limites connues

- **Voix ElevenLabs** : une vidéo de 8 min ≈ 1 400 mots ≈ 8 à 9 k caractères. L'abonnement Starter (40 k caractères par
  mois) ne couvre donc qu'**environ 4 vidéos par mois** → il faudra un forfait supérieur ou la voix Inworld (éco) pour le
  volume.
- Images : 0 € avec le b-roll libre ; musique Suno via Kie : quelques centimes ; vision Qwen : quasi gratuit.
- **Pièges des sources libres** (vus le 27/11) : sur Internet Archive, la licence est déclarée par celui qui met en
  ligne → un dessin animé y est marqué « domaine public ». N'y prendre que des organismes publics (NOAA, NASA, NPS,
  USFWS…). Sur Commons, beaucoup de vidéos sont petites (192 px) : filtrer la résolution. CC BY-SA : crédit « SA ».
- Le Labo confond parfois 2D maison et IA (déjà noté) : relire ses pourcentages.

---

## 7. Le package complet (exigence d'Alex : « complet, complet, complet »)

Format habituel des machines distribuées (wealth, datarank, pov) : `files/` aux chemins du projet, `if-missing/`
(socle copié seulement s'il manque), `install.js` idempotent, `server-routes.snippet.js`, `INSTALL-LLM.md` +
`AGENTS.md` / `CLAUDE.md` pour l'assistant de l'élève, banque embarquée (titres publics) pour que 💡 marche tout de suite.

**Connaissances à embarquer (skills + docs + scripts)** :
- **Motion design / papier** : `paper.tsx`, recettes `RECETTE-NICHE-ANIMAUX.md`, `DISSECTION-DEPTH-THEORY.md`,
  `DISSECTION-OCEANVERSE.md`, `CHECKLIST-NICHE-ANIMAUX.md` ; skills `motion-graphics`, `anidoodle`, `html-anime-*`.
- **Personnages 2D + physique** : `cast2d` (code, fiches, planches, `CAST2D.md`, skill), `walk.ts`, skill
  `character-physics`, vérificateurs.
- **Three.js** : skill `threejs-quality-kit` (le pack élèves récent : ressources, méthode, checklist, scripts),
  `threejs-code-video` + ses références (`v3-film`, `polyfork-rig/motion/look`, pièges), les 13 skills `threejs-*`.
- **Blender + modèles 3D** : `model3d.js` (image Kie → Hunyuan 3D → Blender), `scripts/blender/*.py` (nettoyage,
  échelle, 4 vues, rig Mixamo + poids, peinture), méthode et pièges (budget, coutures, PBR inutile) — même si la
  niche 2D ne s'en sert pas encore.
- **Remotion** : les 8 skills officiels + `clip-montage-cta`, règles de bundle (`--public-dir`, bundles séparés).
- **Son** : `agentic-tour-tts.js`, `elevenlabs.js`, `vo-tighten.js`, `suno-gen.js`, `bj-mix.js` (+ contrôle d'écoute).
- **Sources légales** : `lib/opensources.js`, `pexels-scout.js`, `lib/pixabay.js`, `lib/pexels.js`, règles de licences.
- **Labo de niche** : `lib/lab.js`, `niche-lab.js`, la banque Docu Animaux 2D.
- **Méthode machine** : skill `machine-factory` + `machines-log.md`, `ffmpeg-usage`, `kie-models`.

**Jamais dans un pack public** : modules `.mjs` Polyfork (licence), clés et coffre, `data/`, identifiant de la voix
clonée d'Alex, la tête validée d'Alex (personnelle). Le dépôt public `threejs-quality-kit` reste tel quel et devient
une **partie** du grand pack (même contenu, recopié à jour).

---

## 8. Au-delà des animaux

Le moteur ne dépend pas des animaux : c'est un **documentaire explicatif papier**. Ce qui change d'un sujet à l'autre,
ce sont des « coutures » : le monde (océan, jungle, savane, ciel, volcan, intérieur du corps, espace), le bestiaire ou
les objets, et les formules de titres. Pistes dans l'ordre de réutilisation : animaux terrestres et insectes (même
grammaire) → phénomènes naturels (volcans, foudre, tsunamis, grêle) → corps humain → espace → formats « et si… »
(Oceanverse : un cachalot dans 11 océans préhistoriques). On commence par les animaux, comme demandé.

---

## 9. Étapes proposées

| Phase | Contenu | Livrable | Ordre de grandeur |
|---|---|---|---|
| 0 ✅ | Études DT + Oceanverse, Jelly8, banque `cast2d`, physique, marche réelle, sources libres, banque de niche | ce document | fait |
| 1 | **Moteur de scène** : extraire Jelly8 en composants + format storyboard JSON + mise en page auto + contrôles de placement | Jelly8 re-rendu À PARTIR D'UN JSON, identique | 2 à 3 sessions |
| 2 | **Bestiaire paramétrique** (13 familles) + casting automatique | planches de 30 espèces regardées | 2 sessions |
| 3 | **Écriture** : registre des faits, script A-G-E-N-T, storyboard par le LLM, garde de durée sur le débit mesuré | 3 scripts + storyboards validés à la main | 1 à 2 sessions |
| 4 | **Machine** dans Agent OS (squelette Data Ranking, namespacing, wizard, paramètres du § 2, packaging SEO + crédits) | machine dans la page Machines | 2 sessions |
| 5 | **Validation** : méduse-boîte refaite par la machine (comparée à Jelly8), un animal terrestre, un phénomène | 3 vidéos + mesures vs banque | 1 session + relectures d'Alex |
| 6 | **Package complet** (§ 7) testé dans un bac à sable | dépôt privé (public sans Polyfork ni voix si souhaité) | 1 session |

## 10. Décisions qui reviennent à Alex (quand il voudra)

1. Feu vert pour créer la machine (phase 1 d'abord).
2. Nom de la machine et de la chaîne cible ; langues prioritaires ; **durée par défaut** (8 min demandé, 20 min = médiane
   de la niche, Oceanverse 22-28 min).
3. Forfait ElevenLabs (volume) ou voix Inworld pour les vidéos en série.
4. Bestiaire : autoriser l'illustration IA en repli quand une espèce manque ?
5. Package : privé seulement, ou version publique pour les élèves (sans Polyfork ni voix) ?
