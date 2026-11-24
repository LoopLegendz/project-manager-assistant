# Formats de l'état du projet

Ce fichier est généré automatiquement depuis `schemas_etat.json` (source unique).
Ne pas l'éditer à la main : modifier `schemas_etat.json` puis relancer `python outils/generer_formats_md.py`.

- Une chaîne vide `""` signifie « non renseigné ». Ne jamais inventer une valeur pour remplir un champ.
- `null` est accepté pour les champs marqués `date|null` ou `id|null`.
- Dates : AAAA-MM-JJ.
- Champs communs à tous les éléments de liste : `id`, `origine`, `audience`, `liens`.

## Énumérations

- `audience` : perso | projet | direction | public
- `statut_question` : ouverte | repondue | abandonnee
- `statut_decision` : proposee | prise | remplacee
- `statut_action` : a_faire | en_cours | faite | abandonnee
- `statut_risque` : ouvert | maitrise | clos
- `statut_dependance` : ouverte | levee
- `statut_jalon` : prevu | atteint | decale
- `statut_reunion` : a_planifier | planifiee | tenue | annulee
- `statut_sujet` : a_instruire | instruit
- `statut_fait` : actif | remplace
- `statut_hypothese` : a_confirmer | confirmee | infirmee
- `probabilite` : faible | moyenne | forte
- `impact` : faible | moyen | fort
- `format_reponse` : texte | date | liste | oui_non

## Patterns d'identifiants

- `Q-NN` → `etat/registre.json` > `questions` (regex `^Q-\d{3}$`)
- `D-NN` → `etat/registre.json` > `decisions` (regex `^D-\d{3}$`)
- `A-NN` → `etat/registre.json` > `actions` (regex `^A-\d{3}$`)
- `R-NN` → `etat/registre.json` > `risques` (regex `^R-\d{2}$`)
- `DEP-NN` → `etat/registre.json` > `dependances` (regex `^DEP-\d{2}$`)
- `F-NN` → `etat/faits.json` > `faits` (regex `^F-\d{3}$`)
- `J-NN` → `etat/planning.json` > `jalons` (regex `^J-\d{2}$`)
- `REU-NN` → `etat/reunions.json` > `reunions` (regex `^REU-\d{2}$`)
- `H-NN` → `etat/projet.json` > `hypotheses` (regex `^H-\d{2}$`)
- `S-NN` → `etat/sujets.json` > `sujets` (regex `^S-\d{2}$`)

## `etat/projet.json`

