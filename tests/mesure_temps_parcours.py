#!/usr/bin/env python3
"""Mesure le temps et le coût réels du parcours « Nouveau projet » (P1 → P2 → P3).

Crée un projet fictif à partir du template, dépose le jeu d'essai, lance les 3 prompts
en headless via vibe_runner, et affiche un rapport avec durées et coûts.

Usage : python tests/mesure_temps_parcours.py [--max-price 2.0]
"""

import json
import shutil
import sys
import time
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / "app"))
from vibe_runner import run_vibe  # noqa: E402

TEMPLATE = APP / "template_projet"
PROJETS = APP / "projets"
JEU_ESSAI = APP / "tests" / "jeu_essai"
PROMPTS = APP / "prompts"


def remplacer_variables(texte: str, variables: dict[str, str]) -> str:
    for cle, val in variables.items():
        texte = texte.replace("{{" + cle + "}}", val)
    return texte


def main() -> int:
    max_price = 2.0
    if "--max-price" in sys.argv:
        max_price = float(sys.argv[sys.argv.index("--max-price") + 1])

    # 1. Créer le projet de test
    nom_projet = f"test-mesure-{int(time.time())}"
    projet = PROJETS / nom_projet
    if projet.exists():
        shutil.rmtree(projet)
    shutil.copytree(TEMPLATE, projet)
    print(f"Projet de test créé : projets/{nom_projet}")

    # 2. Déposer le jeu d'essai
    (projet / "_amorcage" / "description_initiale.md").write_text(
        (JEU_ESSAI / "description_projet_fictif.md").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    for f in ["note_dsi_fictive.md", "mail_fournisseur_fictif.md"]:
        shutil.copy(JEU_ESSAI / f, projet / "0_Entrants" / f)
    print("Jeu d'essai déposé dans 0_Entrants/")

    variables = {
        "date_du_jour": date.today().isoformat(),
        "description_utilisateur": (projet / "_amorcage" / "description_initiale.md").read_text(encoding="utf-8"),
        "liste_fichiers_0_Entrants": "\n".join(f"- 0_Entrants/{f.name}" for f in sorted((projet / "0_Entrants").iterdir())),
        "numero_tour": "1",
        "reponses_du_tour": "Tour 1 — réponses fictives :\n- QI-1 (sponsor) : le DSI est confirmé comme sponsor.\n- Toute autre question : réponse selon proposition par défaut.",
    }

    rapport = {"projet": nom_projet, "etapes": []}

    # 3. P1 — pré-analyse
    print("\n=== P1 : pré-analyse ===")
    p1 = remplacer_variables((PROMPTS / "01_pre_analyse.md").read_text(encoding="utf-8"), variables)
    r1 = run_vibe(projet, p1, max_turns=30, max_price=max_price, thinking="high")
    rapport["etapes"].append({"etape": "P1_pre_analyse", "code": r1["code"], "duree_s": r1["duree_s"],
                               "cost_usd": r1["export"].get("cost_usd"), "outcome": r1["export"].get("outcome")})
    print(f"  code={r1['code']} durée={r1['duree_s']}s coût={r1['export'].get('cost_usd')} USD outcome={r1['export'].get('outcome')}")

    # 4. P2 — intégration des réponses
    print("\n=== P2 : intégration des réponses ===")
    p2 = remplacer_variables((PROMPTS / "02_integration_reponses.md").read_text(encoding="utf-8"), variables)
    r2 = run_vibe(projet, p2, max_turns=30, max_price=max_price, thinking="high")
    rapport["etapes"].append({"etape": "P2_integration", "code": r2["code"], "duree_s": r2["duree_s"],
                               "cost_usd": r2["export"].get("cost_usd"), "outcome": r2["export"].get("outcome")})
    print(f"  code={r2['code']} durée={r2['duree_s']}s coût={r2['export'].get('cost_usd')} USD outcome={r2['export'].get('outcome')}")

    # 5. P3 — création de l'espace
    print("\n=== P3 : création de l'espace ===")
    p3 = remplacer_variables((PROMPTS / "03_creation_espace.md").read_text(encoding="utf-8"), variables)
    r3 = run_vibe(projet, p3, max_turns=60, max_price=max_price, thinking="high")
    rapport["etapes"].append({"etape": "P3_creation", "code": r3["code"], "duree_s": r3["duree_s"],
                               "cost_usd": r3["export"].get("cost_usd"), "outcome": r3["export"].get("outcome")})
    print(f"  code={r3['code']} durée={r3['duree_s']}s coût={r3['export'].get('cost_usd')} USD outcome={r3['export'].get('outcome')}")

    # 6. Rapport
    total_duree = sum(e["duree_s"] for e in rapport["etapes"])
    total_cout = sum(e.get("cost_usd") or 0 for e in rapport["etapes"])
    rapport["total_duree_s"] = round(total_duree, 1)
    rapport["total_cout_usd"] = round(total_cout, 4)

    print("\n" + "=" * 50)
    print("RAPPORT DE MESURE")
    print("=" * 50)
    for e in rapport["etapes"]:
        print(f"  {e['etape']:20s} {e['duree_s']:>7.1f}s  {e.get('cost_usd') or 0:.4f} USD  code={e['code']}  {e.get('outcome')}")
    print("-" * 50)
    print(f"  {'TOTAL':20s} {total_duree:>7.1f}s  {total_cout:.4f} USD")
    print("=" * 50)

    # sauvegarde du rapport
    rapport_path = APP / "tests" / f"rapport_mesure_{nom_projet}.json"
    rapport_path.write_text(json.dumps(rapport, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rapport sauvegardé : {rapport_path.relative_to(APP)}")

    # vérifie que l'état final est valide
    import subprocess
    proc = subprocess.run([sys.executable, str(projet / "outils" / "valider_etat.py"), "--racine", str(projet)],
                          capture_output=True, text=True, encoding="utf-8")
    print(f"\nValidation de l'état final : code={proc.returncode}")
    print(proc.stdout.strip()[:500])

    return 0 if all(e["code"] == 0 for e in rapport["etapes"]) else 1


if __name__ == "__main__":
    sys.exit(main())
