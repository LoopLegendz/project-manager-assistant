#!/usr/bin/env python3
"""Application web locale : assistant chef de projet.

Lancement : uvicorn app.main:app --host 127.0.0.1 --port 8000   (depuis assistant-cdp/)

Routes sync (bloquantes) pour les runs Vibe : FastAPI les exécute dans un threadpool.
"""

import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vibe_runner import run_vibe, verrou_info, RunOccupeError  # noqa: E402

APP = Path(__file__).resolve().parents[1]
TEMPLATE = APP / "template_projet"
PROJETS = APP / "projets"
PROMPTS = APP / "prompts"
STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Assistant chef de projet")
app.mount("/static", StaticFiles(directory=STATIC), name="static")

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,60}$")


# ---------- helpers ----------

def slugify(nom: str) -> str:
    s = nom.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60] or "projet"


def projet_path(id_projet: str) -> Path:
    if not SLUG_RE.match(id_projet):
        raise HTTPException(400, f"identifiant de projet invalide : {id_projet!r}")
    p = PROJETS / id_projet
    if not p.is_dir():
        raise HTTPException(404, f"projet introuvable : {id_projet}")
    return p


def lire_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def ecrire_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def etat_parcours(projet: Path) -> dict:
    return lire_json(projet / "_amorcage" / "etat_parcours.json",
                     {"etape": "description", "tour": 0})


def maj_parcours(projet: Path, **kwargs) -> dict:
    p = etat_parcours(projet)
    p.update(kwargs)
    ecrire_json(projet / "_amorcage" / "etat_parcours.json", p)
    return p


def get_session_id(projet: Path) -> str | None:
    f = projet / "_runs" / "session_id.txt"
    return f.read_text(encoding="utf-8").strip() if f.exists() else None


def save_session_id(projet: Path, sid: str) -> None:
    f = projet / "_runs" / "session_id.txt"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(sid, encoding="utf-8")


def append_chat(projet: Path, entree: dict) -> None:
    f = projet / "_runs" / "chat.jsonl"
    f.parent.mkdir(parents=True, exist_ok=True)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entree, ensure_ascii=False) + "\n")


def lire_chat(projet: Path) -> list[dict]:
    f = projet / "_runs" / "chat.jsonl"
    if not f.exists():
        return []
    return [json.loads(l) for l in f.read_text(encoding="utf-8").splitlines() if l.strip()]


def remplacer_variables(texte: str, variables: dict[str, str]) -> str:
    for cle, val in variables.items():
        texte = texte.replace("{{" + cle + "}}", val)
    return texte


def lancer_prompt(projet: Path, nom_prompt: str, variables: dict, max_turns: int,
                  max_price: float = 1.0, session_id: str | None = None) -> dict:
    """Lance un prompt fichier du dossier prompts/ via vibe_runner. Lève HTTPException si occupé."""
    texte = (PROMPTS / nom_prompt).read_text(encoding="utf-8")
    texte = remplacer_variables(texte, variables)
    try:
        return run_vibe(projet, texte, session_id=session_id, max_turns=max_turns,
                        max_price=max_price, thinking="high")
    except RunOccupeError as e:
        raise HTTPException(409, str(e))


def extraire_reponse(run: dict) -> str:
    """Extrait le texte final de l'agent depuis le résultat du run.

    En --output json, le stdout est la liste des entries de la session :
    on prend le texte du dernier message 'assistant'.
    """
    out = (run.get("reponse") or "").strip()
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return out
    if isinstance(data, list):
        dernier = None
        for entry in data:
            if entry.get("type") == "message" and entry.get("role") == "assistant":
                dernier = entry
        if dernier:
            textes = [c["text"] for c in dernier.get("content", [])
                      if isinstance(c, dict) and c.get("type") == "text" and c.get("text")]
            if textes:
                return "\n".join(textes)
    if isinstance(data, dict):
        for cle in ("result", "final_output", "output", "text", "message"):
            if isinstance(data.get(cle), str) and data[cle].strip():
                return data[cle]
    return out


# ---------- modèles ----------

class ReponsesIn(BaseModel):
    reponses: dict[str, str]


class ChatIn(BaseModel):
    message: str


# ---------- pages ----------

@app.get("/", include_in_schema=False)
def accueil():
    return FileResponse(STATIC / "index.html")


@app.get("/projet/{id_projet}", include_in_schema=False)
def page_projet(id_projet: str):
    projet_path(id_projet)  # 404 si inconnu
    return FileResponse(STATIC / "projet.html")


