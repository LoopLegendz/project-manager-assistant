#!/usr/bin/env python3
"""Extrait le texte d'un fichier .docx, .pptx, .pdf, .txt ou .md et l'écrit sur la sortie standard.

Usage : python outils/extraire_texte.py "<chemin du fichier>"
"""

import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")


def extraire_docx(path: Path) -> str:
    from docx import Document
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extraire_pptx(path: Path) -> str:
    from pptx import Presentation
    prs = Presentation(str(path))
    lignes = []
    for i, slide in enumerate(prs.slides, 1):
        lignes.append(f"--- diapositive {i} ---")
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    t = "".join(r.text for r in para.runs)
                    if t.strip():
                        lignes.append(t)
    return "\n".join(lignes)


def extraire_pdf(path: Path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    lignes = []
    for i, page in enumerate(reader.pages, 1):
        lignes.append(f"--- page {i} ---")
        lignes.append(page.extract_text() or "")
    return "\n".join(lignes)


def main() -> int:
    if len(sys.argv) != 2:
        print('Usage : python outils/extraire_texte.py "<chemin du fichier>"', file=sys.stderr)
        return 1
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"ERREUR : {path} n'existe pas", file=sys.stderr)
        return 1
    ext = path.suffix.lower()
    try:
        if ext == ".docx":
            print(extraire_docx(path))
        elif ext == ".pptx":
            print(extraire_pptx(path))
        elif ext == ".pdf":
            print(extraire_pdf(path))
        elif ext in (".txt", ".md"):
            print(path.read_text(encoding="utf-8"))
        else:
            print(f"ERREUR : format {ext} non pris en charge (.docx, .pptx, .pdf, .txt, .md)", file=sys.stderr)
            return 1
    except ImportError as e:
        print(f"ERREUR : bibliothèque manquante ({e}). Installer : pip install python-docx python-pptx pypdf", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERREUR : {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
