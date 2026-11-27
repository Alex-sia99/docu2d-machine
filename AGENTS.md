# Pour l'assistant IA

Ce dépôt est une machine (« Docu Papier 2D ») à installer dans un Agent OS existant.
Pour l'installer, suis **INSTALL-LLM.md** étape par étape (simulation, installation, vérifications, clés à demander).
Ne lis ni n'écris jamais de clé API : elles restent dans le coffre chiffré d'Agent OS (ou le `.env` racine de l'utilisateur).
Ne modifie pas `files/`, `if-missing/`, `docs/` ni `server-routes.snippet.js` à la main : ils sont régénérés depuis l'Agent OS de l'auteur par `agent-os/scripts/build-docu2d-pack.js`.
