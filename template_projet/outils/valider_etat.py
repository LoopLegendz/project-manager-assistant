#!/usr/bin/env python3
"""Validateur de l'état d'un projet. Lit le schéma depuis outils/schemas_etat.json (source unique externe).

Usage :
    python outils/valider_etat.py                     # valide etat/*.json (racine = parent de outils/)
    python outils/valider_etat.py --pre-analyse       # valide _amorcage/pre_analyse.json
    python outils/valider_etat.py --racine <chemin>   # valide un autre dossier projet (tests)

Code retour : 0 si valide, 1 sinon.
Sortie : une ligne par erreur au format `<fichier> > <chemin> : <message>`, en français.
Dernière ligne : `OK : état valide` ou `<n> erreur(s)`.
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

RACINE = Path(__file__).resolve().parents[1]
SCHEMA_PATH = RACINE / "outils" / "schemas_etat.json"

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SCHEMA: dict = {}


def charger_schema() -> dict:
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def err(erreurs: list, fichier: str, interne: str, message: str) -> None:
    """Ajoute une erreur au format <fichier> > <chemin> : <message>."""
    if interne:
        erreurs.append(f"{fichier} > {interne} : {message}")
    else:
        erreurs.append(f"{fichier} : {message}")


def type_attendu(declaration) -> str:
    if isinstance(declaration, str):
        return declaration
    if isinstance(declaration, list):
        return "list"
    if isinstance(declaration, dict):
        return "dict"
    return "any"


def verifier_type(valeur, declaration, fichier: str, interne: str, erreurs: list) -> None:
    """Vérifie qu'une valeur correspond à sa déclaration de type dans le schéma."""
    t = type_attendu(declaration)
    if t == "string" and not isinstance(valeur, str):
        err(erreurs, fichier, interne, f"attendait une chaîne, reçu {type(valeur).__name__}")
    elif t == "int" and not isinstance(valeur, int):
        err(erreurs, fichier, interne, f"attendait un entier, reçu {type(valeur).__name__}")
    elif t == "bool" and not isinstance(valeur, bool):
        err(erreurs, fichier, interne, f"attendait un booléen, reçu {type(valeur).__name__}")
    elif t in ("date", "date|null"):
        # règle 7 : "" et null sont acceptés
        if valeur not in ("", None) and (not isinstance(valeur, str) or not DATE_RE.match(valeur)):
            err(erreurs, fichier, interne, f'date invalide "{valeur}" (format AAAA-MM-JJ attendu)')
    elif t == "id" and (not isinstance(valeur, str) or not re.match(r"^[A-Z]+-\d+$", valeur)):
        err(erreurs, fichier, interne, f'identifiant invalide "{valeur}"')
    elif t == "id|null" and valeur is not None and (not isinstance(valeur, str) or not re.match(r"^[A-Z]+-\d+$", valeur)):
        err(erreurs, fichier, interne, f'identifiant invalide "{valeur}" (ou null)')
    elif t == "list":
        if not isinstance(valeur, list):
            err(erreurs, fichier, interne, f"attendait une liste, reçu {type(valeur).__name__}")
        elif isinstance(declaration, list) and declaration and isinstance(declaration[0], str):
            for i, item in enumerate(valeur):
                if not isinstance(item, str):
                    err(erreurs, fichier, f"{interne}[{i}]", "attendait une chaîne")
        elif isinstance(declaration, list) and declaration and isinstance(declaration[0], dict):
            sous_schema = declaration[0]
            for i, item in enumerate(valeur):
                if not isinstance(item, dict):
                    err(erreurs, fichier, f"{interne}[{i}]", "attendait un objet")
                else:
                    verifier_structure(item, sous_schema, fichier, f"{interne}[{i}]", erreurs)
    elif t == "dict":
        if not isinstance(valeur, dict):
            err(erreurs, fichier, interne, f"attendait un objet, reçu {type(valeur).__name__}")
        else:
            verifier_structure(valeur, declaration, fichier, interne, erreurs)
    elif t == "audience":
        enums = SCHEMA["enumerations"].get("audience", [])
        if valeur not in enums:
            err(erreurs, fichier, interne, f'valeur "{valeur}" interdite ({", ".join(enums)})')
    elif t in SCHEMA.get("enumerations", {}):
        enums = SCHEMA["enumerations"][t]
        if valeur not in enums:
            err(erreurs, fichier, interne, f'valeur "{valeur}" interdite ({", ".join(enums)})')
    elif t.startswith("id:"):
        prefixe = t[3:]
        pattern = SCHEMA["id_patterns"].get(prefixe, {}).get("regex", r"^[A-Z]+-\d+$")
        if not isinstance(valeur, str) or not re.match(pattern, valeur):
            err(erreurs, fichier, interne, f'identifiant "{valeur}" invalide (format {prefixe}-NN attendu)')


def verifier_structure(objet, schema_struct: dict, fichier: str, interne: str, erreurs: list) -> None:
    """Vérifie qu'un objet JSON correspond à une structure de schéma (champs obligatoires, pas d'inconnus)."""
    if not isinstance(objet, dict):
        err(erreurs, fichier, interne, "attendait un objet")
        return
    for cle in objet:
        if cle not in schema_struct:
            err(erreurs, fichier, cle if not interne else f"{interne}.{cle}",
                f'champ inconnu (attendu : {", ".join(schema_struct.keys())})')
    for cle, decl in schema_struct.items():
        sous = cle if not interne else f"{interne}.{cle}"
        if cle not in objet:
            err(erreurs, fichier, sous, "champ obligatoire manquant")
        else:
            verifier_type(objet[cle], decl, fichier, sous, erreurs)