```json
{
  "exemple_structure": {
    "nom": "string",
    "code": "string",
    "objet": "string",
    "commanditaire": "string",
    "chef_de_projet": "string",
    "echeance_principale": "date",
    "perimetre_inclus": [
      "string"
    ],
    "perimetre_exclu": [
      "string"
    ],
    "parties_prenantes": [
      {
        "nom": "string",
        "role": "string",
        "organisation": "string",
        "origine": "string",
        "audience": "audience"
      }
    ],
    "hypotheses": [
      {
        "id": "id:H",
        "texte": "string",
        "statut": "statut_hypothese",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `nom` : string
- `code` : string
- `objet` : string
- `commanditaire` : string
- `chef_de_projet` : string
- `echeance_principale` : date
- `perimetre_inclus` : liste
- `perimetre_exclu` : liste
- `parties_prenantes` : liste d'objets
  champs de chaque élément :
    - `nom` : string
    - `role` : string
    - `organisation` : string
    - `origine` : string
    - `audience` : audience
- `hypotheses` : liste d'objets
  champs de chaque élément :
    - `id` : id:H
    - `texte` : string
    - `statut` : statut_hypothese
    - `origine` : string
    - `audience` : audience
    - `liens` : liste

## `etat/faits.json`

```json
{
  "exemple_structure": {
    "faits": [
      {
        "id": "id:F",
        "texte": "string",
        "origine": "string",
        "date_origine": "date",
        "statut": "statut_fait",
        "remplace_le": "id|null",
        "remplace_par": "id|null",
        "themes": [
          "string"
        ],
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `faits` : liste d'objets
  champs de chaque élément :
    - `id` : id:F
    - `texte` : string
    - `origine` : string
    - `date_origine` : date
    - `statut` : statut_fait
    - `remplace_le` : id|null
    - `remplace_par` : id|null
    - `themes` : liste
    - `audience` : audience
    - `liens` : liste

## `etat/registre.json`

```json
{
  "exemple_structure": {
    "questions": [
      {
        "id": "id:Q",
        "intitule": "string",
        "posee_a": "string",
        "statut": "statut_question",
        "reponse": "string",
        "date_ouverture": "date",
        "date_reponse": "date|null",
        "echeance": "date|null",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ],
    "decisions": [
      {
        "id": "id:D",
        "intitule": "string",
        "decideur": "string",
        "date": "date",
        "statut": "statut_decision",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ],
    "actions": [
      {
        "id": "id:A",
        "intitule": "string",
        "porteur": "string",
        "echeance": "date",
        "statut": "statut_action",
        "date_cloture": "date|null",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ],
    "risques": [
      {
        "id": "id:R",
        "intitule": "string",
        "probabilite": "probabilite",
        "impact": "impact",
        "parade": "string",
        "statut": "statut_risque",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ],
    "dependances": [
      {
        "id": "id:DEP",
        "intitule": "string",
        "envers": "string",
        "echeance": "date|null",
        "statut": "statut_dependance",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `questions` : liste d'objets
  champs de chaque élément :
    - `id` : id:Q
    - `intitule` : string
    - `posee_a` : string
    - `statut` : statut_question
    - `reponse` : string
    - `date_ouverture` : date
    - `date_reponse` : date|null
    - `echeance` : date|null
    - `origine` : string
    - `audience` : audience
    - `liens` : liste
- `decisions` : liste d'objets
  champs de chaque élément :
    - `id` : id:D
    - `intitule` : string
    - `decideur` : string
    - `date` : date
    - `statut` : statut_decision
    - `origine` : string
    - `audience` : audience
    - `liens` : liste
- `actions` : liste d'objets
  champs de chaque élément :
    - `id` : id:A
    - `intitule` : string
    - `porteur` : string
    - `echeance` : date
    - `statut` : statut_action
    - `date_cloture` : date|null
    - `origine` : string
    - `audience` : audience
    - `liens` : liste
- `risques` : liste d'objets
  champs de chaque élément :
    - `id` : id:R
    - `intitule` : string
    - `probabilite` : probabilite
    - `impact` : impact
    - `parade` : string
    - `statut` : statut_risque
    - `origine` : string
    - `audience` : audience
    - `liens` : liste
- `dependances` : liste d'objets
  champs de chaque élément :
    - `id` : id:DEP
    - `intitule` : string
    - `envers` : string
    - `echeance` : date|null
    - `statut` : statut_dependance
    - `origine` : string
    - `audience` : audience
    - `liens` : liste

## `etat/planning.json`

```json
{
  "exemple_structure": {
    "jalons": [
      {
        "id": "id:J",
        "intitule": "string",
        "date": "date",
        "statut": "statut_jalon",
        "historique": [
          "date"
        ],
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `jalons` : liste d'objets
  champs de chaque élément :
    - `id` : id:J
    - `intitule` : string
    - `date` : date
    - `statut` : statut_jalon
    - `historique` : liste
    - `origine` : string
    - `audience` : audience
    - `liens` : liste

## `etat/reunions.json`

```json
{
  "exemple_structure": {
    "reunions": [
      {
        "id": "id:REU",
        "intitule": "string",
        "date": "date|null",
        "statut": "statut_reunion",
        "participants": [
          "string"
        ],
        "objectif": "string",
        "ordre_du_jour": [
          "string"
        ],
        "compte_rendu": "string|null",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `reunions` : liste d'objets
  champs de chaque élément :
    - `id` : id:REU
    - `intitule` : string
    - `date` : date|null
    - `statut` : statut_reunion
    - `participants` : liste
    - `objectif` : string
    - `ordre_du_jour` : liste
    - `compte_rendu` : string|null
    - `origine` : string
    - `audience` : audience
    - `liens` : liste

## `etat/sujets.json`

```json
{
  "exemple_structure": {
    "sujets": [
      {
        "id": "id:S",
        "chantier": "string",
        "intitule": "string",
        "a_savoir_avant_decision": [
          "string"
        ],
        "criteres_de_choix": [
          "string"
        ],
        "statut": "statut_sujet",
        "origine": "string",
        "audience": "audience",
        "liens": [
          "id"
        ]
      }
    ]
  }
}
```

Champs :
- `sujets` : liste d'objets
  champs de chaque élément :
    - `id` : id:S
    - `chantier` : string
    - `intitule` : string
    - `a_savoir_avant_decision` : liste
    - `criteres_de_choix` : liste
    - `statut` : statut_sujet
    - `origine` : string
    - `audience` : audience
    - `liens` : liste

## `_amorcage/pre_analyse.json` (pré-analyse)

```json
{
  "exemple_structure": {
    "tour": "int",
    "projet": {
      "nom_propose": "string",
      "code_propose": "string",
      "objet": "string",
      "commanditaire": "string",
      "chef_de_projet": "string",
      "echeance_principale": "date",
      "perimetre_inclus": [
        "string"
      ],
      "perimetre_exclu": [
        "string"
      ]
    },
    "documents_analyses": [
      {
        "fichier": "string",
        "nature": "string",
        "resume": "string",
        "audience_suggeree": "audience"
      }
    ],
    "parties_prenantes": [
      {
        "nom": "string",
        "role": "string",
        "origine": "string"
      }
    ],
    "faits_identifies": [
      {
        "texte": "string",
        "origine": "string"
      }
    ],
    "lacunes": [
      {
        "id": "string",
        "rubrique": "string",
        "description": "string",
        "bloquante": "bool",
        "hypothese": "string"
      }
    ],
    "questions": [
      {
        "id": "string",
        "lacune": "string",
        "question": "string",
        "pourquoi": "string",
        "format_reponse": "format_reponse",
        "proposition_par_defaut": "string"
      }
    ],
    "pret_pour_creation": "bool"
  }
}
```

- Règle spéciale : pret_pour_creation == true ssi aucune lacune bloquante

