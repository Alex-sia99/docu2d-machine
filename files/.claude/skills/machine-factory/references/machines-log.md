# Journal des machines

Une entrée par machine construite. But : capturer **ce qui était spécifique à la niche** (donc à refaire à chaque fois) et **tout mécanisme générique né sur cette machine** (donc à remonter dans le squelette du SKILL.md). Quand une couture se répète sur 2 machines, elle devient squelette.

---

## #1 — Time Travel (`timetravel`) — gabarit fondateur

Vlogs « voyage dans le temps » : une fille se filme en selfie face-cam dans une époque, une journée par facettes. Livrée juillet 2026 ; c'est **la** machine de référence dont tout le monde se clone.

### Ce qui était spécifique à la niche (les coutures)
- **Personnage** = noyau dur `{name, appearance (EN), persona, language, referenceRel}` : une identité récurrente à l'écran, ancre i2i pour images + miniature.
- **Recette** = `coreRules` (selfie-vlog unique, **voix féminine fixe** décrite à l'identique, tenue moderne fixe, plan continu sans multishot, progression jour→nuit, **une action nette par scène**) + `vlogRecipe` (époque/zone **large** découpée en **blocs thématiques** de longueur variable : arrivée→logement→marché→bouffe→métier→pouvoir→croyance→climax collectif→soirée→conclusion ; hook à l'arrivée, comparaisons anachroniques, food-reviews notées, myth-busts chiffrés, CTA).
- **Schéma de scène** : `{i, mode:"vlog", cta, action, voiceover, image_prompt, video_prompt}`.
- **`suggestTheme`** : propose des époques larges (Rome, Edo, Tenochtitlan) → `{era, place, pitch}`.
- **Modèles** : image `gpt-image-2-image-to-image` (i2i ancré référence), vidéo `grok-imagine-video-1-5-preview` (voix intégrée, `image_urls`, 720p, image publique Drive). Montage : réutilise `CtaClip` (FFmpeg concat + CTA PNG).
- **Packaging** : titre 85-100 car, tags 480-500 car, miniature i2i ancrée référence.
- **Frontend** : `actionChip` = badge 🤳 selfie-action ; `charDialog` = appearance/persona/language ; `LANGS`.

