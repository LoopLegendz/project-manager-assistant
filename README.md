# Assistant chef de projet — application web locale

## Lancement (point d'entrée unique)

```powershell
cd "C:\Users\vissartel\Agent Project Manager\Project Manager Assistant\assistant-cdp"
.\start.ps1
```

→ toujours **http://127.0.0.1:8000/** (le script libère les ports 8000-8004 en ne tuant que les
PID qui écoutent dessus, puis démarre uvicorn sur le port 8000).

Règle pour tester les évolutions :
- changement front (HTML/CSS/JS dans `app/static/`) → **F5** dans le navigateur suffit (servi depuis le disque) ;
- changement back (`app/main.py`, `vibe_runner.py`) → relancer `.\start.ps1`.

## Architecture

```
app/
├── main.py            # FastAPI : routes API + pages + statiques
├── vibe_runner.py     # appelle Vibe en headless, verrou anti-concurrence par projet
└── static/
    ├── index.html     # accueil (style sombre) : liste des projets + formulaire de création (upload)
    ├── projet.html    # coquille de la SPA projet : sidebar + header + <main id="view">
    ├── dashboard.html # ancienne page dashboard (route encore servie)
    ├── css/app.css    # thème sombre copié de Dashboard.html (démonstrateur)
    └── js/
        ├── api.js          # wrappers fetch vers l'API
        ├── ui.js           # ech(), mdLeger(), liens(), pill(), drawer, window.VUES
        ├── router.js       # routing par hash, sidebar, recherche globale, rafraichirEtat()
        ├── chat.js         # vue Chat + parcours de création si projet non actif
        ├── synthese.js     # vues Synthèse (hero + KPI) et Cockpit (alertes)
        ├── registre.js     # vues tableau du registre + matrice des risques 3×3
        ├── planning.js     # vue Planning : frise des jalons + tableau
        ├── documents.js    # vue Documents : liste par audience + lecteur Markdown
        └── interlocuteurs.js # vue Par interlocuteur (dérivée des parties prenantes)
```

Chaque message du chat ou chaque étape du parcours lance un run
`vibe --prompt-file ... --output json` dans le dossier du projet (`projets/<id>/`), via
`app/vibe_runner.py`. Le `session_id` est mémorisé dans `projets/<id>/_runs/session_id.txt`
pour enchaîner avec `--resume`.

## Interface projet (SPA)

`/projet/{id}` charge l'état (`GET /api/projets/{id}/etat`) une fois au chargement, puis navigue
en hash entre les vues de la sidebar : Chat, Synthèse, Cockpit, Planning (frise), Réunions,
Check-lists, Scénarios, Sujets à instruire, Actions, Questions, Décisions, Risques (matrice),
Dépendances, Faits, Documents, Par interlocuteur.

**Rechargement des données** : F5 recharge tout ; après chaque réponse du chat, l'état est
resynchronisé automatiquement (`rafraichirEtat()`) ; le bouton « Rafraîchir » de la vue Chat
recharge messages + état + badges.

## Routes API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/` | accueil |
| GET | `/projet/{id}` | page SPA du projet |
| GET | `/projet/{id}/dashboard` | ancienne page dashboard |
| GET | `/api/projets` | liste les projets |
| POST | `/api/projets` | crée un projet (multipart : nom, description, fichiers) et lance P1 |
| GET | `/api/projets/{id}` | infos + étape du parcours + pré-analyse |
| POST | `/api/projets/{id}/reponses` | enregistre les réponses, lance P2 puis P3 si prêt |
| POST | `/api/projets/{id}/chat` | envoie un message à l'agent (run Vibe, `--resume`) |
| GET | `/api/projets/{id}/chat` | historique du chat (`_runs/chat.jsonl`) |
| GET | `/api/projets/{id}/etat` | les 6 fichiers JSON d'état |
| GET | `/api/projets/{id}/documents` | fichiers des dossiers d'audience (chemin + taille) |
| GET | `/api/projets/{id}/document?path=...` | contenu texte d'un fichier du projet (anti-traversal) |

## Parcours « Nouveau projet » (machine à états dans `_amorcage/etat_parcours.json`)

`description` → `pre_analyse` (P1 tourne) → `questions` (formulaire) → `creation` (P2 puis P3) → `actif` (chat disponible).

Si un run échoue (code ≠ 0, ex. panne réseau), l'API renvoie 502 avec le détail et l'étape revient en arrière — il suffit de renvoyer le formulaire.

## Régénérer les fichiers issus de 3_Prompts_Mistral_Large.md

```powershell
python generer_agent.py     # chef-de-projet.toml + memoire/preferences.md
python generer_prompts.py   # prompts/01..06
python generer_skills.py    # vibe_home/skills/traite-entrants + maj-suivi
```

Ne jamais éditer directement les fichiers générés (`vibe_home/agents/`, `prompts/`,
`vibe_home/skills/`, `template_projet/memoire/preferences.md`, `formats_etat.md`).

## Tests

```powershell
cd template_projet
python -m unittest outils.test_valider_etat   # 12 tests du validateur d'état
cd ..
python tests/test_vues_spa.py                 # contrat SPA <-> API sur le projet reel (PROJET_TEST=<id> pour un autre)
node tests/test_planning_render.js            # rendu de la frise Planning conforme au modèle (12 contrôles)
python tests/test_chat_spa.py                 # chat servi par la SPA
python tests/test_skills_visibles.py          # vibe voit les skills en headless
python tests/mesure_temps_parcours.py         # mesure P1→P2→P3 (appels API payants)
python tests/test_chat_api.py <id_projet>     # test du chat via l'API
```

## Plan de secours (démo sans serveur web)

`vibe-cdp.ps1 <dossier_projet>` lance l'agent chef-de-projet en interactif dans le terminal
(dossier `projets/<id>/`).
