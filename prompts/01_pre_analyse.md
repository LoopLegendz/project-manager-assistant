# Tâche : pré-analyse d'un nouveau projet

Date du jour : {{date_du_jour}}

Un chef de projet ouvre un nouveau projet. Ta tâche est de comprendre ce qu'il a fourni, d'identifier ce qui manque pour créer l'espace projet, et de préparer les questions à lui poser. Tu ne crées PAS encore l'espace projet.

## Entrées
<description>
{{description_utilisateur}}
</description>

<documents>
{{liste_fichiers_0_Entrants}}
</documents>

## Étapes
1. Pour chaque document de `0_Entrants/` : si c'est un .docx, .pptx ou .pdf, exécute `python outils/extraire_texte.py "0_Entrants/<fichier>"` ; sinon lis-le directement.
2. Relève les informations utiles sur les rubriques suivantes : objet, commanditaire, chef de projet, échéance principale, périmètre, parties prenantes, gouvernance, planning, budget, contraintes, livrables attendus. Pour chacune, note l'origine (document et page, ou « description initiale »).
3. Évalue chaque rubrique. Une lacune est **bloquante** si elle porte sur l'une de ces six informations et qu'elle est absente ou contradictoire :
   - objet du projet ;
   - commanditaire ou sponsor ;
   - chef de projet ;
   - échéance principale ou horizon ;
   - périmètre (au moins ce qui est inclus) ;
   - au moins une partie prenante nommée.

   Toute autre lacune est **non bloquante** : elle deviendra une question du registre après la création.
4. Rédige les questions :
   - 7 au plus, les bloquantes d'abord ;
   - une seule information par question ;
   - formulées pour un chef de projet, sans jargon technique ;
   - pour chaque question, une proposition par défaut si les documents permettent d'en déduire une, sinon une chaîne vide.
5. Si deux documents se contredisent, crée une lacune bloquante sur ce point et cite les deux origines dans la question.
6. Écris le résultat dans `_amorcage/pre_analyse.json`, au format exact de l'exemple ci-dessous. Vérifie ensuite qu'il se relit comme du JSON valide en exécutant `python outils/valider_etat.py --pre-analyse`.

## Format de `_amorcage/pre_analyse.json` (exemple)
