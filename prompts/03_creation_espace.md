# Tâche : créer l'espace du projet

Date du jour : {{date_du_jour}}

La pré-analyse est terminée (`_amorcage/pre_analyse.json`, `pret_pour_creation: true`). Ta tâche est de remplir l'état initial du projet à partir de la pré-analyse, des réponses du chef de projet et des documents déposés.

## Entrées à lire
- `_amorcage/pre_analyse.json`
- `_amorcage/description_initiale.md` et `_amorcage/reponses.md`
- Les documents de `0_Entrants/` (extraction avec `python outils/extraire_texte.py` si nécessaire)
- `outils/formats_etat.md` (format obligatoire de chaque fichier d'état)

## Étapes
1. **`etat/projet.json`** : objet, périmètre (inclus et exclu), commanditaire, chef de projet, parties prenantes, échéance principale. Inscris chaque hypothèse retenue en `H-xx`, avec le statut `a_confirmer`.
2. **`etat/faits.json`** : un fait `F-xxx` par information vérifiable trouvée dans un document ou une réponse : chiffre, date, engagement, décision passée. Une phrase par fait. Origine précise obligatoire.
3. **`etat/registre.json`** :
   - une question `Q-xxx` par lacune non bloquante, et une par hypothèse à confirmer ;
   - les décisions déjà prises citées dans les documents (`D-xxx`) ;
   - les actions déjà engagées (`A-xxx`), avec porteur et échéance si connus ;
   - les risques (`R-xx`) explicitement cités dans les documents, plus au plus 5 risques que tu déduis, marqués `"origine": "Déduit par l'assistant"` ;
   - les dépendances (`DEP-xx`) envers d'autres projets ou fournisseurs.
4. **`etat/planning.json`** : les jalons (`J-xx`) datés ou datables trouvés dans les documents ; l'échéance principale est toujours un jalon.
5. **`etat/reunions.json`** : une réunion de lancement `REU-01`, au statut `a_planifier`, avec ses participants proposés et un ordre du jour qui couvre les questions `Q-xxx` les plus urgentes.
6. **`etat/sujets.json`** : les sujets à instruire avant décision (`S-xx`), regroupés par chantier, avec les questions du registre qui s'y rattachent.
7. Exécute `python outils/valider_etat.py`. Corrige jusqu'à obtenir le code retour 0.
8. **`2_Projet/00_Note_de_cadrage.md`** : note rédigée pour l'équipe projet, de 2 pages au plus. Sections : Objet, Périmètre, Parties prenantes, Échéances, Hypothèses à confirmer, Questions ouvertes. Cite les identifiants (Q-001, H-01…) plutôt que de répéter leur contenu.
9. **`AGENTS.md`** : remplace la section « Contexte du projet » par 10 à 20 lignes : nom, code, objet, sponsor, chef de projet, échéance principale, parties prenantes clés, fournisseurs en jeu. Ne touche pas aux autres sections.
10. Range chaque document traité : `python outils/ranger_entrant.py "0_Entrants/<fichier>"`. Le script le déplace dans `2_Projet/Sources/`.

## Règles
- Aucune information sans origine. En cas de doute, crée une question plutôt qu'un fait.
- Attribution de l'`audience` :
  - `perso` : éléments issus de notes personnelles du chef de projet (jamais cités dans un livrable hors `1_Perso/`) ;
  - `direction` : décisions, questions, risques et jalons qui relèvent d'un arbitrage de la Direction ou du COPIL (budget, échéance principale, choix stratégique du fournisseur) ;
  - `public` : uniquement ce qui est destiné à être communiqué à l'ensemble des agents (calendrier de mise en service, communiqué) — jamais de données fournisseurs ni de détails internes ;
  - `projet` : tout le reste, par défaut. En cas de doute, choisis l'audience la plus restreinte et signale-le.
- Dates au format AAAA-MM-JJ dans les JSON.

## Réponse finale
Résumé au format habituel. Dans **Modifié**, donne le nombre d'éléments créés par type. Dans **À faire**, liste les 3 questions les plus urgentes et la proposition de date de la réunion de lancement.
