---
name: traite-entrants
description: Traite les fichiers déposés dans 0_Entrants (compte rendu, transcript, mail, document reçu). Utilise ce skill quand le chef de projet dit « traite les entrants », « j'ai déposé un fichier » ou équivalent.
user-invocable: true
---

# Traiter les entrants

Pour chaque fichier présent dans `0_Entrants/`, dans l'ordre alphabétique :

1. **Extraire.** Si le fichier est un .docx, .pptx ou .pdf, exécute `python outils/extraire_texte.py "0_Entrants/<fichier>"`. Sinon, lis-le.
2. **Qualifier.** Indique la nature du fichier (compte rendu de réunion, transcript, mail, document reçu) et son audience. Un document qui vient d'un fournisseur reste rattaché à ce fournisseur.
3. **Si c'est une réunion**, écris `2_Projet/Comptes_rendus/AAAA-MM-JJ_<objet>.md`. Sections :
   - Décisions ;
   - Réponses obtenues (avec l'identifiant `Q-xxx` concerné) ;
   - Actions (porteur, échéance) ;
   - Points sans réponse ;
   - Engagements d'un fournisseur, cités mot pour mot entre guillemets.

   Si la réunion existe dans `etat/reunions.json`, passe-la à `tenue` et relie le compte rendu.
4. **Mettre à jour l'état.** Dans `etat/registre.json` et `etat/faits.json`, chaque élément créé ou modifié porte l'origine « <nom du fichier>, <date>, p. <n> si connue » :
   - réponse à une question : statut `repondue`, réponse, date ;
   - nouvelle décision, action, risque ou question ;
   - nouveau fait, ou fait remplacé.
5. **Contrôler.** Compare chaque nouvelle information à `etat/faits.json` et `etat/projet.json`. Liste :
   - (a) ce qui contredit un fait acquis : cite les deux identifiants ou origines ;
   - (b) ce qui change une hypothèse ou un scénario ;
   - (c) ce qui appelle une relance (question restée sans réponse, engagement sans date).
6. **Valider.** `python outils/valider_etat.py`, puis corrige jusqu'au code retour 0.
7. **Proposer un message de suivi** si une relance est nécessaire. Écris-le dans `4_Public/` (s'il est destiné à un tiers) ou `2_Projet/` (s'il est destiné à l'équipe), sous la forme `AAAA-MM-JJ_message_<destinataire>.md`. N'envoie rien.
8. **Ranger.** `python outils/ranger_entrant.py "0_Entrants/<fichier>"`.

Réponse finale : le résumé habituel. **À signaler** reprend les points (a), (b) et (c) de l'étape 5.
