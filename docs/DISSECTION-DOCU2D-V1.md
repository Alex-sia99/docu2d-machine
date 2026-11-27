# Dissection — Docu2D v1 (hippopotame 9 min 56, buffle 3 min 22) — 27/11/2026

Verdict d'Alex : la vidéo du buffle est « immonde », très en dessous de la méduse (Jelly8) ; l'hippopotame a des
annotations illogiques. Ce document explique POURQUOI, à partir d'une relecture image par image (une image toutes les
3 s), pas seulement des retours reçus. Chaque cause donne une règle, et chaque règle devient un CONTRÔLE automatique.

## 1. Ce qui a été vu (relecture serrée)

| Symptôme | Hippo | Buffle |
|---|---|---|
| Le même plan du monde revient en boucle (troupeau dans l'eau, animal qui marche) | ~15 fois le même troupeau | 3 images en tout sur 3 min |
| Animal qui « marche sur place » | charge / broute | tout le début |
| Cartes VIDES plusieurs secondes (titre seul, icônes qui arrivent sur leur mot) | 6 cartes, jusqu'à 9 s | 3 cartes |
| Animaux qui se chevauchent tête contre tête | troupeau | troupeau |
| Visuel qui contredit le texte | « Sénégal » sur l'aire de toute l'Afrique ; bébé humain pour « les petits » | bouclier pour « 2 000 membres », « 33 % », « compétition alimentaire » |
| Chose dite, jamais montrée | hyènes, lamantins | lion (attaque), peste bovine |
| Monotonie des cartes | — | 12 cartes « gros chiffre » identiques en 3 min |
| Texte qui déborde | — | « 398 000 – 401 000 » coupé |
| Habitat faux | — | buffles debout dans la rivière (preset écrit pour l'hippopotame) |
| Pas d'appel à l'action final, fin faible | canoë + hippo flottant | idem |
| Lecture impossible | — | une carte toutes les 3 s, certaines < 2 s |

## 2. Les vraies causes

1. **J'ai remplacé la mise en scène par un catalogue trop pauvre.** Jelly8 était dirigé plan par plan : ~40 stations de
   caméra, des dioramas avec personnages qui JOUENT l'histoire, des schémas faits pour chaque idée (syndrome, anatomie de
   la méduse). Le moteur v1 n'a que ~6 scènes du monde et 15 cartes ; le LLM retombe sur les plus faciles (« troupeau »,
   « gros chiffre », « étiquette ») → diaporama de chiffres sur un fond qui boucle.
2. **Le vérificateur contrôlait le temps et la géométrie, jamais le SENS.** Il savait qu'une étiquette était trop longue,
   pas qu'une icône de bébé humain illustre des hippopotames, ni qu'une carte affiche un pays au hasard, ni qu'un animal
   cité n'apparaît jamais.
3. **Règles de rythme absentes ou fausses.** Carte ≥ 1,6 s (trop court), aucune règle sur une carte vide, aucune règle
   de répétition du monde, caméra collée à l'animal (effet tapis roulant), presets hippopotame appliqués à toute espèce.
4. **Ma relecture était trop légère.** J'ai jugé sur 36 vignettes (une toutes les 16 s) : ça cache les répétitions,
   les cartes vides et les sauts. Je n'ai pas regardé le rythme réel ni vérifié le sens de chaque visuel.
5. **J'ai livré la machine en la disant prête** après un seul test, au lieu de mesurer la qualité contre Jelly8.

## 3. Règles (devenues contrôles dans `remotion/scripts/d2-check.ts` + passe critique du storyboard)

- **R1 Lisibilité** : une carte reste ≥ 2,5 s ET ≥ 1,2 s + 0,05 s par caractère affiché ; une étiquette ≥ 1,8 s.
- **R2 Jamais de carte vide** : une carte à éléments entre au plus 0,6 s avant son premier élément (le moteur la décale).
- **R3 Variété du monde** : jamais deux beats monde identiques (scène + cadrage) à la suite ; une scène ≤ 30 % du temps
  du monde ; le troupeau change de composition à chaque apparition.
- **R4 Aucun chevauchement d'animaux** (boîtes englobantes), aucune tête dans une autre.
- **R5 Habitat** : une espèce terrestre n'est jamais posée dans la rivière ; les scènes aquatiques sont réservées aux
  espèces aquatiques (hippopotame, crocodile).
- **R6 Pas de tapis roulant** : la caméra ne suit pas l'animal à 100 % ; il traverse le cadre ou le décor défile avec des
  repères proches.
- **R7 Icône = mot** : une icône doit représenter exactement l'élément nommé (lexique d'icônes) ; un animal est dessiné par
  le bestiaire (mini-silhouette) ou, s'il n'existe pas, l'élément n'a pas d'icône (texte seul) — jamais une icône voisine.
- **R8 Carte du monde** : aucun nom de pays affiché par défaut ; l'étiquette dit ce que montre la carte (« aire de
  répartition ») ; un pays nommé seulement s'il est cité.
- **R9 Dit = montré** : tout animal, lieu ou objet nommé par la voix et illustré l'est correctement ; s'il ne peut pas
  l'être, on ne fait pas semblant (passe critique LLM : chaque beat est confronté à sa réplique).
- **R10 Variété des cartes** : pas plus de 2 cartes du même type à la suite ; « gros chiffre » ≤ 20 % des cartes.
- **R11 Texte qui tient** : un gros chiffre de plus de 9 caractères passe en taille réduite (jamais coupé).
- **R12 Fin** : écran final avec appel à l'action (s'abonner + J'aime + question en commentaire), tenu ≥ 6 s.
- **R13 Relecture** : planche serrée (1 image / 3 s) + métriques automatiques (temps de cartes vides, part de la scène la
  plus fréquente, cartes trop courtes) AVANT toute livraison ; on ne livre pas sous les seuils.
