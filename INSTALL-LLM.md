# Guide d'installation — pour l'assistant IA qui installe la machine

> Tu es un assistant de code (Claude Code, Codex, Cursor…) et l'utilisateur t'a demandé d'installer la machine **Docu Papier 2D** (documentaires animaliers en papier découpé) dans son Agent OS. Suis ces étapes dans l'ordre, vérifie chaque résultat, et rends compte à l'utilisateur en français, simplement. Ne saute aucune vérification.

## Règles

- **Ne touche à aucun secret.** Les clés API vivent dans le coffre chiffré d'Agent OS (`agent-os/data/`, gitignoré) ou dans le `.env` racine. Ne les lis pas, ne les écris jamais dans un fichier, ne les affiche pas. Si une clé manque, dis à l'utilisateur laquelle ajouter dans Paramètres → Coffre.
- **Ne remplace pas le socle.** Les modules `agent-os/lib/*.js` existants appartiennent à l'OS de l'utilisateur. Ce dépôt fournit les fichiers de la machine ; `if-missing/` (`lib/llm.js`, `lib/pexels.js`) n'est copié que si le fichier est absent.
- **Ne redémarre jamais Agent OS pendant qu'un run tourne** (une autre machine peut être en train de générer : ça tue la génération en mémoire). Demande avant de redémarrer.
- **Ne commit rien** chez l'utilisateur sans qu'il le demande.

## 1. Repérer l'Agent OS

La racine est le dossier qui contient **`agent-os/`** et **`remotion/`**. Vérifie :

```bash
ls <racine>/agent-os/server.js <racine>/agent-os/public/index.html <racine>/agent-os/public/js/core.js \
   <racine>/agent-os/public/js/pages/machines.js <racine>/agent-os/lib/vault.js <racine>/remotion/package.json
```

Les 6 fichiers doivent exister. Sinon, demande à l'utilisateur où est son Agent OS.

Prérequis à vérifier (et à signaler, sans rien installer au niveau système sans accord) :

| Commande | Attendu | Sinon |
|---|---|---|
| `node -v` | v18 ou plus | installer Node LTS |
| `ffmpeg -version` et `ffprobe -version` | une version | installer FFmpeg et l'ajouter au PATH |
| `ls <racine>/remotion/node_modules/remotion` | le dossier existe | `cd remotion && npm install` |
| `python -c "import faster_whisper"` | pas d'erreur | `pip install faster-whisper` (la machine appelle bien `python`, pas `python3`) |

## 2. Récupérer le dépôt et simuler

```bash
git clone https://github.com/Alex-sia99/docu2d-machine
cd docu2d-machine
node install.js <racine> --dry
```

La simulation liste ce qui serait copié et branché, sans rien écrire. Lis la sortie : `✓` = sera fait, `·` = déjà présent, `⚠` = à traiter (ancre introuvable → section 5 ; paquet ou outil manquant → récapitulatif « À installer »).

## 3. Installer

```bash
node install.js <racine> --npm
```

`--npm` installe dans `remotion/` les paquets manquants : `@remotion/google-fonts` à la **même version exacte** que `remotion` (une version différente casse le bundle) et `tsx` (vérificateur du storyboard). Sans `--npm`, l'installateur affiche les commandes à lancer.

Si l'utilisateur veut le package complet (connaissances Three.js / Blender / motion design), ajoute `--with-kit` : le dépôt `threejs-quality-kit` est cloné à côté de `docu2d-machine/` et son installateur est lancé sur la racine (skills dans `.claude/skills`, scripts dans `scripts/kit`).

Relance une seconde fois `node install.js <racine>` : il ne doit afficher **aucune** ligne `✓` (installation idempotente). Chaque fichier modifié a une sauvegarde `<fichier>.bak-docu2d`.

## 4. Vérifier

```bash
cd <racine>/agent-os
node --check server.js && node --check public/js/core.js && node --check public/js/pages/machines.js \
  && node --check public/js/pages/docu2d.js && node --check lib/machines/docu2d.js && node --check lib/vault.js && echo SYNTAXE OK
node -e "const d=require('./lib/machines/docu2d'); console.log('module OK', JSON.stringify(d.estimate({durationMin:10})), require('./lib/vault').FIELDS.pixabay)"
```

Avec les réglages par défaut (débit pas encore mesuré), l'estimation doit rendre
`{"chars":8275,"usd":1.38,"detail":{"voice":1.24,"music":0.06,"llm":0.08,"ai":0},"wpm":165,"renderMin":17}` et le champ du coffre `Pixabay (b-roll libre)`.

