# Checklist niche animaux — tout ce qu'Alex a refusé (à vérifier AVANT chaque envoi)

Chaque ligne vient d'un retour réel d'Alex (novembre 2026). Une vidéo ne part pas tant qu'une case n'est pas validée.

## Son et voix
- [ ] La voix off est **audible dans le fichier final** (transcription faster-whisper début / milieu / fin). Une v3 est partie muette le 26/11.
- [ ] La musique dure jusqu'au bout (fondu final), pas de raccord sec.

## Textes à l'écran
- [ ] Écriture en **≤ 0,3 s** (ou instantanée) : jamais un texte encore en train de s'écrire quand le plan change.
- [ ] Le texte apparaît sur le **premier mot** de la phrase qu'il résume, et reste **≥ 1,5 s** lisible avant la coupe (sinon on déplace la coupe).
- [ ] Les mots à l'écran = les mots de la voix (pas de paraphrase).
- [ ] Tout contenu dans un cadre/carte est **centré** dans son cadre (refus : « PAS DE CERVEAU » mal cadré).
- [ ] Lisible sur tous les fonds : sur ciel clair, sépia ou vidéo claire → bandeau sombre, texte sombre ou dégradé.
- [ ] Une légende qui nomme une **partie du corps** est posée SUR cette zone (trait de rappel si besoin) ; le dos se montre sur une silhouette **de dos** ; les symptômes non localisés vont en **colonne alignée** avec icônes (refus du 27/11 : schéma Irukandji « légendes aux mauvais endroits »).
- [ ] Vocabulaire juste : comparé à un requin ou un crocodile, on dit « le plus **dangereux** », pas « le plus venimeux ».

## Faits
- [ ] Aucun chiffre sans source dans le registre des faits (le « 1,5 m/s » de la v2 était sans source → retiré).
- [ ] Chaque chiffre « surprenant » relu sur la source primaire, pas seulement un résumé (Jelly8 : « 170 protéines toxiques » était en fait « 170 toxines **potentielles** » repérées dans les gènes → réplique refaite).
- [ ] Les incertitudes sont dites (« on dit », « personne ne sait »).

## Images et budget
- [ ] **Zéro vidéo IA** par défaut ; image IA seulement si vraiment rien n'existe. Pas de 2K/1080p IA non demandé.
- [ ] B-roll réel **générique** (« une méduse », pas forcément l'espèce exacte), crédit en petit en bas à gauche ; viser **≈ 12 %** de réel (Alex : « t'aurais pu utiliser davantage de b-roll ») — **mesuré** avant rendu (`npx tsx scripts/j8-broll.ts` depuis `remotion/` pour Jelly8 : 8,6 % → 12,1 %).
- [ ] **Pas de fair use** (décision du 27/11). Sources libres : Pexels, Pixabay, Wikimedia Commons, NASA, Internet Archive (organismes publics seulement : la licence y est déclarée par l'uploader), YouTube Creative Commons, Openverse → `node scripts/pexels-scout.js <dossier> --src libre "…"` ; crédits dans `credits.json`, bloc description par `--credits`. Une vraie image de l'espèce en licence libre vaut mieux qu'une autre espèce (Jelly8 : vraie Irukandji, Courtney et al. 2015, CC BY 4.0).
- [ ] Fin : commentaire qui s'écrit/s'efface avec plusieurs créatures, assez long.

## Physique et logique (retour du 26/11 sur la v 2D)
- [ ] « Jusqu'à la taille » = l'eau est **à la taille**, pas aux épaules.
- [ ] Aucune tête sous l'eau (sauf plongée assumée) ; la petite fille secourue a la tête hors de l'eau.
- [ ] **Pieds sur le sol / le fond** pour tout personnage debout ; aucun personnage ne flotte.
- [ ] **Échelle réelle** des objets (une bouteille de vinaigre ≈ 17 % de la taille d'un adulte, pas un torse).
- [ ] Objet tenu = dans la main ; objet posé = sur son support (refus : bocaux qui flottent au-dessus du bureau).
- [ ] Gestes logiques : un massage cardiaque = à genoux à côté de la victime, bras tendus, mains sur le sternum (refus : père accroupi au-dessus d'elle).
- [ ] **Marche** : un personnage qui se déplace est de **profil** avec le vrai cycle (`walkSide` / `mover` de `cast2d/walk.ts`) : pied d'appui fixe, bras opposés, bassin qui monte et descend ; **jamais de face en glissant ni jambes croisées** (refus du 27/11 : « je refuse que mes personnes marchent comme ça »). Le vérificateur le refuse désormais (règles « marche », « jambes », « glisse »).
- [ ] Contrôle automatique : `npx tsx scripts/j8-physics.ts` (Jelly8, 30 i/s) → **0 anomalie** avant tout rendu, PUIS relecture image par image avec cette grille.

## Livraison
- [ ] Marque de TA chaîne partout (réglage « Marque » de la machine, fin de description).
- [ ] Archive 1080p + version Telegram, légende qui dit ce qui a changé.
