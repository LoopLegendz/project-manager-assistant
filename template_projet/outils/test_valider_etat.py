#!/usr/bin/env python3
"""Tests unitaires de valider_etat.py. Chaque test travaille dans un dossier temporaire.

Usage : python -m unittest outils/test_valider_etat.py
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RACINE_TEMPLATE = Path(__file__).resolve().parents[1]
VALIDATEUR = RACINE_TEMPLATE / "outils" / "valider_etat.py"


def lancer_validateur(racine: Path, args: list[str] | None = None) -> tuple[int, str]:
    cmd = [sys.executable, str(VALIDATEUR), "--racine", str(racine)] + (args or [])
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return proc.returncode, proc.stdout or ""


class TestValiderEtat(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="test_etat_"))
        # copie le squelette
        for d in ["etat", "outils", "_amorcage"]:
            src = RACINE_TEMPLATE / d
            dst = self.tmp / d
            if src.exists():
                shutil.copytree(src, dst)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ecrire(self, rel: str, data) -> None:
        path = self.tmp / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, str):
            path.write_text(data, encoding="utf-8")
        else:
            path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def test_etat_vide_valide(self):
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 0, out)
        self.assertIn("OK", out)

    def test_doublon_identifiant(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        q = {"id": "Q-001", "intitule": "Test", "posee_a": "DSI", "statut": "ouverte",
             "reponse": "", "date_ouverture": "2026-11-20", "date_reponse": None,
             "echeance": None, "origine": "test", "audience": "projet", "liens": []}
        reg["questions"] = [q, dict(q)]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("doublon", out)

    def test_lien_vers_id_inexistant(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        reg["actions"] = [{"id": "A-001", "intitule": "Test", "porteur": "X",
                            "echeance": "2026-12-01", "statut": "a_faire",
                            "date_cloture": None, "origine": "test", "audience": "projet",
                            "liens": ["Q-999"]}]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("Q-999", out)
        self.assertIn("inexistant", out)

    def test_enumeration_invalide(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        reg["questions"] = [{"id": "Q-001", "intitule": "Test", "posee_a": "DSI",
                              "statut": "fini", "reponse": "", "date_ouverture": "2026-11-20",
                              "date_reponse": None, "echeance": None, "origine": "test",
                              "audience": "projet", "liens": []}]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn('valeur "fini" interdite (ouverte, repondue, abandonnee)', out)
        self.assertIn("etat/registre.json > questions[0].statut", out)

    def test_date_mal_formee(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        reg["questions"] = [{"id": "Q-001", "intitule": "Test", "posee_a": "DSI",
                              "statut": "ouverte", "reponse": "",
                              "date_ouverture": "20/11/2026", "date_reponse": None,
                              "echeance": None, "origine": "test", "audience": "projet",
                              "liens": []}]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("date invalide", out)

    def test_fait_remplace_incomplet(self):
        faits = json.loads((self.tmp / "etat" / "faits.json").read_text(encoding="utf-8"))
        faits["faits"] = [{"id": "F-001", "texte": "Ancien fait", "origine": "test",
                            "date_origine": "2026-11-01", "statut": "remplace",
                            "remplace_le": None, "remplace_par": None,
                            "themes": [], "audience": "projet", "liens": []}]
        self.ecrire("etat/faits.json", faits)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("remplace", out)

    def test_json_illisible(self):
        self.ecrire("etat/registre.json", "{ pas du json valide !!!")
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("JSON invalide", out)

    def test_champ_inconnu(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        reg["questions"] = [{"id": "Q-001", "intitule": "Test", "posee_a": "DSI",
                              "statut": "ouverte", "reponse": "", "date_ouverture": "2026-11-20",
                              "date_reponse": None, "echeance": None, "origine": "test",
                              "audience": "projet", "liens": [], "champ_surprise": 42}]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("champ inconnu", out)
        self.assertIn("champ_surprise", out)

    def test_origine_vide(self):
        reg = json.loads((self.tmp / "etat" / "registre.json").read_text(encoding="utf-8"))
        reg["questions"] = [{"id": "Q-001", "intitule": "Test", "posee_a": "DSI",
                              "statut": "ouverte", "reponse": "", "date_ouverture": "2026-11-20",
                              "date_reponse": None, "echeance": None, "origine": "",
                              "audience": "projet", "liens": []}]
        self.ecrire("etat/registre.json", reg)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)
        self.assertIn("origine", out)

    def test_pre_analyse_valide(self):
        pa = {
            "tour": 1,
            "projet": {"nom_propose": "Test", "code_propose": "TST", "objet": "obj",
                        "commanditaire": "", "chef_de_projet": "CM",
                        "echeance_principale": "2027-06-30",
                        "perimetre_inclus": [], "perimetre_exclu": []},
            "documents_analyses": [], "parties_prenantes": [], "faits_identifies": [],
            "lacunes": [], "questions": [], "pret_pour_creation": True
        }
        self.ecrire("_amorcage/pre_analyse.json", pa)
        code, out = lancer_validateur(self.tmp, ["--pre-analyse"])
        self.assertEqual(code, 0, out)

    def test_pre_analyse_incoherent(self):
        pa = {
            "tour": 1,
            "projet": {"nom_propose": "Test", "code_propose": "TST", "objet": "obj",
                        "commanditaire": "", "chef_de_projet": "CM",
                        "echeance_principale": "2027-06-30",
                        "perimetre_inclus": [], "perimetre_exclu": []},
            "documents_analyses": [], "parties_prenantes": [], "faits_identifies": [],
            "lacunes": [{"id": "L1", "rubrique": "objet", "description": "manque", "bloquante": True, "hypothese": ""}],
            "questions": [], "pret_pour_creation": True
        }
        self.ecrire("_amorcage/pre_analyse.json", pa)
        code, out = lancer_validateur(self.tmp, ["--pre-analyse"])
        self.assertEqual(code, 1)
        self.assertIn("pret_pour_creation", out)

    def test_id_mauvaise_serie(self):
        # un Q-001 dans faits.json au lieu de registre.json
        faits = json.loads((self.tmp / "etat" / "faits.json").read_text(encoding="utf-8"))
        faits["faits"] = [{"id": "Q-001", "texte": "x", "origine": "test",
                            "date_origine": "2026-11-01", "statut": "actif",
                            "remplace_le": None, "remplace_par": None,
                            "themes": [], "audience": "projet", "liens": []}]
        self.ecrire("etat/faits.json", faits)
        code, out = lancer_validateur(self.tmp)
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
