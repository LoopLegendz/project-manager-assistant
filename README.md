# Assistant chef de projet — application web locale

## Lancement

```powershell
cd "C:\Users\vissartel\Agent Project Manager\Project Manager Assistant\assistant-cdp"
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Puis ouvrir http://127.0.0.1:8000/

## Dépendances (uv)

```powershell
uv add fastapi uvicorn python-multipart
# déjà présents : pypdf, python-docx, python-pptx (pour extraire_texte.py)
```

## Architecture

```
app/
├── main.py            # FastAPI : routes API + sert les pages statiques
├── vibe_runner.py     # appelle Vibe en headless, verrou anti-concurrence par projet
└── static/
    ├── index.html     # accueil : liste des projets + formulaire de création (upload)
    ├── projet.html    # page projet : questions de pré-analyse puis chat
    └── style.css
```

Chaque message du chat ou chaque étape du parcours lance un run `vibe --prompt-file ... --output json` dans le dossier du projet (`projets/<id>/`), via `app/vibe_runner.py`. Le `session_id` est mémorisé dans `projets/<id>/_runs/session_id.txt` pour enchaîner avec `--resume`.

## Routes API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/projets` | liste les projets |
| POST | `/api/projets` | crée un projet (multipart : nom, description, fichiers) et lance P1 |
| GET | `/api/projets/{id}` | infos + étape du parcours + pré-analyse |
| POST | `/api/projets/{id}/reponses` | enregistre les réponses, lance P2 puis P3 si prêt |
| POST | `/api/projets/{id}/chat` | envoie un message à l'agent (run Vibe, `--resume`) |
| GET | `/api/projets/{id}/chat` | historique du chat (`_runs/chat.jsonl`) |
| GET | `/api/projets/{id}/etat` | les 6 fichiers JSON d'état |

## Parcours « Nouveau projet » (machine à états dans `_amorcage/etat_parcours.json`)

`description` → `pre_analyse` (P1 tourne) → `questions` (formulaire) → `creation` (P2 puis P3) → `actif` (chat disponible).

Si un run échoue (code ≠ 0, ex. panne réseau), l'API renvoie 502 avec le détail et l'étape revient en arrière — il suffit de renvoyer le formulaire.

## Régénérer les fichiers issus de 3_Prompts_Mistral_Large.md

```powershell
python generer_agent.py     # chef-de-projet.toml + memoire/preferences.md
python generer_prompts.py   # prompts/01..03
```

## Tests

```powershell
cd template_projet
python -m unittest outils.test_valider_etat   # 12 tests du validateur
cd ..
python tests/mesure_temps_parcours.py         # mesure P1→P2→P3 (appels API payants)
python tests/test_chat_api.py <id_projet>     # test du chat via l'API
```
