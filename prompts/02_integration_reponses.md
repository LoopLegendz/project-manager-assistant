# Tâche : intégrer les réponses du chef de projet à la pré-analyse

Date du jour : {{date_du_jour}}
Tour : {{numero_tour}} (2 tours au maximum)

<reponses>
{{reponses_du_tour}}
</reponses>

## Étapes
1. Lis `_amorcage/pre_analyse.json`.
2. Pour chaque réponse :
   - reporte l'information dans la rubrique concernée de `projet` ou de `parties_prenantes`, avec l'origine « Réponse du chef de projet, {{date_du_jour}} » ;
   - supprime la lacune correspondante.
3. Si une réponse est « je ne sais pas », vide ou évasive :
   - lacune bloquante : garde la lacune et propose une hypothèse dans le champ `hypothese` de la lacune (par exemple « Sponsor supposé : le DSI »).
   - lacune non bloquante : passe-la à `bloquante: false`, elle deviendra une question du registre.
4. Si une réponse contredit un document, garde la réponse du chef de projet. Ajoute à `faits_identifies` un élément qui signale l'écart, avec les deux origines.
5. Décide de la suite :
   - s'il reste des lacunes bloquantes et que le tour est 1 : rédige au plus 3 nouvelles questions, en suivant les règles de la pré-analyse, et laisse `pret_pour_creation` à `false` ;
   - s'il reste des lacunes bloquantes et que le tour est 2 : retiens les hypothèses proposées et passe `pret_pour_creation` à `true`. La création les inscrira comme hypothèses `H-xx` à confirmer ;
   - sinon : vide `questions` et passe `pret_pour_creation` à `true`.
6. Incrémente `tour`, réécris `_amorcage/pre_analyse.json` et exécute `python outils/valider_etat.py --pre-analyse`.

## Réponse finale
Une seule ligne : `Prêt pour la création.` ou `<n> nouvelles questions.`
