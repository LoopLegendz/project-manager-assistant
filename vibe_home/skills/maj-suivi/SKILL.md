---
name: maj-suivi
description: Met à jour le suivi du projet à partir d'une instruction courte du chef de projet, par exemple « clos A-005 », « réponse à Q-003 : ... », « nouveau risque : ... », « décalage du jalon J-02 au 15/03 », « prépare REU-03 ».
user-invocable: true
---

# Mettre à jour le suivi

1. **Interpréter.** Identifie la ou les opérations demandées et les identifiants visés. Si un identifiant cité n'existe pas, ou si l'instruction admet deux lectures, ne modifie rien : pose une seule question de clarification et arrête-toi.
2. **Appliquer**, avec l'origine « Chef de projet, conversation du <date du jour> » :
   - « clos A-xxx » : statut `faite`, date de clôture ;
   - « réponse à Q-xxx : … » : statut `repondue`, réponse, date. Si la réponse établit un fait, crée aussi un fait `F-xxx` lié à la question ;
   - « nouveau risque / action / question / décision » : nouvel élément, audience selon la règle d'attribution (voir P3) : `direction` si l'élément relève d'un arbitrage Direction/COPIL (budget, échéance, choix stratégique du fournisseur), `perso` si issu de notes personnelles, `public` si destiné à être communiqué à tous, `projet` sinon — sauf indication contraire du chef de projet ;
   - décalage d'un jalon : nouvelle date, ancienne date conservée dans `historique`. Signale les actions et réunions dont l'échéance dépasse désormais le jalon ;
   - « prépare REU-xx » : complète la fiche de la réunion dans `etat/reunions.json` (objectif, participants, ordre du jour, questions `Q-xxx` à poser, décisions attendues). Rédige `1_Perso/AAAA-MM-JJ_preparation_REU-xx.md` : points à obtenir, points de vigilance, questions dans l'ordre.
3. **Valider.** `python outils/valider_etat.py`, puis corrige jusqu'au code retour 0.
4. **Contrôler la cohérence.** Signale toute action ouverte rattachée à une question désormais close, et toute échéance passée.

Réponse finale : le résumé habituel, en 6 lignes au plus pour une opération simple.
