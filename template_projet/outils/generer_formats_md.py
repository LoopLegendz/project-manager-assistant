#!/usr/bin/env python3
"""Génère formats_etat.md (version lisible par l'agent) depuis schemas_etat.json.

Usage : python outils/generer_formats_md.py
Écrase outils/formats_etat.md.
"""

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

RACINE = Path(__file__).resolve().parents[1]
SCHEMA_PATH = RACINE / "outils" / "schemas_etat.json"
SORTIE = RACINE / "outils" / "formats_etat.md"


def type_lisible(decl) -> str:
    if isinstance(decl, str):
        return decl
    if isinstance(decl, list):
        if decl and isinstance(decl[0], dict):
            return "liste d'objets"
        return "liste"
    if isinstance(decl, dict):
        return "objet"
    return "?"


def generer_bloc_structure(struct: dict, indent: int = 0) -> list[str]:
    lignes = []
    prefix = "  " * indent
    for cle, decl in struct.items():
        t = type_lisible(decl)
        lignes.append(f"{prefix}- `{cle}` : {t}")
        if isinstance(decl, dict):
            lignes.extend(generer_bloc_structure(decl, indent + 1))
        elif isinstance(decl, list) and decl and isinstance(decl[0], dict):
            lignes.append(f"{prefix}  champs de chaque élément :")
            lignes.extend(generer_bloc_structure(decl[0], indent + 2))
    return lignes


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    lignes = [
        "# Formats de l'état du projet",
        "",
        "Ce fichier est généré automatiquement depuis `schemas_etat.json` (source unique).",
        "Ne pas l'éditer à la main : modifier `schemas_etat.json` puis relancer `python outils/generer_formats_md.py`.",
        "",
        "- Une chaîne vide `\"\"` signifie « non renseigné ». Ne jamais inventer une valeur pour remplir un champ.",
        "- `null` est accepté pour les champs marqués `date|null` ou `id|null`.",
        "- Dates : AAAA-MM-JJ.",
        "- Champs communs à tous les éléments de liste : `id`, `origine`, `audience`, `liens`.",
        "",
        "## Énumérations",
        "",
    ]
    for nom, valeurs in schema.get("enumerations", {}).items():
        lignes.append(f"- `{nom}` : {' | '.join(valeurs)}")
    lignes.append("")
    lignes.append("## Patterns d'identifiants")
    lignes.append("")
    for prefixe, info in schema.get("id_patterns", {}).items():
        lignes.append(f"- `{prefixe}-NN` → `{info['fichier']}` > `{info['serie']}` (regex `{info['regex']}`)")
    lignes.append("")
    for rel, info in schema.get("fichiers_etat", {}).items():
        lignes.append(f"## `{rel}`")
        lignes.append("")
        lignes.append("```json")
        lignes.append(json.dumps({"exemple_structure": info["structure"]}, ensure_ascii=False, indent=2))
        lignes.append("```")
        lignes.append("")
        lignes.append("Champs :")
        lignes.extend(generer_bloc_structure(info["structure"]))
        lignes.append("")
    pa = schema.get("pre_analyse")
    if pa:
        lignes.append(f"## `{pa['fichier']}` (pré-analyse)")
        lignes.append("")
        lignes.append("```json")
        lignes.append(json.dumps({"exemple_structure": pa["structure"]}, ensure_ascii=False, indent=2))
        lignes.append("```")
        lignes.append("")
        for regle in pa.get("regles_speciales", []):
            lignes.append(f"- Règle spéciale : {regle}")
        lignes.append("")
    SORTIE.write_text("\n".join(lignes) + "\n", encoding="utf-8")
    print(f"OK : {SORTIE.relative_to(RACINE).as_posix()} régénéré ({len(lignes)} lignes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