@app.get("/projet/{id_projet}/dashboard", include_in_schema=False)
def page_dashboard(id_projet: str):
    projet_path(id_projet)
    return FileResponse(STATIC / "dashboard.html")


# ---------- API ----------

@app.get("/api/projets")
def liste_projets():
    PROJETS.mkdir(exist_ok=True)
    out = []
    for p in sorted(PROJETS.iterdir()):
        if not p.is_dir() or p.name.startswith("."):
            continue
        etat = lire_json(p / "etat" / "projet.json", {})
        parcours = etat_parcours(p)
        out.append({
            "id": p.name,
            "nom": etat.get("nom") or p.name,
            "etape": parcours.get("etape", "description"),
        })
    return {"projets": out}


@app.post("/api/projets")
async def creer_projet(
    nom: str = Form(...),
    description: str = Form(...),
    fichiers: list[UploadFile] | None = File(None),
):
    slug = slugify(nom)
    projet = PROJETS / slug
    if projet.exists():
        raise HTTPException(409, f"un projet '{slug}' existe déjà")
    PROJETS.mkdir(exist_ok=True)
    shutil.copytree(TEMPLATE, projet)

    (projet / "_amorcage" / "description_initiale.md").write_text(description, encoding="utf-8")
    if fichiers:
        for f in fichiers:
            if f.filename:
                contenu = await f.read()
                (projet / "0_Entrants" / Path(f.filename).name).write_bytes(contenu)

    maj_parcours(projet, etape="pre_analyse", tour=0)

    liste_fichiers = "\n".join(
        f"- 0_Entrants/{f.name}" for f in sorted((projet / "0_Entrants").iterdir())
    ) or "(aucun fichier déposé)"
    variables = {
        "date_du_jour": date.today().isoformat(),
        "description_utilisateur": description,
        "liste_fichiers_0_Entrants": liste_fichiers,
    }
    run = lancer_prompt(projet, "01_pre_analyse.md", variables, max_turns=30, max_price=1.0)
    if run["code"] != 0:
        maj_parcours(projet, etape="description")
        raise HTTPException(502, f"la pré-analyse a échoué (code {run['code']}, "
                                 f"outcome {run['export'].get('outcome')}, "
                                 f"erreur {run['export'].get('error')})")

    pre = lire_json(projet / "_amorcage" / "pre_analyse.json", {})
    if pre.get("pret_pour_creation"):
        maj_parcours(projet, etape="actif")
    else:
        maj_parcours(projet, etape="questions")

    save_session_id(projet, run["export"].get("session_id", ""))
    return {
        "id": slug,
        "etape": etat_parcours(projet)["etape"],
        "pre_analyse": pre,
        "run": {"code": run["code"], "duree_s": run["duree_s"],
                "cost_usd": run["export"].get("cost_usd")},
    }


@app.get("/api/projets/{id_projet}")
def info_projet(id_projet: str):
    projet = projet_path(id_projet)
    etat = lire_json(projet / "etat" / "projet.json", {})
    parcours = etat_parcours(projet)
    pre = lire_json(projet / "_amorcage" / "pre_analyse.json", {})
    return {"id": id_projet, "nom": etat.get("nom") or id_projet,
            "etape": parcours.get("etape"), "tour": parcours.get("tour", 0),
            "pre_analyse": pre}


@app.post("/api/projets/{id_projet}/reponses")
def envoyer_reponses(id_projet: str, body: ReponsesIn):
    projet = projet_path(id_projet)
    parcours = etat_parcours(projet)
    if parcours.get("etape") != "questions":
        raise HTTPException(409, f"le projet n'est pas à l'étape questions (étape : {parcours.get('etape')})")

    tour = int(parcours.get("tour", 0)) + 1
    lignes = [f"## Tour {tour}", ""]
    for qid, val in body.reponses.items():
        lignes.append(f"- {qid} : {val}")
    reponses_md = projet / "_amorcage" / "reponses.md"
    with open(reponses_md, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lignes) + "\n\n")

    variables = {
        "date_du_jour": date.today().isoformat(),
        "numero_tour": str(tour),
        "reponses_du_tour": "\n".join(lignes),
    }
    run = lancer_prompt(projet, "02_integration_reponses.md", variables, max_turns=30, max_price=1.0)
    save_session_id(projet, run["export"].get("session_id", "") or get_session_id(projet) or "")

    pre = lire_json(projet / "_amorcage" / "pre_analyse.json", {})
    if pre.get("pret_pour_creation") or tour >= 2:
        # lancer P3 : création de l'espace
        maj_parcours(projet, etape="creation")
        variables3 = {"date_du_jour": date.today().isoformat()}
        run3 = lancer_prompt(projet, "03_creation_espace.md", variables3, max_turns=60, max_price=2.0)
        save_session_id(projet, run3["export"].get("session_id", "") or get_session_id(projet) or "")
        if run3["code"] != 0:
            maj_parcours(projet, etape="questions", tour=tour)
            raise HTTPException(502, f"la création de l'espace a échoué (code {run3['code']}, "
                                     f"outcome {run3['export'].get('outcome')}, "
                                     f"erreur {run3['export'].get('error')}) — réessayez")
        maj_parcours(projet, etape="actif")
        return {"etape": "actif", "tour": tour,
                "run": {"code": run3["code"], "duree_s": run3["duree_s"],
                        "cost_usd": run3["export"].get("cost_usd")}}

    maj_parcours(projet, etape="questions", tour=tour)
    return {"etape": "questions", "tour": tour, "questions": pre.get("questions", []),
            "run": {"code": run["code"], "duree_s": run["duree_s"],
                    "cost_usd": run["export"].get("cost_usd")}}


