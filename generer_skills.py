#!/usr/bin/env python3
"""Génère les skills Vibe depuis 3_Prompts_Mistral_Large.md (source unique).

Extrait les sections P4 (traite-entrants) et P5 (maj-suivi), lit le champ `name`
du frontmatter YAML de chaque bloc, et écrit vibe_home/skills/<name>/SKILL.md.

Usage : python generer_skills.py
"""

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parent
PROMPTS_MD = APP.parent / "3_Prompts_Mistral_Large.md"
SKILLS_DIR = APP / "vibe_home" / "skills"

SECTIONS = ["## 6. P4", "## 7. P5"]


def extraire_section(md: str, titre_debut: str) -> str:
    """Extrait une section du document principal. Le séparateur de sections est
    '---' suivi d'un titre '## ' (les '---' du frontmatter des blocs en sont exclus)."""
    idx = md.find(titre_debut)
    if idx == -1:
        raise ValueError(f"Section introuvable : {titre_debut}")
    reste = md[idx + len(titre_debut):]
    m = re.search(r"\n---\n+## ", reste)
    if m:
        reste = reste[: m.start()]
    return reste.strip()


def extraire_bloc_markdown(section: str) -> str:
    m = re.search(r"`{3,}markdown\n(.*?)`{3,}", section, re.DOTALL)
    if not m:
        raise ValueError("Bloc markdown introuvable")
    return m.group(1).strip()


def extraire_name(bloc: str) -> str:
    m = re.search(r"^---\s*\n(.*?)\n---", bloc, re.DOTALL)
    if not m:
        raise ValueError("Frontmatter YAML introuvable")
    fm = m.group(1)
    m2 = re.search(r"^name:\s*(\S+)", fm, re.MULTILINE)
    if not m2:
        raise ValueError("Champ 'name' introuvable dans le frontmatter")
    return m2.group(1)


def main() -> int:
    md = PROMPTS_MD.read_text(encoding="utf-8")
    for titre in SECTIONS:
        bloc = extraire_bloc_markdown(extraire_section(md, titre))
        name = extraire_name(bloc)
        if not re.match(r"^[a-z0-9-]+$", name):
            raise ValueError(f"name invalide pour un skill : {name!r}")
        cible = SKILLS_DIR / name / "SKILL.md"
        cible.parent.mkdir(parents=True, exist_ok=True)
        cible.write_text(bloc + "\n", encoding="utf-8")
        print(f"OK : vibe_home/skills/{name}/SKILL.md ({len(bloc)} caractères)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