Remotion (la machine a sa propre entrée, `src/docu2d.tsx` ; ne touche pas à `Root.tsx`) :

```bash
cd <racine>/remotion
npx remotion bundle src/docu2d.tsx --public-dir public-d2 --out-dir build-d2-test --log=error
npx remotion compositions build-d2-test          # Docu2D, Docu2DThumb, BestiarySheet, CastSheet
npx remotion still build-d2-test BestiarySheet ../bestiaire-test.png --props='{"id":"lion"}' --frame=45
npx tsx --version                                 # le vérificateur tourne avec tsx
```

Ouvre `bestiaire-test.png` et regarde-le : les 6 animaux à l'échelle sur une feuille crème. Puis supprime `remotion/build-d2-test` et l'image de test.

Puis, **après accord de l'utilisateur**, redémarre Agent OS (`cd agent-os && npm start`) et teste (remplace le port par celui affiché au démarrage, souvent 4200 ou 4100) :

```bash
curl -s localhost:<port>/api/machines/docu2d | head -c 300                 # la config, les langues, les voix, les clés
curl -s -X POST -H "Content-Type: application/json" -d '{"durationMin":10}' localhost:<port>/api/machines/docu2d/estimate
curl -s localhost:<port>/api/machines | grep -o '"docu2d"'                  # la machine est listée
```

Dans le navigateur : **Machines → 🦛 Docu Papier 2D** s'ouvre sur l'onglet ⚙ Générer. S'il affiche « Aucune clé Pixabay ni Pexels », c'est normal tant que la clé n'est pas dans le coffre.

## 5. Installation manuelle (seulement pour les lignes `⚠`)

Fais uniquement les points signalés par l'installateur. Adapte au style du fichier.

**server.js — require** (en haut, avec les autres machines) :
```js
const docu2d = require("./lib/machines/docu2d");
```

**server.js — table des machines** : ajouter `docu2d` à l'objet `const MACHINES = { … }`.

**server.js — hub** : dans la route `GET /api/machines`, ajouter `card(docu2d)` à la liste renvoyée.

**server.js — routes génériques** : dans les regex du type `/^\/api\/machines\/(timetravel|linguistique|…)\/stock$/` (stock, publication depuis le stock, order-info, ideas), ajouter `|docu2d`. Ne l'ajoute pas à une liste suivie d'un aiguillage codé en dur (`m[1] === "timetravel" ? tt : ling`). Le bloc de la machine a de toute façon sa propre route de stock.

**server.js — routes de la machine** : coller tout le contenu de `server-routes.snippet.js` dans le routeur, à côté des blocs des autres machines (même indentation, là où `p`, `req`, `res`, `m`, `json()` et `readBody()` existent — `m` doit être déclaré plus haut par `let m`).

**server.js — boot (facultatif)** : si une ligne `const stale = a.sweepRuns() + …;` existe, y ajouter `+ (docu2d.sweepRuns() || 0)` ; si un tableau `[...x.strandedRuns(), …]` existe (cron de sauvetage), y ajouter `...docu2d.strandedRuns()`.

**server.js — manifeste des agents (facultatif)** : si une liste `machines: [ { id: …, name: …, api: … }, … ]` existe, y ajouter `{ id: "docu2d", name: "Docu Papier 2D", api: "/api/machines/docu2d" }`.

**public/index.html** : avant la ligne `<script src="js/pages/machines.js"></script>` :
```html
<script src="js/pages/docu2d.js"></script>
```

**public/js/core.js** : dans le tableau `["timetravel", …].includes(name) ? "machines" : name`, ajouter `"docu2d"`.

**public/js/pages/machines.js** : ajouter une carte dans la grille du hub, et `"#/docu2d": "d2-tab"` dans `TAB_KEYS` si cet objet existe :
```html
<a class="bank-folder" href="#/docu2d" style="text-decoration:none;color:inherit">
  <div style="font-size:34px">🦛</div>
  <b>Docu Papier 2D</b>
  <div class="small muted" style="margin-top:4px">Documentaires animaliers en papier découpé — Wikipédia → script → voix ElevenLabs → storyboard vérifié → plans réels libres → Remotion → mix + contrôle d'écoute</div>
</a>
```
Pour les badges (stock / en cours), si le hub charge les machines par `Promise.all([...])` : déclarer `let d2Cfg = null, d2Runs = [], d2Stock = [];`, ajouter `d2Cfg, d2Runs, d2Stock` à la déstructuration, `api("/api/machines/docu2d"), api("/api/machines/docu2d/runs"), api("/api/machines/docu2d/stock"),` à la liste, et `${badges(null, d2Runs, d2Stock, "")}` dans la carte.

