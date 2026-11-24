"""Range un fichier traité : 0_Entrants/<fichier> vers 2_Projet/Sources/, sans jamais écraser."""

import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
ENTRANTS = RACINE / "0_Entrants"
SOURCES = RACINE / "2_Projet" / "Sources"


def main() -> int:
    if len(sys.argv) != 2:
        print('Usage : python outils/ranger_entrant.py "0_Entrants/<fichier>"')
        return 1
    source = (RACINE / sys.argv[1]).resolve()
    if source.parent != ENTRANTS.resolve() or not source.is_file():
        print(f"ERREUR : {sys.argv[1]} n'est pas un fichier de 0_Entrants")
        return 1
    SOURCES.mkdir(parents=True, exist_ok=True)
    cible, n = SOURCES / source.name, 2
    while cible.exists():
        cible = SOURCES / f"{source.stem}_{n}{source.suffix}"
        n += 1
    shutil.move(str(source), str(cible))
    print(f"OK : rangé dans {cible.relative_to(RACINE).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
