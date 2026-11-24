# Espace projet

## Contexte du projet
<!-- Section remplie par l'assistant à la création du projet (prompt P3). -->

Projet non encore initialisé.

## Organisation du dossier
- `etat/` : état du projet en JSON, seule source de vérité. Formats décrits dans `outils/schemas_etat.json` (schéma machine) et `outils/formats_etat.md` (version lisible).
- `memoire/preferences.md` : façon de travailler attendue par le chef de projet.
- `0_Entrants/` : fichiers déposés, à traiter.
- `1_Perso/`, `2_Projet/`, `3_Direction/`, `4_Public/` : documents par audience.
- `2_Projet/Sources/` : fichiers reçus, une fois traités.
- `_amorcage/` : traces de la création du projet. Ne pas modifier.

## Commandes disponibles
- `python outils/valider_etat.py` : vérifie l'état. À lancer après toute modification de `etat/`.
- `python outils/extraire_texte.py "<fichier>"` : texte d'un .docx, .pptx, .pdf, .txt ou .md.
- `python outils/ranger_entrant.py "0_Entrants/<fichier>"` : range un fichier traité dans `2_Projet/Sources/`.