**lib/vault.js** : dans l'objet `const FIELDS = { … }`, ajouter :
```js
  pixabay: "Pixabay (b-roll libre)",
  elevenlabs: "ElevenLabs (voix)",
```

## 6. Clés et connexions à demander à l'utilisateur

| Clé du coffre | Service | Sert à | Obligatoire |
|---|---|---|---|
| `pixabay` ou `pexels` | Pixabay / Pexels | les plans réels libres (au moins une des deux) | **oui** — la machine refuse de créer un run sans |
| `elevenlabs` | ElevenLabs | la voix off (alignement mot à mot inclus) ; repli : `ELEVENLABS_API_KEY=` dans le `.env` racine | **oui** |
| `openrouter` | OpenRouter (Qwen) | faits, script, storyboard, idées, packaging | conseillé (repli : Claude CLI connecté) |
| `kie` | Kie.ai | musique Suno ; images IA de secours si activées | conseillé (sans : vidéo sans musique) |
| chaîne YouTube connectée | YouTube | publication depuis la machine ou le Stock | non |

Voix clonée (facultatif) : l'entrée « Ma voix clonée » lit `Voix_Alex=<ID de la voix>` dans le `.env` racine. Sans elle, choisir une voix de la liste (George par défaut).

La machine **n'envoie rien vers un serveur distant** hormis les API listées : la vidéo reste sur le disque (`agent-os/output/machines/<run>/final.mp4`).

## 7. Premier essai conseillé

Proposer un run court en **Semi-manuel** pour valider la chaîne complète (~0,50 $) : sujet « l'hippopotame », **durée 3 min**, français, voix George, 12 % de plans réels. La machine s'arrête après le script (relire, valider) puis après le storyboard et les plans (regarder la planche de relecture, valider), puis rend, mixe, contrôle l'écoute et emballe.

Rappelle les limites de la v1 : animaux à quatre pattes (bestiaire hippopotame, lion, éléphant, buffle, rhinocéros, crocodile), monde savane ; marin, insectes, oiseaux = phases suivantes.

## Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| `Cette machine a besoin d'au moins une clé Pixabay ou Pexels` | aucune clé de plans libres | ajouter `pixabay` (gratuit) ou `pexels` dans Paramètres → Coffre |
| `Clé ElevenLabs absente` | clé manquante | ajouter `elevenlabs` dans le coffre (champ ajouté par l'installateur) |
| `Voix_Alex absente du .env racine` | « Ma voix clonée » choisie sans ID | choisir une autre voix, ou mettre `Voix_Alex=<id>` dans le `.env` racine |
| `vérificateur : …` à l'étape storyboard | `tsx` absent, ou anomalies résiduelles | `cd remotion && npm i -D tsx` ; sinon relancer depuis l'étape storyboard |
| `Cannot find module '@remotion/google-fonts/Poppins'` au bundle | paquet absent ou version différente | `cd remotion && npm i --save-exact @remotion/google-fonts@<version de remotion>` |
| `contrôle d'écoute impossible` | `python` ou `faster-whisper` absent | `pip install faster-whisper`, vérifier `python -c "import faster_whisper"` |
| `contrôle d'écoute : la voix n'est pas reconnue` | vidéo finale sans voix audible | regarder `agent-os/output/machines/<run>/mix/`, relancer depuis l'étape mix |
| `planche : …` dans le journal | police Windows absente (macOS / Linux) ou rendu interrompu | sans gravité : le run continue sans planche |
| Vidéo sans musique | clé `kie` absente ou Suno en échec | ajouter `kie`, relancer depuis l'étape mix |
| `aucune page Wikipédia trouvée` | sujet trop vague ou mal orthographié | reformuler (« l'hippopotame », « le buffle d'Afrique ») |
| La page reste blanche | script non chargé | vérifier `js/pages/docu2d.js` dans `index.html`, vider le cache (Ctrl+F5) |
| Run figé à `*_running` après un redémarrage | génération interrompue | bouton Reprendre dans le run (ou cron de sauvetage s'il existe) |

## Désinstaller

Restaurer les sauvegardes : pour chaque `<fichier>.bak-docu2d`, remettre le `.bak` à la place du fichier. Supprimer les fichiers copiés (liste complète dans `agent-os/lib/machines/docu2d.export.json`, champ `files`, et `ifMissing` seulement s'ils ont été copiés par cet installateur). Les runs sont dans `agent-os/data/machines/runs/docu2d/`, les vidéos dans `agent-os/output/machines/d2*/`, les plans et bundles Remotion dans `remotion/public-d2/d2*/` et `remotion/build-d2-*/`.