### Mécanismes GÉNÉRIQUES nés ici (→ squelette, réutilisables partout)
- Génération de prompts **parallèle + reprenable** (`BATCH_LONG=6`, `BATCH_CONCURRENCY=5`, `genJson` avec relances, outline+scènes persistés au fil de l'eau).
- **Anti-répétition par storyboard** : outline pré-assigne un beat unique par scène en 1 appel ; lots parallèles = simple étoffage. (Sans ça : 17 répétitions au 1er test 60 scènes.)
- **Garde `promptsComplete`** dans `deriveStatus` : plus de « saut aux images » sur un run partiel ; `run.sceneCount` figé.
- **Régé non destructive + parallèle** : `getLiveRun`/`releaseLiveRun` ref-comptés, écrasement seulement si succès, flag `scene.pending` persistant, cache-buster `ts`.
- **`sweepRuns()`** au boot (nettoie `rendering`/`pending` périmés).
- **Montage hybride FFmpeg + CTA Remotion PNG** → extrait dans le skill [[clip-montage-cta]] (Remotion se fige sur les vidéos longues).
- Machine à états `advance`/`deriveStatus`/`validate`/`resumeRun` reprenable après crash/restart.

### Pièges & règles opérationnelles apprises
- Ne jamais redémarrer le serveur pendant un run `*_running` (tué une fois → récupéré par `POST /resume`).
- Ne pas régé pendant un `advance()` actif (writes perdus).
- Le CLAUDE.md du projet n'est **pas** responsable de la lenteur (~2-4 min/appel = incompressible côté modèle ; absorbé par la concurrence).

### Dette connue à régler avant la machine #2
- `config()` lit `machines/timetravel.json` **en dur** → à namespacer par `machineId`.
- `stock.json` **partagé unique** → collision → à namespacer.
- Label `spend.record(…, "Time Travel", …)` hardcodé (~4 sites).
- `GET /api/machines` = tableau à 1 élément codé en dur → vraie liste.

---

## #2 — Linguistique (`linguistique`) — 2ᵉ machine (juillet 2026)

Vidéos d'apprentissage de langue par l'écoute (chaîne « listening ») : intro présentateur → N dialogues entre 2 protagonistes → outro présentateur, niveau A1/A2, sous-titres, CTA. **Portée depuis le workflow n8n `[Atelier 3] Niche Linguistique #1`.** Niche liée par défaut = « English ». C'est la 1re machine qui a validé la thèse squelette-vs-coutures « pour de vrai ».

### Coutures de niche (le 10 %)
- **Input** : 3 personnages par run (présentateur + 2 protagonistes). Personnage = `{name, appearance, sex M/F, voice (ElevenLabs), referenceRel}` — **pas de persona ni de langue** (la langue est un paramètre de run, pas du perso). Voix filtrée par sexe.
- **Recette** : `coreRules` (3 identités + voix fixes + niveau + langue + préambule d'identité image du workflow) + `dialogueRecipe` (intro pose une question d'écoute → histoire en scènes distinctes → outro répond + CTA). Storyboard = liste de **situations** distinctes (au lieu des `beats` de TT).
- **Schéma de scène** : segments à `role` (`intro`/`dialogue`/`outro`) ; dialogue = `turns:[{speaker:"A|B", text}]`, intro/outro = `narration`. Les 2 speakers A/B mappent vers les 2 voix de protagonistes.
- **Modèles** : image i2i **multi-référence** (les 2 protagonistes dans une scène ; le présentateur seul en intro/outro) via le catalogue studio. Voix = FAL `fal-ai/elevenlabs/text-to-dialogue/eleven-v3` (`{inputs:[{text,voice}]}`). **Pas de modèle i2v** : les clips sont montés localement (FFmpeg image fixe tenue = durée audio + mux). Lipsync présentateur optionnel via FAL (`veed/lipsync` par défaut, configurable). Sous-titres via FAL `fal-ai/whisper` → SRT → gravés par FFmpeg. **CTA en haut à droite** (nouvelle compo Remotion `CtaTopRight`).
- **Packaging** : titre/desc/tags YouTube listening + miniature i2i ancrée sur le présentateur.

### Mécanismes GÉNÉRIQUES nés/prouvés ici (→ remontés dans SKILL.md)
- **`lib/fal.js`** : transport FAL réutilisable (submit `queue.fal.run/<model>` → poll `status_url` → GET `response_url`, `Authorization: Key <fal>`). Réutilisable par toute future machine FAL (voix, lipsync, whisper, ffmpeg-api…).
- **Namespacing prouvé** (la « dette » du skill est réglée par CONVENTION) : config `machines/<id>.json`, stock `machines/<id>-stock.json`, label `spend.record(api, "<Nom>", …)`, et surtout **runs dans un SOUS-DOSSIER `data/machines/runs/<id>/`** — indispensable pour que le `listRuns` de chaque machine ne ramasse pas les runs des autres (TT lit le dossier plat, ignore les sous-dossiers). `GET /api/machines` = vraie liste `[card(tt), card(ling)]`.
- **Étape supplémentaire dans la machine à états** : le pipeline passe de 4 à 5 étapes média (Dialogues → Images → **Voix** → Vidéos → Montage). `advance`/`deriveStatus`/`validate` + le rail du wizard s'étendent trivialement (ajouter un statut `_running`/`_ready`, une vue, un libellé de validation).
- **Montage ≠ toujours CtaClip** : une machine peut ajouter sa propre compo Remotion (ici CTA haut-droite) et enrichir le FFmpeg (ici sous-titres `subtitles=subs.srt:force_style=…`, cwd = dossier du run pour éviter l'échappement de chemin Windows). Le reste du montage (concat normalisé + overlay PNG best-effort) est réutilisé tel quel.

### Pièges rencontrés
- `spend.record()` est **synchrone** : pas de `.catch()` dessus (bug attrapé à la relecture).
- Sous-titres FFmpeg sous Windows : lancer ffmpeg avec `cwd = dossier du run` et référencer `subs.srt` en relatif (le `:` d'un chemin absolu casse le filtergraph).
- Lipsync `veed/lipsync` attend une **vidéo** publique : on fabrique d'abord le clip de base (image+audio), on l'uploade sur Drive public, puis on lipsynce.
- Une compo Remotion cassée casse **tout le bundle** (donc aussi le CTA de TT) : vérifier `npx remotion compositions` après ajout.

### Raffinements (session suivante — Grok, présentateur, tenue)
- **Personnage = `sex` (F/M) + `presenter` (bool)**, exposés en UN menu « Sexe / rôle » (Femme/Homme/Présentatrice/Présentateur). Le flag `presenter` pilote le CADRAGE de la réf : présentateur = plan serré tête/buste (bon lip-sync), acteur = plan moyen. `regenCharacterImage(id)` régénère la réf (bouton « 🔄 16:9 » par carte).
- **Grok i2i reproduit la TAILLE de la référence** → toutes les réfs sont générées en **16:9** (`generateReference` aspect 16:9 via `gpt-image-2-text-to-image`), et on n'envoie **pas** d'`aspect_ratio` à Grok (`conf.noRatio`). Grok i2i ne prend qu'**1 image** (`maxImages:1`) : pour un dialogue à 2 protagonistes, on compose une **référence DUO 16:9** (FFmpeg `hstack` A+B → 1280×720) uploadée publique, passée en `image_urls`. Règle générale : `conf.maxImages < 2` → duo, sinon 2 réfs.
- **`ensureRefUrls` anti-périmé** : mémorise (`refSrc`) le `referenceRel` uploadé ; réf régénérée → ré-upload auto (sinon le run garde l'ancienne image). Idem duo (rebuild si A/B changent).
- **TENUE FIXE** dans `coreRules` : chaque perso garde EXACTEMENT sa tenue signature dans TOUTES les scènes (le modèle changeait les habits selon le décor — ex. chez le coiffeur avant/après). + cadrage imposé (dialogue = plan moyen 2 persos ; intro/outro = présentateur plan rapproché pour le lip-sync).
- **`regenSceneImages(runId, {except|indices})`** : régé en masse des images d'un sous-ensemble de scènes (background, non destructif, pool 4) — sert à tout re-générer sauf intro/outro après un changement de modèle/réf.

### Raffinements (session +2 — émotions, montage/timing, miniature, tags)
- **Émotions ElevenLabs v3** : Claude insère des balises `[tag]` INLINE dans les répliques ET la narration (`[excited] [nervous] [whispers] [laughs] [sigh] [curious]`…). Ce sont des directions audio **non prononcées** → **absentes des sous-titres** (Whisper transcrit l'audio, pas les crochets). 1-2 max/réplique.
- **Concurrence = 10** pour images ET voix (pool ROULANT `pool()` : dès qu'une finit, la suivante démarre — pas de « blocs » de 4/8). regenSceneImages aussi.
- **Montage / durée (bug « son coupé » + sous-titres décalés)** : ElevenLabs ajoute parfois du **silence de fin** → le clip (`-loop 1 … -shortest`) devient plus long que la parole. Fix : **trim du silence de fin** en sortie de voix (`ffmpeg -af "areverse,silenceremove=start_periods=1:start_duration=0.3:start_threshold=-50dB,areverse"`, début gardé pour l'alignement Whisper). SURTOUT : sous-titres et CTA **offsettés sur les durées RÉELLES des clips** (`ffprobe seg-N.mp4`), JAMAIS sur `audio.duration` — sinon dérive cumulative (sous-titre qui apparaît avant sa scène). Lipsync = **audio trimmé uploadé** (pas l'audio FAL brut) pour que la durée colle au clip. Sous-titres descendus (`MarginV=22`).
- **completeCharacter** : variété FORCÉE (origine/peau, cheveux, âge, morpho, **tenue** — pas tous en pull moutarde) + on passe les personnages DÉJÀ créés au prompt pour rendre le nouveau différent.
- **Intro** : la question d'écoute doit DÉCOULER du contexte posé (jamais « sortie de nulle part »).
- **Miniature** : `bank.inspiration(..., {maxVisions})` injecté (style des miniatures concurrentes) + gros plan visage, expression forte, couleurs saturées, sujet décentré, zéro texte.
- **Tags cap DUR 500 car** : helper `capTags(tags, 500)` (empile jusqu'à ≤500) appliqué dans packaging + regenTexts + publishRun (le LLM dépassait — 700/500).

### Raffinements (session +3 — durée audio/vidéo DÉFINITIVE, sous-titres 1 passe)
- **⛔ TRIM AUDIO INTERDIT (annule le trim de la session +2)** : le `silenceremove` (-50dB / start_duration 0.3) **mangeait la fin de la dernière syllabe** — prouvé au volumedetect : la tranche coupée (0,47 s) contenait de la parole à -2,5 dB de pic. Une syllabe finale < 0,3 s passe pour du silence. L'audio ElevenLabs est livré **TEL QUEL**, aucune modification, jamais.
- **RÈGLE D'OR clip image+audio (méthode n8n)** : 1) audio, 2) **metadata** (ffprobe → durée D), 3) vidéo générée à **EXACTEMENT D** (`-t D.toFixed(3)`), 4) mux sans rien couper. **JAMAIS `-shortest` avec `-loop 1`** : le buffering du muxer fait déborder la vidéo de 1-2 s (constaté : audio 24,8 s → clip 26,4 s sur TOUTES les scènes) et donne l'impression d'un son coupé. L'offset-par-clips de la session +2 ne compensait pas ce débordement à la source.
- **Lipsync : ré-injecter l'audio original** : veed/lipsync réencode (et écourte) la piste son → après téléchargement, remux `-map 0:v -map 1:a -c:v copy` avec l'audio local intégral (durée finale = max des deux, rien de coupé).
- **Sous-titres = 1 SEULE passe Whisper sur la vidéo ASSEMBLÉE** (remplace le Whisper par segment + offsets) : montage passe 1 = concat + CTA → `assembled.mp4` ; extraction `full-audio.mp3` → upload public → `fal-ai/whisper` (timestamps déjà = ceux de la vidéo finale, zéro calcul d'offset) ; passe 2 = gravure `subtitles=` avec **`-c:a copy`** (l'audio ne peut plus être touché). Moins cher (1 appel au lieu de N) et sync parfaite.
- `uploadPublic(name, file, mime)` généralisé (audio/mpeg pour Whisper).
- **Prix réels (source utilisateur)** : ElevenLabs v3 = **0,10 $/1000 caractères ENVOYÉS** (contenu des dialogues — comptés au réel dans `generateVoice`, plus de forfait/segment) ; Veed = **0,40 $/minute** de vidéo traitée (lipsync, seulement si activé — facturé sur la durée réelle du clip).

### Dépendances
- Clé **FAL** dans le coffre (champ « FAL.ai » déjà présent). Sans elle : voix/lipsync/whisper échouent.
- 3 personnages avec image de référence obligatoires avant un run.
- Modèle image **Grok** = réfs 16:9 obligatoires (voir Raffinements).

---

## #3 — Musique (27 juillet 2026)

Vidéos musicales longues (mix/compilation), calquées sur les vidéos cyberpunk du workflow n8n 2-11. `lib/machines/musique.js` + `public/js/pages/musique.js`.

- **Niche / format dominant** : mix long = 1 image fixe + waveform + N musiques. Le style vient d'un onglet « Style musical » : profils `{name, desc, sunoStyle, visualPrompt}` **dérivés de la banque de niches par Claude** (`deriveStyle`) — titres concurrents → codes de titres, tags → mots-clés, visions de miniatures → codes visuels. Chaque élément scrapé sert.
- **Input / noyau dur** : styleId (noyau dur = sunoStyle, jamais quitté), thème/ambiance (💡 exclut les idées produites), **nombre de musiques par 2** (Suno rend TOUJOURS une paire, 0,06 $/requête, ~3-5 min/titre), instrumental Y/N (style martelé « NO vocals » + flag), waveform Y/N + couleur (bulles), effets {titre, glitch}, CTA Y/N + langue, publication auto, mode semi/auto.
- **Structure du run** : PAS de scenes[] — `run.pairs[]` (une paire = une requête Suno = 2 audios) + `run.visual` (LE visuel unique). Wizard 3 étapes : Visuel → Musiques → Montage (+ Fini). Les prompts Claude ne sont PAS affichés (choix utilisateur).
- **Transport Suno (Kie)** : `POST /api/v1/generate` (model V5_5, customMode, instrumental, style, title, prompt=paroles, weights 0.65) → poll `GET /api/v1/generate/record-info?taskId` → `data.response.sunoData[].audioUrl` quand `status==="SUCCESS"` ; statuts d'échec `*_FAILED|SENSITIVE`. 2 titres par requête → fichiers `mus-<i>a.mp3` / `mus-<i>b.mp3`.
- **Montage 100 % FFmpeg local** (règle d'or durée respectée) : concat demuxer des mp3 → `full-audio.m4a` → durée ffprobe → `-loop 1 -i visual.png -t <durée>` + filtres : **waveform** `showwaves=s=1280x150:mode=cline:colors=0x<hex>` + `colorkey=black` + overlay bas ; **titre** `drawtext=textfile=title.txt:fontfile='C\\:/Windows/Fonts/arialbd.ttf'` (textfile = zéro échappement) 1-8 s ; **glitch** `rgbashift=rh=9:bv=-9:enable='lt(mod(t,12),0.28)'` (effet « bug » cyberpunk sans Remotion) ; **CTA** = même séquence PNG Remotion `CtaTopRight` que les autres machines.
- **Régé non destructive** : `regenPair` garde les anciennes pistes si la nouvelle génération échoue ; `regenVisual` réécrit le prompt via observation.
- **Nouveaux mécanismes génériques (remontés dans le squelette)** : `patchStock` (archived/posted, onglet Archives), `strandedRuns()` + cron « Sauvetage » serveur (5 min, Telegram), tâches `machineId+runId` cliquables → wizard, `producedThemes()` (idée jamais reproduite), `google.youtubeUpload` (résumable par chunks 8 Mo + erreurs lisibles — le scope `youtube.upload` MANQUAIT dans SCOPES, cause du « post YouTube ne fonctionne pas » ; reconnecter les chaînes), catégorie YouTube 10 (Musique) vs 27 (Éducation).
- **Pièges** : `card()` de `/api/machines` supposait `characters[]` (musique a `styles[]`) ; réglette musiques step=2 obligatoire ; showwaves rend sur fond noir → colorkey obligatoire avant overlay ; **le nom du champ coffre est `kie`** (pas `kie_api_key`).
- **⚠ PIÈGE CRITIQUE spawn (3 gels identiques avant diagnostic)** : `spawn("npx remotion render …")` SANS lecteur sur **stdout** → Remotion y écrit sa progression, le tampon du pipe (64 Ko) se remplit vers la frame ~900 et le rendu SE FIGE en écriture (pre-encode.mp4 gelé au même octet à chaque fois). TOUJOURS `child.stdout.on("data", …)` (au minimum un drain vide) sur tout process long spawné avec `stdio` par défaut. Bonus : parser `Rendered X/Y` pour la progression de la tâche.
- **Montage musique = compo Remotion complète `MusiqueMontage`** (image + waveform + CTA + effets rendus en MP4 direct — pas de gel car AUCUNE vidéo décodée, juste une image + audio). **Waveform PRÉCALCULÉE côté Node** (FFT offline 64 bandes → JSON base64, `computeWaveformData`) : `useWindowedAudioData` n'est pas fiable sur un long fichier et exige du WAV ; le JSON statique rend le rendu déterministe. Audio final : `<Audio>` CŒUR de remotion (pas @remotion/media) sur le WAV concaténé.
- **Vision vidéo = INUTILE pour une niche musique** (réponses vides/hallucinées sur des mixes de 2 h, transcripts sans parole payés pour rien). Le visuel d'un mix EST sa miniature : `analyzeThumbs()` = UNE requête OpenRouter multimodale sur les IMAGES des miniatures (image_url) → codes visuels fiables (a identifié « anime hard-SF GitS/Akira, cel-shading » du premier coup), stockés dans `style.visualCodes` + miniatures top-vues en **références i2i** du visuel/miniature.
- **Publier 400 « invalid video keywords »** : YouTube compte **+2 caractères (guillemets) pour CHAQUE tag contenant un espace** → une liste ≤ 500 « bruts » dépasse la limite réelle. `sanitizeYtTags` (google.js) : strip `<>`, tag ≤ 100 car., total pondéré ≤ 470, appliqué à tout upload.
- **Telegram interactif** : `sendWithButtons` (inline_keyboard) + `startCallbackLoop` (long-poll getUpdates timeout=50, un seul consommateur) → le cron Sauvetage envoie ✅ Reprendre / ❌ Ignorer, le clic déclenche `resumeRun` côté serveur. `resumeRun` de TOUTES les machines refuse si un `advance()` est déjà actif (anti double-lancement, protège aussi le bouton ⚡).
- **Miniature (régé)** : le prompt de régé DOIT réinjecter le THÈME du run + les situations des scènes comme noyau dur (sinon Claude change de sujet) — l'observation utilisateur passe en « PRIORITÉ ABSOLUE ».
- **Analytics YouTube** : ~48 h de retard + les vues peuvent être antérieures à la fenêtre → défaut « Depuis la création » et message explicite, jamais un « ça ne marche pas ».

## Round transverse « commandes sans wizard » (28 juillet 2026)

Mécanismes GÉNÉRIQUES à donner à toute nouvelle machine (copiés des 3 existantes) :
- **`orderRun({publishChannelId, publishPrivacy, publish, overrides, theme})`** : clone les params du run le plus récent (le « modèle »), applique les overrides, thème imposé ou `suggestTheme()`, mode auto, `allowNoPublish: !publish` (une commande « vers stock » passe outre l'autoPublish de la config — sinon createRun jette). Sert au restock ET au calendrier de publication (`lib/schedule.js`).
- **`suggestThemes(n, opts)`** : N idées en UN appel avec règle « RADICALEMENT différentes entre elles ET des idées produites » (jamais deux variantes d'une même famille — train après avion interdit).
- Routes génériques : `GET /order-info` (params du dernier run + persos/styles pour le mini-wizard), `POST /ideas`, stock `GET/PATCH/publish` via le map MACHINES.
- **PIÈGE suivi** : `listRuns()` renvoie des résumés SANS `published` → tout suivi externe (événements du calendrier) se base sur `run.status` (`done|failed`).
- **PIÈGE feedback** : orderRun met 2-4 min (thème) avant de créer le run → toujours créer une tâche visible immédiatement, la supprimer quand le run démarre.
- **Défaut « privée » PARTOUT** dans les UI de publication (un select sur « publique » = vidéo publique accidentelle, vécu).

## Round transverse « prompts refusés / modèle CLI » (2 septembre 2026)

Déclencheur : run POV `pmtjum6ah` bloqué sur 1 image/125 — Kie renvoie « your prompt was flagged by website as violating content policies » (adolescent fouetté au poteau). `genWithRetry` rejouait 3× LE MÊME prompt, la deuxième vague aussi, et la reprise ⚡ aussi : un refus de modération est DÉTERMINISTE, réessayer à l'identique ne sert à rien.

- **Adapter le prompt, pas seulement réessayer** (fait dans `pov.js`, à porter dans les autres machines qui ont le même `genWithRetry`) : `isPolicyError(msg)` (flagged | content polic | violat | sensitive | moderat | nsfw | safety | inappropriate | prohibit | unsafe | harmful | censor) → `adaptScenePrompt(run, scene, reason)` réécrit `scene.scene` via Claude (même moment, version IMPLICITE : instant d'avant/après, plan de réaction, objet symbolique, mots bloqués bannis, jamais child/boy + punition) et on repart **immédiatement** avec le nouveau prompt (pas de compte d'essai). Max `MAX_REWRITES = 3`, historique dans `scene.promptHistory[]`, compteur `scene.rewrites`.
- Échec répété SANS motif de modération → même fonction en mode « simplifier » (2 personnages max, une action, décor simple), déclenchée avant la deuxième vague et à la reprise ⚡ via `scene.lastError` (posé par `stepImages` et `resumeRun` ; `genWithRetry` le consomme).
- Le ↻ manuel (`regenScene`) fait la même chose sur refus de modération : réécriture + 1 nouvel essai, toujours non destructif.
- **PIÈGE CLI (silencieux et global)** : le modèle par défaut de `~/.claude/settings.json` (« fable[1m] ») est inconnu du CLI installé sur le PATH (2.1.158) → `claude -p` répond `is_error` 404 « There's an issue with the selected model » et TOUTES les machines dont `promptModel` est vide échouent. `claude.ask` a maintenant un repli mémorisé (`state.modelFallback = "opus"`, `isModelError`) : un modèle refusé n'est plus retenté jusqu'au redémarrage. Alternative durable : mettre le CLI global à jour ou renseigner `promptModel` dans la config machine.

---

## #4 — Wealth (`wealth`) — 22 septembre 2026

Vidéos « faceless » de la niche richesse/patrimoine (mansions, fortunes, luxe face aux catastrophes : érosion, ouragans, glissements, assurances qui se retirent). **Première machine multi-sources** : b-roll Pexels (vidéos + photos) + rendus IA Kie + motion design Remotion + **avatar IA en lipsync** (intro, CTA, moments clés) + voix off + musique Suno. `lib/machines/wealth.js` + `public/js/pages/wealth.js` + `remotion/src/WealthMotion.tsx` + `lib/pexels.js` + `lib/lab.js`. Recette : `docs/RECETTE-NICHE-WEALTH.md`. Manifeste d'export : `lib/machines/wealth.export.json`.

### Coutures de niche (le 10 %)
- **Input / noyau dur = l'avatar** (onglet « Avatars ») : `{name, sex, appearance (EN), referenceRel (16:9 tête/buste face caméra), refUrl/refSrc}` — même mécanique que les personnages Linguistique (✨ fiche Claude → 🎨 référence Kie t2i → upload public mémorisé). Le run choisit `avatarId` (ou « sans avatar » = ni intro face caméra ni CTA).
- **Recette** : `coreRules` (documentaire chiffré, 2-4 chiffres / 100 mots, ton direct, phrases-ponts, hook = image choc + chiffre + promesse) + `storyRecipe` (hook → sections « point » à beat unique → CTA après la section réglée → conclusion). L'outline fixe par section : titre de carte, faits, **chiffre-clé** (`keyStat`), `avatar: true` sur les N sections les plus fortes.
- **Plan visuel (`planVisuals`)** : scènes de 3 natures — `card` (carte de titre 3 s prise sur la narration, comme la pyramide POV), `avatar` (fusion des premiers plans de la section jusqu'à ~12 s ; hook entier jusqu'à 40 s ; CTA entier), `shot` (plan à visuel décidé ensuite). Découpage sur le sens (`buildShots` de POV/Stickman), cible 4 s.
- **Direction visuelle par plan (`stepPrompts`)** : Claude rend `visual` ∈ broll | ai | motion + `desc` EN + **3 requêtes Pexels de 2-4 mots à noms concrets** (jamais d'abstraction, de nom propre ni de chiffre) + `camera` + `motion` {stat|list|quote} + `lower` (bandeau). `rebalance()` impose ensuite la **parité b-roll/IA** et le **% motion** réglés : le modèle propose, la machine dispose (aiScore pour promouvoir en IA).
- **Assets tout en parallèle (`stepAssets`)** : Pexels (score durée ≥ plan / paysage / 1920 ou 1280, dédoublonnage par run, repli photo puis IA), Kie t2i (prompts adaptés en cas de refus, mécanisme POV), **Remotion en UNE passe** pour toutes les cartes (+ une séquence PNG unique pour tous les bandeaux, chaque bandeau connaît son `start_number`), lipsync FAL (tranche audio exacte de `vo.mp3` → clip image fixe à cette durée → upload → `veed/lipsync` → normalisation muette + `tpad` clone), Suno lancé au début et collecté avant le montage.
- **Montage (`renderMontage`)** : un clip normalisé par scène (1920×1080, 30 fps, timescale 15360, `-frames:v` exact) ; **zoompan sur vidéo ET image** (`d=1` pour la vidéo après `fps=30` + pré-scale 2304×1296 ; `d=frames` pour l'image après scale ×2) avec 4 mouvements alternés zoom+ / pan→ / zoom− / pan← ; `-stream_loop -1` si le b-roll est plus court ; concat ; garde de durée (±2,5 s vs voix) ; piste audio = voix + musique en boucle (`amix duration=first`) ; overlays bandeaux + bouton CTA (`CtaTopRight`) en une passe ; sous-titres optionnels ; `-t voDuration`.
- **Packaging** : titre chiffre + lieu + chute ; description avec disclaimer « stock + IA » ; miniature i2i ancrée sur les miniatures concurrentes top-vues (mécanisme POV).
- **Frontend** : 5 onglets (Générer / Runs / Stock / **Avatars** / Paramètres) ; inputs indispensables = sujet (+💡), avatar, langue/voix, durée ; réguliers = parité b-roll/IA, % motion, passages avatar, intro face caméra, musique, sous-titres, mode, publication. Paramètres = tous les chiffres de la niche + effets (zoom/pan/amplitude) + thème motion (4 couleurs) + style IA + moteur de voix + modèle de lipsync.

### Mécanismes GÉNÉRIQUES nés ici (→ squelette)
- **`lib/lab.js` — Labo de niche** : scan COMPLET d'une chaîne via l'API Data (playlist uploads → videos.list, 1 unité / 50 vidéos, jamais limité par IP), yt-dlp uniquement pour sous-titres auto (json3 mot-à-mot) et téléchargement 480p, coupes FFmpeg (`select=gt(scene,0.28)`), 1 image / 2 s horodatée, **Qwen 3.7 Flash par paquets de 60 s (30 images)** → plans jointifs {kind, camera, desc, text, overlay, pexels, palette}, stats (plans/min, médiane, parts stock/IA/motion/avatar, mouvements), synthèse narrative Qwen 3.7 Plus ; miroir dans `data/scrap/*` + `bank.niches` → `bank.inspiration()` marche tel quel. **~1 centime par vidéo de 20 min.** CLI `scripts/niche-lab.js`, routes `/api/lab/*`, `nicheDigest()` = l'agrégat qui sert à écrire la recette.
- **`lib/pexels.js`** : transport Pexels sérialisé (≥ 400 ms, quota 200/h), `pickVideoFile` (mp4 ≤ 1920, fps 23-60), `scoreVideo(video, wantSec)`.
- **Motion design en une passe Remotion** : une compo `<Sequence>` par carte + `calculateMetadata` = somme des durées → 1 bundle par run au lieu de N (le bundling webpack est le coût, pas le rendu) ; découpe FFmpeg par `-ss/-frames:v`. Bandeaux transparents : même compo avec `transparent: true` en `--sequence --image-format=png`, un seul dossier, `-start_number` par bandeau.
- **Zoompan sur vidéo** (`d=1` après `fps=30`) : Ken Burns sur du b-roll sans changer de taille de frame à la volée (le `scale` animé + `crop` casse sur beaucoup de filtres).
- **Avatar lipsync sur une tranche exacte de la voix off** (pas une resynthèse) : la voix reste identique entre b-roll et avatar, la durée est garantie par `-t` + `tpad` + `-frames:v`.

### Pièges rencontrés
- **YouTube 403 sur les flux média** avec le client web de yt-dlp (métadonnées et sous-titres passent) → `--extractor-args youtube:player_client=android`. Une rafale de ~60 appels yt-dlp en parallèle a déclenché ~20 min de 429 « not a bot » → appels sérialisés + backoff 2/4/8 min.
- **Le premier tri de chaînes par « ce que je pense que la niche est » était faux** (finance/mindset au lieu de mansions vs nature) : la liste de chaînes de l'utilisateur est la seule source de vérité ; la découverte automatique ne sert qu'à compléter.
- `yt-dlp --download-sections` fait planter le ffmpeg de yt-dlp sur ce PC (code 3436169992) : télécharger entier en 480p, c'est plus fiable et ça reste petit.
- Le serveur marque « échouées » au boot les tâches `running` sans `runId` (sweepOrphans) : une tâche de scan longue lancée en CLI pendant un redémarrage reste affichée en échec (cosmétique — le scan continue).
- Heredocs bash avec du JS contenant des backticks/backslashes : illisibles par le tool → écrire le patch dans un fichier `.py` et l'exécuter.

### Raffinements (même session — retours d'Alex sur la 1re vidéo)
- **Avatar ≤ 10 s par passage, hook et CTA compris** (`avatarSeconds` 10, borné à 10 dans `planVisuals`) : `avatarCut()` coupe sur une fin de phrase/virgule entre 55 % et 100 % du plafond, le reste du segment redevient des plans ; le CTA est réécrit en ≤ 25 mots pour tenir dans le plafond. Leçon : un « présentateur » de 44 s au hook tue le rythme d'une niche à 10 plans/min.
- **Référence d'avatar en décor pro** (bureau, baie vitrée, bibliothèque, lampes chaudes, f/2) au lieu du fond uni : même cadrage tête/buste (le lipsync veed s'en accommode), rendu nettement plus crédible.
- **Motion design « enquête »** : `dossier` (chemise CONFIDENTIAL qui glisse, photo agrafée qui tombe, fiche dactylographiée en typewriter, tampon rouge qui claque) et `compare` (avant/après côte à côte, balayage doré). Les cartes reçoivent des IMAGES : photos Pexels vérifiées (ou IA en repli) copiées dans `remotion/public/<run>/` et passées par `dir` + `staticFile` — même mécanique que les cartes de la pyramide POV. Un plan motion doit durer ≥ 4 s.
- **Boucle de vérification des b-roll (`verifyClip`)** : 3 images du clip (début/milieu/fin) notées 0-10 par Qwen 3.7 Flash face à `desc` + `say` ; < 6 = rejet (hors sujet, texte/logo/watermark, portrait, personne qui parle en gros plan) → candidat suivant (3 par requête), requête suivante, photo, puis IA ; on garde le meilleur candidat ≥ 4 si rien ne passe. ~0,001 $ par vérification, `run.cost.check`. Score et essais affichés dans l'onglet Assets. Générique : à porter sur toute machine qui prend du stock.
- **Textes incrustés = code n°1 de la niche** (46 % des plans chez les concurrents) : `kicker` (chiffre choc / aphorisme en capitales, centré, bande sombre), `lower` (bandeau lieu/date), `headline` (manchette presse + source) — une seule séquence PNG transparente par run, `start_number` par overlay. Plafond `overlayPct`, jamais > 2 consécutifs.

### ⚠ PIÈGE GÉNÉRIQUE découvert ici — Inworld renvoie du WAV sous une extension .mp3
`fal-ai/inworld-tts` livre du **PCM 16 bits 48 kHz mono** (96 ko/s) dans un fichier nommé `.mp3`. Tant que le texte dépasse le seuil de découpage (1900 car.), le fichier passe par le concat demuxer avec `-c:a libmp3lame` et devient un vrai mp3 — le bug reste invisible. Mais un bloc **court** (une section de hook, une conclusion, un CTA) tient en UN morceau et l'ancien code le copiait tel quel (`fs.copyFileSync`). Le concat final mélange alors WAV et MP3 : le démuxeur prend le format du premier fichier et **jette la moitié de la voix** (vécu : 209 s assemblées pour 439 s de sections → Whisper ne transcrit qu'un tiers du script → le découpage produit des plans de 43 s → vidéo inregardable, sans aucun message d'erreur).
- **Correctif** : ré-encoder en mp3 **systématiquement**, même pour un seul morceau (`-c:a libmp3lame -b:a 192k -ar 48000 -ac 1`, aucun trim, aucun filtre — la règle « on ne touche jamais à l'audio TTS » est respectée : on ne change que le codec). Appliqué à `wealth.js`, **et corrigé en préventif dans `pov.js` et `stickman.js`** qui avaient le même `if (files.length === 1) copyFileSync`.
- **Garde ajoutée** : après le concat, `|voDuration − Σ durées des segments| > 3 s` ⇒ on lève une erreur explicite au lieu de continuer. Un audio incohérent doit exploser à l'étape voix, jamais deux étapes plus loin.
- **Filet complémentaire** : tout plan de plus de `SHOT_MAX × 1,6` est redécoupé à l'horloge (un trou de transcript ne peut plus produire un plan de 40 s).

### ⚠ Claude CLI : limite de session en plein run → moteur de texte par défaut = Qwen
Un run de 20 min fait ~15 appels longs à Claude ; le quota de session Claude Code s'est épuisé à l'étape « plans visuels » (`You've hit your session limit · resets 6:20pm`) et le run est mort à 60 %. `genJson` de Wealth passe désormais par **`lib/llm.js` (Qwen 3.7 Plus via OpenRouter)** avec repli Claude automatique, et un réglage `textEngine` (qwen | claude) dans l'UI. ~0,01 $ par run au lieu du quota Claude. À faire sur toute machine longue.

### Débit réel du TTS ≠ débit de la niche
La niche lit à **172 mots/min**, Inworld à **~140**. Dimensionner le script sur le débit de la niche donne des vidéos 20 % trop longues. `scriptWpm()` utilise `settings.measuredWpm`, **auto-mesuré à chaque run** (moyenne glissante 60/40 sur le rapport mots/durée des sections) ; `wpm` ne sert plus que de repère de niche dans l'UI.

### Miniatures : reproduire le code d'une niche = image SANS texte + bandeau composé (jamais le modèle d'image)
Demande d'Alex : « au niveau des miniatures je veux vraiment que ce soit semblable aux concurrents ». En regardant **les vraies miniatures** (fichiers déjà téléchargés par le scraping dans `output/scraping/<chaîne>/`, assemblés en planche-contact) au lieu de se fier aux synthèses textuelles, le code s'est révélé très différent de ce que j'avais supposé (« zéro texte ») :
- fond = **vue aérienne drone** photoréaliste d'une propriété de luxe en péril, ciel de tempête ;
- **bandeau « BREAKING » incrusté en bas à gauche** : étiquette rouge + LIEU en noir sur blanc, puis 2-3 mots en noir ultra-gras condensé (Impact) sur blanc.
Leçon générique : **toujours ouvrir les miniatures concurrentes en image avant d'écrire le prompt de miniature** ; une synthèse écrite par un modèle passe à côté d'un code aussi visuel. Et **ne jamais demander le texte au générateur d'image** : on génère le fond sans texte (en réservant une zone calme pour le bandeau), puis on compose le texte avec une composition Remotion rendue par `npx remotion still` (`WealthThumb`). Bonus : le bandeau se re-compose seul (route `thumb-text`, champs LIEU + GROS TITRE dans l'écran Fini) sans repayer l'image.
Piège de sélection des références i2i : le « top vues » de la banque peut être trusté par des chaînes d'un AUTRE format (ici les chaînes météo à 1,8 M de vues). Filtrer les références sur la signature du format (ici : un montant en dollars + un verbe de chute dans le titre).

### La boucle de vérification doit pouvoir CORRIGER, pas seulement rejeter
Première version : le vérificateur notait les clips et, si rien ne passait, on basculait en rendu IA. En production, deux causes de rejet en masse sont apparues — et aucune ne venait de la banque d'images :
1. **Requêtes abstraites.** Le rédacteur produit « luxury construction cost », « high end real estate », « insurance exodus » : aucune banque n'a filmé ça, les 8 candidats sont notés 1 à 3, et on paie 8 vérifications pour finir en IA. Qwen y est plus sujet que Claude. Correctif : prompt durci (liste noire explicite de mots abstraits + exemples de reformulation) **et** `rewriteQueries()` — quand rien ne passe, on redemande 3 requêtes en donnant *les raisons de rejet*, puis on refait un tour (une seule fois).
2. **Plans « motion » rétrogradés.** `rebalance()` ramène les cartes en trop vers le b-roll, mais elles gardaient leur description de carte : le plan partait chercher « Full-screen stat graphic displaying ». Correctif : à la rétrogradation, on efface `motion`, `queries` et on pose `needsQueries` ; `fetchBroll` fait alors réécrire les requêtes avant de chercher.
Règle : **tout garde-fou qui ne sait que refuser finit par coûter plus cher que pas de garde-fou du tout.** Lui donner un chemin de correction (réécrire l'entrée) avant le repli coûteux.

### Bilan du Labo sur la niche Wealth (chiffres de référence pour la prochaine machine)
13 chaînes, **3 h 32 de traitement, 0,92 $** : 370 vidéos listées via l'API Data, **48 téléchargées en 480p et décortiquées image par image** (9 744 plans, 146 000 mots de transcript), 42 avec synthèse narrative. Soit **~0,02 $ et ~4 min par vidéo de 20 min**, en 2 chaînes parallèles et 5 paquets d'images simultanés. C'est l'ordre de grandeur à annoncer pour toute nouvelle niche : une banque exploitable coûte moins d'un dollar et tient dans une demi-journée de fond de tâche.
Ce que la data a corrigé par rapport à l'intuition, sur cette niche : le rythme réel (10,8 plans/min, médiane 5 s) est deux fois plus rapide qu'un découpage « sur les phrases » ; le texte incrusté est sur **53 %** des plans (on l'avait sous-estimé à 15 %) ; et les miniatures suivent un gabarit de chaîne d'info que seule l'observation des IMAGES révèle. Trois réglages par défaut sur quatre ont été changés après le scan.

### Fourniture d'une machine à un autre Agent OS : dépôt + installateur, pas un zip
Livré `wealth-machine/` : un dépôt git autonome avec `files/` (les fichiers aux chemins du projet), `server-routes.snippet.js`, les exemples d'images, un README orienté utilisateur et surtout **`install.js`** qui pose lui-même tous les points de branchement (`require`, table `MACHINES`, `card()`, alternatives de routes génériques `(timetravel|…)`, bloc de routes, `sweepRuns`/`strandedRuns`, `<script>` de la page, tableau de `core.js`, carte du hub, imports et `<Composition>` de `Root.tsx`).
Trois propriétés à reproduire : **idempotent** (chaque insertion est détectée avant d'être faite — testé en relançant deux fois : aucun doublon), **sauvegarde** `.bak-wealth` à la première modification de chaque fichier, et **pas de devinette** : une ancre absente n'est jamais « approchée », elle est signalée dans un récapitulatif « à faire à la main ». Tester l'installateur sur un bac à sable reconstruit depuis les `.bak` d'avant la machine, puis vérifier `node --check` sur chaque fichier patché.

---

## #5 — Data Ranking (`datarank`) — 24-25 septembre 2026

Carrousels « data ranking » (List Data, Nerd Cassette, Aesthetic Data, okz data point, Rank India, Country Cassette…) : une rangée de cartes verticales (rang, nom, image, pays + drapeau, grosse valeur) qui défile de droite à gauche en ordre croissant, petite intro, **voix off calée carte par carte sur le défilement**. `lib/machines/datarank.js` + `public/js/pages/datarank.js` + `remotion/src/DataCarousel.tsx` (`DataCarousel` + `DataThumb`) + `scripts/datarank.js` (CLI) + `scripts/carousel-lab.js` (analyse dédiée). Recette : `docs/RECETTE-NICHE-DATARANK.md`.

### Coutures de niche
- **Entrées = sujet + durée** (+ voix, modèle d'image). Pas de personnage : le « noyau dur » est le JEU DE DONNÉES vérifié.
- **Deux formats décidés par le LLM** : `ranking` (valeur chiffrée, ordre croissant, compte à rebours) et `catalog` (« X From Different Countries », la famille la plus vue : un élément par pays, sans valeur, tour du monde par continent, rang masqué). Style d'image `photo` (détourages ancrés photo) ou `illustration` (cartoon plein cadre sur fond vif).
- **Montage 100 % Remotion en une passe** (images seules, ~1,3 min de rendu par minute de vidéo) : caméra linéaire entre les DÉBUTS de phrases → vitesse quasi constante (le format de la niche) ET la carte commentée arrive au point focal quand sa phrase commence (surlignage + valeur qui « claque »).

### Mécanismes GÉNÉRIQUES nés ici (→ squelette)
- **Recherche ancrée Wikipédia** (`gatherSources`) : le LLM propose les articles « List of… », on extrait le TEXTE DES TABLEAUX (REST `page/html` → lignes « a | b | c », ≤ 90 k car.) et on construit les données À PARTIR de la source (`fromSource`). Sans ça, la mémoire du LLM donnait des « plus hauts bâtiments » périmés (Mexique, Turquie, Canada…) et oubliait Taipei 101. Titres proposés par le LLM AVANT la recherche plein texte (qui ramenait « List of tallest buildings in Miami »).
- **Recoupement Wikidata** (propriété choisie par le LLM, ex. P2048) : confirme les valeurs ; une valeur issue de la source n'est jamais « corrigée » par Wikidata (qui inclut parfois l'antenne).
- **Relecteur de données** : corrige, REMPLACE (« pas le record de son pays ») et AJOUTE les manquants ; reçoit la description Wikipédia de chaque article → repère les homonymes (le « Palais Royale » de Toronto, salle de danse, pour la tour de Mumbai). Exclut ce qui n'existe pas encore (train mis en service en 2027).
- **Script doctor contraint** : ne corrige QUE les contradictions entre cartes, les fragments sans verbe, les métadonnées lues telles quelles, les jalons au mauvais rang. Un doctor libre « améliore » les verbes et supprime des faits exacts (vécu).
- **Débit réel par voix Inworld** : 20 voix mesurées (Oliver 158, Craig 147… Graham 109 mots/min sur une phrase courte ; −15 % sur un vrai script) ; `pace[voice]` auto-mesuré et mémorisé à chaque run → le nombre de cartes se dimensionne dessus. **Garde de durée à deux sens** : trop long → retrait des cartes du bas sans refaire la voix ; trop court → ajout de cartes de RÉSERVE déjà vérifiées (phrase + TTS) au début du carrousel. Graham avait donné 7 min 38 pour 5 min visées.
- **Voix phrase par phrase** : une phrase TTS par carte (durées réelles) → timeline → une piste unique (silences + WAV concaténés, aucun filtre) → sync parfaite sans Whisper. Fichiers nommés par RANG (pas par position : un retrait de carte décalerait tout) ; `resetFrom(script|voice)` VIDE le cache voix.
- **Contrôle d'image à 3 questions** (Qwen Flash) : fidélité à la référence, PLAUSIBILITÉ vs la valeur (« une tour de 320 m, pas une maison »), et la référence elle-même est-elle bonne (`refOk`). On n'abandonne la référence que si elle est fausse ; repli photo Wikipédia si aucune génération ≥ 6/10.
- **Format de génération selon la silhouette** (`shape` tall/wide/square → 2:3 / 3:2 / 1:1) : tout générer en 2:3 rendait les trains minuscules.
- **Telegram** : `telegram.sendFile(kind, file, caption)` (multipart, limite bot 50 Mo) + version 720p auto (crf 26→29→32).

### Pièges rencontrés
- **Filtre de contenu d'Alibaba (fournisseur de Qwen)** : « data_inspection_failed — Input image data may contain inappropriate content » sur des images anodines — le drapeau de TAÏWAN. Le contrôle passe image par image en repli, l'image bloquée est « non contrôlable », jamais bloquante. `lab.askVision` remonte désormais `error.metadata.raw` (la vraie cause était cachée derrière « Provider returned error »).
- Qwen note parfois sur 100 au lieu de 10 → normaliser.
- yt-dlp : l'endpoint des SOUS-TITRES (timedtext) est le premier à prendre des 429 ; le Labo faisait 4 essais avec pauses de 2-4-8 min sur chacun → 1 seul essai puis repli Apify ; téléchargement en `player_client=android` SEUL (tv_simply/mweb déclenchaient aussi des 429).
- Heredoc bash avec JS (backticks, `\`) : écrire le patch en `.py` (déjà noté sur Wealth, revécu).
- Le journal d'un run n'était écrit qu'en fin d'étape → `log()` persiste à chaque ligne (l'UI suit l'étape en cours).

### Distribution (25 septembre 2026) — dépôt public `Alex-sia99/datarank-machine`
Même format que `wealth-machine` (`files/` aux chemins du projet + `install.js` idempotent avec `.bak-datarank` + `server-routes.snippet.js`), avec trois ajouts à reproduire :
- **`if-missing/`** : les modules de socle récents (`llm.js`) ne sont copiés QUE s'ils manquent — on ne remplace jamais le socle d'un élève.
- **`INSTALL-LLM.md` + `AGENTS.md`/`CLAUDE.md` à la racine** : guide écrit POUR l'assistant de l'élève (simulation, installation, vérifications chiffrées, branchements manuels exacts, clés à demander, dépannage, désinstallation). Une phrase suffit à l'élève : « installe en suivant INSTALL-LLM.md ».
- **Banque embarquée** (`datarank-niche.json`, 250 titres publics) : le bouton 💡 marche avant que l'élève n'ait lancé le Labo.
Testé sur un bac à sable reconstruit depuis `git show HEAD:` (OS d'avant la machine, sans `llm.js`) : installation complète sans action manuelle, 2e passe sans aucun changement, `npx remotion compositions` OK, serveur démarré et routes interrogées.
⚠ **Auteur des commits publics : l'adresse noreply GitHub du compte** (`<id>+<pseudo>@users.noreply.github.com`, réglages GitHub → Emails), jamais l'e-mail personnel — vérifier `git log --format=%ae` avant de pousser. Le contact envoyé à Wikipédia (User-Agent) passe par `WIKI_CONTACT`, défaut = l'URL du dépôt.

---

## Distribution POV (2 novembre 2026) — dépôt public `Alex-sia99/pov-machine`
La machine POV (n°7, août 2026, clonée de `stickman.js`) est distribuée dans le format wealth/datarank : `files/` aux chemins du projet, `if-missing/` (`StickmanCta.tsx`, partagé avec Stickman : copié seulement s'il manque), `install.js` idempotent (`.bak-pov`), `server-routes.snippet.js`, `INSTALL-LLM.md` + `AGENTS.md`/`CLAUDE.md`, `docs/` (vraies images d'un run : pyramide, cartes, scènes, CTA, 3 miniatures).
- **Ce qui est retiré du pack (jamais du code d'Alex)** : l'option « Poster sur VPS » (Bunny Storage) — `lib/bunny.js`, `lib/vps-delivery.js`, `test/pov-vps.test.js`, les routes `/vps-channels` et `/runs/:id/vps(-status)`, les réglages `vps*`, les identifiants des chaînes. Le retrait est fait par **`agent-os/scripts/build-pov-pack.js`** : remplacements EXACTS (chaque ancre doit matcher une fois, tout résidu `vps|bunny` fait échouer le script). Pour mettre le pack à jour quand `pov.js` évolue : rejouer le script, jamais patcher le pack à la main.
- **Installateur insensible aux fins de ligne** : les fichiers d'un Agent OS Windows sont en CRLF ; l'ancre `require(...);\n` reprise de l'installateur datarank échouait dessus (révélé par le bac à sable `git archive`). Le pack POV normalise tout texte inséré sur l'EOL du fichier cible (`eolOf`/`withEol`) — à reporter dans les prochains installateurs (et à vérifier dans wealth/datarank si quelqu'un remonte le problème).
- Manifeste `pov.export.json` d'Alex : marqueur de fin périmé (`MACHINE Musique` alors que DATA RANKING suit le bloc POV depuis septembre) → corrigé en `MACHINE DATA RANKING`.
- Testé sur un bac à sable `git archive HEAD` (OS du 29/07, d'avant POV) : installation complète sans action manuelle, 2e passe sans aucun `✓`, `node --check` sur les 5 fichiers patchés, module chargé (`estimate` 25 min / 10 niveaux = 7,08 $), `npx remotion compositions` liste `PovPyramid` + `StickmanCta`. Le serveur du bac à sable n'a pas été démarré (l'Agent OS d'Alex occupait le port).

---

## Machine n°10 — « Docu Papier 2D » (27 novembre 2026) — `lib/machines/docu2d.js`
Documentaires animaliers papier découpé (Oceanverse / Depth Theory), banque « Docu Animaux 2D ». **Squelette Data Ranking**
(Remotion piloté par JSON) + ressource partagée façon Stickman (banque `cast2d` + bestiaire), PAS un clone Time Travel.
- **Nouveau mécanisme générique : le STORYBOARD typé ancré sur les MOTS.** Le LLM n'écrit jamais une coordonnée : des beats
  `{type, line, at:"mot"}` (cartes exclusives, étiquettes, scènes du monde). Le moteur (`remotion/src/Docu2D/timing.ts`)
  résout les temps, coupe une carte par la suivante, range les étiquettes dans des emplacements libres, fait sortir tout ce
  qui appartient à une carte AVEC elle. Un **vérificateur** (`scripts/d2-check.ts`, même code que le rendu) refuse :
  ancrage introuvable, carte < 1,6 s, étiquette < 1,3 s ou > 38 car., > 3 étiquettes simultanées, physique (pieds, sol,
  chevauchement, flottaison) image par image. Boucle LLM « corrige UNIQUEMENT ces anomalies » (≤ 4 essais) puis retrait
  des beats fautifs. Converge en 2 essais sur le buffle.
- **Relecture des faits** après le script : chaque réplique confrontée au registre (Wikipédia FR + EN par lien
  interlangue — jamais de recherche aveugle en anglais avec un sujet français) ; non sourcée → réécrite ou retirée.
  Sans elle, le LLM a inventé une charge de buffle sur un naturaliste de 1779 et un conseil de sécurité.
- **Voix** : `lib/docu2d/voice.js` (cache par réplique, resserrage avec fin de phrase à la vraie pause ≥ 0,13 s — jamais
  une occlusion de consonne —, fondus 10/12/60 ms) ; `pauseForTarget` règle les pauses pour viser la durée ; débit de
  parole mesuré et mémorisé par voix (`pace`).
- **Mix** : `lib/docu2d/mix.js` — musique Suno enchaînée sur elle-même (un morceau de 2 min ne couvre pas 10 min : bj-mix
  ne bouclait qu'une fois), contrôle d'écoute par transcription obligatoire.
- **Clé requise** : au moins Pixabay OU Pexels (refus à la création du run) ; coffre étendu (`pixabay`, `elevenlabs`).
- **Limites v1** : bestiaire 4 pattes (hippo, lion, éléphant, buffle, rhino, crocodile), monde savane ; presets de scène
  (canoe, night, gape, calf, under, sweat…) écrits pour l'hippopotame — à généraliser par famille.

### Machine n°10 — refonte du 27/11 soir (après « t'es parti en couille »)
- **Pièges CSS de l'UI des machines** (valables partout) : `.grid-4` N'EXISTAIT PAS dans `app.css` (les 4 champs s'empilaient en pleine largeur — Data Ranking avait le même défaut) → ajouté ; `label.field span { display:block }` casse toute `<span class="row">` placée dans un label (le 💡 passe SOUS le champ, les mentions muettes sautent à la ligne) → mettre l'input + bouton dans un `<div class="row">` hors du label ; l'attribut `hidden` sur un `label.field` est écrasé par `display:block` → basculer `style.display`.
- **Partir de l'UI Data Ranking** (form grid-4 + 2 `fbar` + prix vert + ligne pipeline ; wizard rail + Fini avec miniature à gauche, titre/description/tags + compteurs + 📋 + publication à droite) au lieu d'en écrire une à part.
- **Devis lisible** : une ligne « Devis : voix … · N images IA … · musique … » sous le bouton, recalculée à chaque option (pas seulement en infobulle) — Alex demande toujours « sur quoi tu te bases ».
- **Voix écoutable en entier** à l'étape Voix (mp3 complet monté sur la timeline), planche = vignettes 1 image / 3 s horodatées et cliquables (pas une planche 4×3 réduite).
- **Miniature IA au code de la niche** : i2i sur les 2 miniatures concurrentes les plus vues (Drive public) + texte posé par Remotion (accents justes, `*mot*` en rouge) plutôt que demandé au modèle d'image.
- **Ne jamais s'auto-interdire un outil** (images IA) qu'Alex n'a pas interdit.