@app.post("/api/projets/{id_projet}/chat")
def chat(id_projet: str, body: ChatIn):
    projet = projet_path(id_projet)
    parcours = etat_parcours(projet)
    if parcours.get("etape") != "actif":
        raise HTTPException(409, f"le projet n'est pas encore actif (étape : {parcours.get('etape')})")
    if not body.message.strip():
        raise HTTPException(400, "message vide")

    sid = get_session_id(projet)
    try:
        run = run_vibe(projet, body.message, session_id=sid, max_turns=40, max_price=1.0,
                       thinking="high", timeout_verrou=10.0)
    except RunOccupeError as e:
        raise HTTPException(409, str(e))

    reponse = extraire_reponse(run)
    if run["code"] != 0:
        reponse = (f"[Run échoué : code {run['code']}, outcome {run['export'].get('outcome')}, "
                   f"erreur {run['export'].get('error')}]\n\n" + reponse)
    new_sid = run["export"].get("session_id")
    if new_sid:
        save_session_id(projet, new_sid)
    append_chat(projet, {"role": "user", "texte": body.message})
    append_chat(projet, {"role": "assistant", "texte": reponse,
                         "cost_usd": run["export"].get("cost_usd"),
                         "duree_s": run["duree_s"], "run_dir": run["run_dir"],
                         "code": run["code"]})
    return {"reponse": reponse, "cost_usd": run["export"].get("cost_usd"),
            "duree_s": run["duree_s"], "code": run["code"], "run_dir": run["run_dir"]}


@app.get("/api/projets/{id_projet}/chat")
def historique_chat(id_projet: str):
    projet = projet_path(id_projet)
    return {"messages": lire_chat(projet), "run_en_cours": verrou_info(projet)}


@app.get("/api/projets/{id_projet}/etat")
def etat_projet(id_projet: str):
    projet = projet_path(id_projet)
    out = {}
    for f in ["projet", "registre", "faits", "planning", "reunions", "sujets"]:
        out[f] = lire_json(projet / "etat" / f"{f}.json", {})
    return out


DOSSIERS_AUDIENCE = ["0_Entrants", "1_Perso", "2_Projet", "3_Direction", "4_Public"]


@app.get("/api/projets/{id_projet}/document")
def lire_document(id_projet: str, path: str):
    """Renvoie le contenu texte d'un fichier du projet (pour le lecteur de documents).
    Le chemin doit rester dans le dossier du projet."""
    projet = projet_path(id_projet)
    cible = (projet / path).resolve()
    if not str(cible).startswith(str(projet)) or not cible.is_file():
        raise HTTPException(404, "document introuvable dans le projet")
    try:
        return {"chemin": path, "contenu": cible.read_text(encoding="utf-8")}
    except UnicodeDecodeError:
        raise HTTPException(415, "fichier binaire, non lisible en texte")


@app.get("/api/projets/{id_projet}/documents")
def documents_projet(id_projet: str):
    """Liste les fichiers du projet, groupés par dossier d'audience (sous-dossiers inclus)."""
    projet = projet_path(id_projet)
    out = {}
    for dossier in DOSSIERS_AUDIENCE:
        d = projet / dossier
        fichiers = []
        if d.is_dir():
            for f in sorted(d.rglob("*")):
                if f.is_file():
                    fichiers.append({
                        "chemin": f.relative_to(projet).as_posix(),
                        "taille": f.stat().st_size,
                    })
        out[dossier] = fichiers
    return out