def valider_fichiers_etat(racine: Path, schema: dict) -> list[str]:
    erreurs: list[str] = []
    tous_les_ids: dict[str, str] = {}

    # 1. Existence, JSON valide, structure (règles 1, 2, 3, 7)
    for rel, info in schema["fichiers_etat"].items():
        path = racine / rel
        if not path.exists():
            err(erreurs, rel, "", "fichier manquant")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(erreurs, rel, "", f"JSON invalide ({e})")
            continue
        verifier_structure(data, info["structure"], rel, "", erreurs)

    # 2. Identifiants : unicité, format, bonne série (règle 4)
    vus: dict[str, str] = {}
    for rel, info in schema["fichiers_etat"].items():
        path = racine / rel
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for serie, elements in data.items():
            if not isinstance(elements, list):
                continue
            for i, el in enumerate(elements):
                if not isinstance(el, dict):
                    continue
                el_id = el.get("id", "")
                interne = f"{serie}[{i}].id"
                if not el_id:
                    err(erreurs, rel, interne, "identifiant manquant")
                    continue
                prefixe = el_id.split("-")[0] if "-" in el_id else ""
                pattern_info = schema["id_patterns"].get(prefixe)
                if pattern_info:
                    if not re.match(pattern_info["regex"], el_id):
                        err(erreurs, rel, interne, f'format invalide "{el_id}" (attendu {pattern_info["regex"]})')
                    if pattern_info["fichier"] != rel or pattern_info["serie"] != serie:
                        err(erreurs, rel, interne, f'"{el_id}" n\'appartient pas à {rel} > {serie}')
                if el_id in vus:
                    err(erreurs, rel, interne, f'doublon "{el_id}" (déjà dans {vus[el_id]})')
                else:
                    vus[el_id] = f"{rel} > {serie}[{i}]"
                tous_les_ids[el_id] = rel

    # 3. Champs communs : origine, audience, liens, faits remplacés (règles 5, 6, 8)
    for rel, info in schema["fichiers_etat"].items():
        path = racine / rel
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for serie, elements in data.items():
            if not isinstance(elements, list):
                continue
            for i, el in enumerate(elements):
                if not isinstance(el, dict):
                    continue
                base = f"{serie}[{i}]"
                if "origine" in el and not el["origine"]:
                    err(erreurs, rel, f"{base}.origine", "ne peut pas être vide")
                if "audience" in el:
                    enums = schema["enumerations"].get("audience", [])
                    if el["audience"] not in enums:
                        err(erreurs, rel, f"{base}.audience", f'valeur "{el["audience"]}" interdite ({", ".join(enums)})')
                if "liens" in el and isinstance(el["liens"], list):
                    for j, lien in enumerate(el["liens"]):
                        if lien not in tous_les_ids and not lien.startswith("QI-"):
                            err(erreurs, rel, f"{base}.liens[{j}]", f'identifiant "{lien}" inexistant')
                if "remplace_par" in el and el.get("statut") == "remplace":
                    if not el.get("remplace_le") or not el.get("remplace_par"):
                        err(erreurs, rel, base, "fait remplacé sans remplace_le/remplace_par renseignés")
                    elif el["remplace_par"] not in tous_les_ids:
                        err(erreurs, rel, f"{base}.remplace_par", f'identifiant "{el["remplace_par"]}" inexistant')

    return erreurs


def valider_pre_analyse(racine: Path, schema: dict) -> list[str]:
    """Règle 9 : valide _amorcage/pre_analyse.json selon le schéma, + cohérence pret_pour_creation."""
    erreurs: list[str] = []
    pa = schema["pre_analyse"]
    fichier = pa["fichier"]
    path = racine / fichier
    if not path.exists():
        return [f"{fichier} : fichier manquant"]
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return [f"{fichier} : JSON invalide ({e})"]
    verifier_structure(data, pa["structure"], fichier, "", erreurs)
    lacunes = data.get("lacunes", [])
    a_bloquante = any(l.get("bloquante") is True for l in lacunes if isinstance(l, dict))
    if data.get("pret_pour_creation") is True and a_bloquante:
        err(erreurs, fichier, "pret_pour_creation", "true mais des lacunes bloquantes existent")
    if data.get("pret_pour_creation") is False and not a_bloquante:
        err(erreurs, fichier, "pret_pour_creation", "false mais aucune lacune bloquante")
    return erreurs


def main() -> int:
    global SCHEMA, RACINE
    SCHEMA = charger_schema()
    args = sys.argv[1:]
    pre_analyse = "--pre-analyse" in args
    if "--racine" in args:
        idx = args.index("--racine")
        RACINE = Path(args[idx + 1]).resolve()
    if pre_analyse:
        erreurs = valider_pre_analyse(RACINE, SCHEMA)
    else:
        erreurs = valider_fichiers_etat(RACINE, SCHEMA)
    if erreurs:
        for e in erreurs:
            print(e)
        print(f"{len(erreurs)} erreur(s)")
        return 1
    print("OK : état valide")
    return 0


if __name__ == "__main__":
    sys.exit(main())
