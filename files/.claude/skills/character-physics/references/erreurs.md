# Erreurs de corps déjà rencontrées (et ce qui les corrige)

Chaque ligne est un retour réel d'Alex ou un défaut trouvé par le vérificateur. Ajouter une ligne à chaque nouveau cas.

| Date | Symptôme | Cause | Correction durable |
|---|---|---|---|
| 2026-11-23 | jambes DANS un fauteuil | assise plus haute que la jambe (genou 0,44 m) | assise ≤ 0,43 m, meubles mesurés ; audit des membres |
| 2026-11-24 | mains qui traversent l'écran | doigts de 24,8 cm (pas 16), point de main dans un objet fin | bout des doigts depuis `joints`, test de TRAVERSÉE des segments |
| 2026-11-25 | bras pliés, mains « en vrille » au repos | cible du poignet trop haute ; torsion portée par le poignet | repos bras tendus ; l'avant-bras porte 65 % de la pronation |
| 2026-11-25 | main sur la poitrine à chaque « je » | règle de geste trop large | seulement sur « moi » |
| 2026-11-25 | bras croisés n'importe comment avec le café | objectifs de mains vers le côté opposé, tasse placée « au jugé » | prise construite depuis la tasse (`mugHands`), tasse au milieu des paumes résolues ; vérificateur : MAINS_TRAVERSEES / PRISE |
| 2026-11-25 | tasse dans le visage pendant la gorgée | cible hors de portée, contact bouche impossible à garantir | tasse montée sous le menton ; DANS_LA_TETE |
| 2026-11-25 | corps qui flotte sur le hamac | tissu rigide et plat en travers | corps posé par recherche + tissu creusé sous la silhouette (même fonction rendu / contrôle), en diagonale |
| 2026-11-25 | Claude « à côté de l'ordinateur » | aucune action de frappe, bras trop courts pour atteindre un clavier | `typing` + `claudeArmTips` ; NE_TRAVAILLE_PAS (orientation, distance, hauteur des bras / touches) |
| 2026-11-25 | décor photo qui jure avec le personnage | fond HDRI réel | monde 3D construit uniquement |
| 2026-11-25 | pieds DANS le tissu au bout du hamac | talons retirés des points contrôlés (« oubli ») ; bout du hamac en U, jambes tendues | TOUJOURS contrôler les extrémités (talons, orteils, chevilles) ; talons posés (le tissu cède ≤ 13 cm, le genou plie pour le reste), corps redescendu tant qu'un appui flotte |
| 2026-11-25 | dos qui creuse le tissu sous les cuisses / la nuque sous le crâne | empreinte = « segment le plus bas » ; modèle de creux le long de l'axe faux pour un corps en diagonale | empreinte 2D par segments (fond plat de la largeur du membre + remontée 3·d²), hauteur du segment le PLUS PROCHE |
