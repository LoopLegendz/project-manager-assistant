#!/usr/bin/env python3
"""Génère les fichiers prompts/ depuis 3_Prompts_Mistral_Large.md (source unique).

Extrait P1, P2, P3 et écrit prompts/01_pre_analyse.md, 02_integration_reponses.md, 03_creation_espace.md.
Les variables {{...}} restent telles quelles : elles seront remplacées par l'application.

Usage : python generer_prompts.py
"""

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parent
PROMPTS_MD = APP.parent / "3_Prompts_Mistral_Large.md"
DOSSIER_PROMPTS = APP / "prompts"

CORRESPONDANCE = [
    ("## 3. P1", "01_pre_analyse.md"),
    ("## 4. P2", "02_integration_reponses.md"),
    ("## 5. P3", "03_creation_espace.md"),
]


def extraire_bloc_prompt(section: str) -> str:
    """Extrait le contenu du premier bloc markdown (3 backticks ou plus) d'une section."""
    m = re.search(r"`{3,}markdown\n(.*?)`{3,}", section, re.DOTALL)
    if not m:
        raise ValueError("Bloc markdown introuvable")
    return m.group(1).strip()


def extraire_section(md: str, titre_debut: str) -> str:
    """Extrait une section du document principal, délimitée par des '---' horizontaux."""
    idx = md.find(titre_debut)
    if idx == -1:
        raise ValueError(f"Section introuvable : {titre_debut}")
    reste = md[idx + len(titre_debut):]
    # coupe au prochain séparateur horizontal de document (hors blocs de code)
    m = re.search(r"\n---\n", reste)
    if m:
        reste = reste[: m.start()]
    return reste.strip()


def main() -> int:
    md = PROMPTS_MD.read_text(encoding="utf-8")
    DOSSIER_PROMPTS.mkdir(parents=True, exist_ok=True)
    for titre, nom_fichier in CORRESPONDANCE:
        section = extraire_section(md, titre)
        contenu = extraire_bloc_prompt(section)
        cible = DOSSIER_PROMPTS / nom_fichier
        cible.write_text(contenu + "\n", encoding="utf-8")
        print(f"OK : prompts/{nom_fichier} ({len(contenu)} caractères)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
