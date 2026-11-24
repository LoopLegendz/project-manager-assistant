#!/usr/bin/env python3
"""Seul module qui appelle Vibe CLI. Un verrou par projet garantit qu'un seul run tourne à la fois.

Usage :
    from vibe_runner import run_vibe
    resultat = run_vibe(projet=Path("projets/mon-projet"), prompt_text="...", session_id=None)
"""

import json
import os
import subprocess
import time
import uuid
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
VIBE_HOME = APP / "vibe_home"


class RunOccupeError(Exception):
    """Levée quand un autre run est déjà en cours sur ce projet."""
    pass


def _lock_path(projet: Path) -> Path:
    return projet / "_runs" / ".lock"


def _acquerir_lock(projet: Path, timeout_secondes: float = 120.0) -> Path | None:
    """Acquiert le verrou du projet (fichier .lock avec PID et timestamp). Retourne le chemin du lock ou None si occupé."""
    lock = _lock_path(projet)
    lock.parent.mkdir(parents=True, exist_ok=True)
    debut = time.time()
    while time.time() - debut < timeout_secondes:
        try:
            # O_CREAT | O_EXCL : échoue si le fichier existe déjà
            fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f"pid={os.getpid()} debut={time.time()}\n".encode())
            os.close(fd)
            return lock
        except FileExistsError:
            # vérifie si le lock est périmé (plus de 30 min = probablement un crash)
            try:
                age = time.time() - lock.stat().st_mtime
                if age > 1800:
                    lock.unlink()
                    continue
            except FileNotFoundError:
                continue
            time.sleep(0.5)
    return None


def _liberer_lock(lock: Path | None) -> None:
    if lock and lock.exists():
        try:
            lock.unlink()
        except OSError:
            pass


def run_vibe(
    projet: Path,
    prompt_text: str,
    session_id: str | None = None,
    max_turns: int = 40,
    max_price: float = 1.0,
    thinking: str = "high",
    timeout_verrou: float = 120.0,
) -> dict:
    """Lance un run Vibe headless sur le projet, avec verrou anti-concurrence.

    Retourne {"code": int, "reponse": str, "export": dict, "run_dir": str, "duree_s": float}
    Lève RunOccupeError si le verrou n'a pas pu être acquis.
    """
    projet = Path(projet).resolve()
    lock = _acquerir_lock(projet, timeout_verrou)
    if lock is None:
        raise RunOccupeError(f"Un autre run est déjà en cours sur {projet.name} (verrou présent depuis plus de {timeout_verrou}s)")
    try:
        run_dir = projet / "_runs" / uuid.uuid4().hex[:8]
        run_dir.mkdir(parents=True, exist_ok=True)
        prompt_file = run_dir / "prompt.md"
        prompt_file.write_text(prompt_text, encoding="utf-8")

        cmd = [
            "vibe", "--prompt-file", str(prompt_file),
            "--agent", "chef-de-projet", "--workdir", str(projet), "--trust",
            "--output", "json", "--output-dir", str(run_dir),
            "--max-turns", str(max_turns), "--max-price", str(max_price),
        ]
        if session_id:
            cmd += ["--resume", session_id]  # --thinking et --model sont interdits sur une session reprise
        else:
            cmd += ["--thinking", thinking]

        env = {**os.environ, "VIBE_HOME": str(VIBE_HOME), "PYTHONUTF8": "1"}
        t0 = time.time()
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
        duree = time.time() - t0

        export_path = run_dir / "export.json"
        export = {}
        if export_path.exists():
            export = json.loads(export_path.read_text(encoding="utf-8"))

        return {
            "code": proc.returncode,
            "reponse": proc.stdout,
            "stderr": proc.stderr,
            "export": export,
            "run_dir": str(run_dir.relative_to(projet)),
            "duree_s": round(duree, 1),
        }
    finally:
        _liberer_lock(lock)
