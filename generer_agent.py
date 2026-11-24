#!/usr/bin/env python3
"""Génère vibe_home/agents/chef-de-projet.toml depuis 3_Prompts_Mistral_Large.md (source unique).

Extrait le prompt P0 (section 2) et le contenu initial de memoire/preferences.md,
puis régénère le fichier TOML de l'agent et le fichier preferences.md du template.

Usage : python generer_agent.py
"""

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parent
PROMPTS_MD = APP.parent / "3_Prompts_Mistral_Large.md"
TOML_CIBLE = APP / "vibe_home" / "agents" / "chef-de-projet.toml"
PREFS_CIBLE = APP / "template_projet" / "memoire" / "preferences.md"

TEMPLATE_TOML = """# Généré automatiquement depuis 3_Prompts_Mistral_Large.md — ne pas éditer à la main.
# Pour modifier le prompt P0, éditer 3_Prompts_Mistral_Large.md puis relancer : python generer_agent.py
display_name = "Assistant chef de projet"
description = "Tient l'état d'un projet, traite les entrants, prépare les réunions et les livrables"
safety = "neutral"
agent_type = "agent"
enabled_tools = ["read_file", "write_file", "edit", "skill", "bash"]

instructions = '''
{p0}
'''

[tools.write_file]
permission = "always"

[tools.edit]
permission = "always"

[tools.bash]
permission = "ask"
allowlist = [
  "python outils/valider_etat.py",
  "python outils/extraire_texte.py",
  "python outils/ranger_entrant.py",
  "ls", "grep", "rg",
]
"""


def extraire_section(md: str, titre_debut: str) -> str:
    """Extrait le contenu d'une section commençant par titre_debut jusqu'au prochain '---' ou '## '."""
    idx = md.find(titre_debut)
    if idx == -1:
        raise ValueError(f"Section introuvable : {titre_debut}")
    reste = md[idx + len(titre_debut):]
    # coupe au prochain séparateur horizontal ou titre de même niveau
    m = re.search(r"\n---\n|\n## ", reste)
    if m:
        reste = reste[: m.start()]
    return reste.strip()


def extraire_bloc_markdown(section: str) -> str:
    """Extrait le contenu du premier bloc ```markdown ... ``` d'une section."""
    m = re.search(r"```markdown\n(.*?)```", section, re.DOTALL)
    if not m:
        raise ValueError("Bloc ```markdown introuvable dans la section P0")
    return m.group(1).strip()


def extraire_preferences(section: str) -> str:
    """Extrait le contenu du bloc ```markdown qui suit 'Contenu initial de' dans la section P0."""
    m = re.search(r"Contenu initial de `template_projet/memoire/preferences\.md`\s*:?\s*\n+```markdown\n(.*?)```", section, re.DOTALL)
    if not m:
        raise ValueError("Bloc preferences.md introuvable dans la section P0")
    return m.group(1).strip()


def main() -> int:
    md = PROMPTS_MD.read_text(encoding="utf-8")
    section_p0 = extraire_section(md, "## 2. P0")
    p0 = extraire_bloc_markdown(section_p0)
    prefs = extraire_preferences(section_p0)

    # sécurité : le P0 ne doit pas contenir ''' (qui fermerait la chaîne TOML)
    if "'''" in p0:
        print("ERREUR : le prompt P0 contient ''' (triple quote simple), incompatible avec le TOML")
        return 1

    TOML_CIBLE.parent.mkdir(parents=True, exist_ok=True)
    TOML_CIBLE.write_text(TEMPLATE_TOML.format(p0=p0), encoding="utf-8")
    print(f"OK : {TOML_CIBLE.relative_to(APP.parent)} régénéré ({len(p0)} caractères de P0)")

    PREFS_CIBLE.parent.mkdir(parents=True, exist_ok=True)
    PREFS_CIBLE.write_text(prefs + "\n", encoding="utf-8")
    print(f"OK : {PREFS_CIBLE.relative_to(APP.parent)} régénéré ({len(prefs)} caractères)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
