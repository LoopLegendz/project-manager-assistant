// registre.js — vues génériques du registre : tableaux filtrables, pills, drawer au clic.
// Vues : actions, questions, decisions, risques, dependances, faits, planning(jalons), reunions, sujets.

(function () {
  const AUJ = new Date().toISOString().slice(0, 10);

  // config : cle -> { serie, titre, colonnes: [{cle, label, render}], statuts: [...] }
  const CONFIG = {
    questions: {
      serie: 'questions', titre: 'Questions',
      source: e => (e.registre || {}).questions || [],
      statuts: ['ouverte', 'repondue', 'abandonnee'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'statut', pill: true }, { cle: 'posee_a' }, { cle: 'echeance' },
      ],
    },
    decisions: {
      serie: 'decisions', titre: 'Décisions',
      source: e => (e.registre || {}).decisions || [],
      statuts: ['proposee', 'prise', 'remplacee'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'statut', pill: true }, { cle: 'decideur' }, { cle: 'date' },
      ],
    },
    actions: {
      serie: 'actions', titre: 'Actions',
      source: e => (e.registre || {}).actions || [],
      statuts: ['a_faire', 'en_cours', 'faite', 'abandonnee'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'statut', pill: true }, { cle: 'porteur' },
        { cle: 'echeance', retard: true },
      ],
    },
    risques: {
      serie: 'risques', titre: 'Risques',
      source: e => (e.registre || {}).risques || [],
      statuts: ['ouvert', 'maitrise', 'clos'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'probabilite', pill: true }, { cle: 'impact', pill: true },
        { cle: 'statut', pill: true }, { cle: 'parade', dim: true },
      ],
    },
    dependances: {
      serie: 'dependances', titre: 'Dépendances',
      source: e => (e.registre || {}).dependances || [],
      statuts: ['ouverte', 'levee'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'envers' }, { cle: 'statut', pill: true }, { cle: 'echeance' },
      ],
    },
    faits: {
      serie: 'faits', titre: 'Faits et chiffres',
      source: e => (e.faits || {}).faits || [],
      statuts: ['actif', 'remplace'],
      colonnes: [
        { cle: 'id' }, { cle: 'texte', large: true },
        { cle: 'statut', pill: true }, { cle: 'date_origine' }, { cle: 'origine', dim: true },
      ],
    },
    planning: {
      serie: 'jalons', titre: 'Planning — jalons',
      source: e => (e.planning || {}).jalons || [],
      statuts: ['prevu', 'atteint', 'decale'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'date' }, { cle: 'statut', pill: true },
      ],
    },
    reunions: {
      serie: 'reunions', titre: 'Réunions',
      source: e => (e.reunions || {}).reunions || [],
      statuts: ['a_planifier', 'planifiee', 'tenue', 'annulee'],
      colonnes: [
        { cle: 'id' }, { cle: 'intitule', large: true },
        { cle: 'date' }, { cle: 'statut', pill: true },
        { cle: 'participants', render: el => (el.participants || []).join(', ') },
      ],
    },
    sujets: {
      serie: 'sujets', titre: 'Sujets à instruire',
      source: e => (e.sujets || {}).sujets || [],
      statuts: ['a_instruire', 'instruit'],
      colonnes: [
        { cle: 'id' }, { cle: 'chantier' }, { cle: 'intitule', large: true },
        { cle: 'statut', pill: true },
      ],
    },
  };

  function ouvrirFiche(el, serie) {
    const champs = Object.entries(el).filter(([k]) => k !== 'liens');
    const body = `<dl>${champs.map(([k, v]) => {
      let val = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
      if (['intitule', 'texte', 'origine', 'parade', 'question'].includes(k)) val = liens(val);
      return `<dt>${ech(k)}</dt><dd>${val}</dd>`;
    }).join('')}</dl>`
      + (el.liens && el.liens.length
        ? `<h4>Liens</h4>${el.liens.map(l => `<div class="rel"><span class="k">${ech(l)}</span><span><a class="ref" href="#/voir/${ech(l)}">ouvrir la fiche</a></span></div>`).join('')}`
        : '');
    ouvrirDrawer(serie, `${el.id} — ${el.intitule || el.texte || ''}`, pill(el.statut) + ' ' + badgeAud(el.audience), body);
  }

  function renderCellule(el, col) {
    if (col.cle === 'id') return `<a class="ref" href="#/voir/${ech(el.id)}">${ech(el.id)}</a>`;
    if (col.pill) return pill(el[col.cle]);
    let v = col.render ? col.render(el) : (el[col.cle] ?? '');
    if (col.retard && el.echeance && el.echeance < AUJ && el.statut !== 'faite' && el.statut !== 'abandonnee') {
      return `<span class="late"><b>${ech(v)}</b></span>`;
    }
    if (col.large) return liens(v);
    return ech(v);
  }

  function vueTableau(cle) {
    const cfg = CONFIG[cle];
    VUES[cle] = function (view, params) {
      const e = window.ETAT || {};
      let liste = cfg.source(e);
      let filtreStatut = '', filtreAud = '', filtreTexte = '';

      view.innerHTML = `
        <div class="hd"><h3>${ech(cfg.titre)}</h3><span class="more" id="count"></span></div>
        <div class="filters">
          <select id="f-statut"><option value="">Tous statuts</option>${cfg.statuts.map(s => `<option>${s}</option>`).join('')}</select>
          <select id="f-aud"><option value="">Toutes audiences</option>${['perso', 'projet', 'direction', 'public'].map(a => `<option>${a}</option>`).join('')}</select>
          <input id="f-txt" type="text" placeholder="Filtrer le texte...">
        </div>
        <div class="card flush"><table>
          <thead><tr>${cfg.colonnes.map(c => `<th>${ech(c.label || c.cle)}</th>`).join('')}<th>Audience</th></tr></thead>
          <tbody id="tbody"></tbody>
        </table></div>`;

      const tbody = view.querySelector('#tbody');
      function maj() {
        const res = liste.filter(el =>
          (!params || !params.filtre || params.filtre(el)) &&
          (!filtreStatut || el.statut === filtreStatut) &&
          (!filtreAud || el.audience === filtreAud) &&
          (!filtreTexte || JSON.stringify(el).toLowerCase().includes(filtreTexte.toLowerCase())));
        view.querySelector('#count').textContent = `${res.length} / ${liste.length}`;
        tbody.innerHTML = res.length ? res.map(el =>
          `<tr class="clk" data-id="${ech(el.id)}">${cfg.colonnes.map(c => `<td class="${c.large ? '' : 'nowrap dim'}">${renderCellule(el, c)}</td>`).join('')}<td>${badgeAud(el.audience)}</td></tr>`).join('')
          : `<tr><td colspan="${cfg.colonnes.length + 1}"><p class="empty">Aucun élément.</p></td></tr>`;
        tbody.querySelectorAll('tr.clk').forEach(tr => tr.addEventListener('click', () => {
          const el = liste.find(x => x.id === tr.dataset.id);
          if (el) ouvrirFiche(el, cfg.serie);
        }));
      }
      view.querySelector('#f-statut').addEventListener('change', e => { filtreStatut = e.target.value; maj(); });
      view.querySelector('#f-aud').addEventListener('change', e => { filtreAud = e.target.value; maj(); });
      view.querySelector('#f-txt').addEventListener('input', e => { filtreTexte = e.target.value; maj(); });
      maj();
    };
  }

  Object.keys(CONFIG).forEach(vueTableau);

  // ---------- Vue Risques : matrice probabilité × impact au-dessus du tableau ----------
  (function () {
    const vueTab = VUES['risques'];
    const PROBAS = ['forte', 'moyenne', 'faible'];   // lignes, de haut en bas
    const IMPACTS = ['faible', 'moyen', 'fort'];      // colonnes, de gauche à droite
    const SCORE_P = { faible: 1, moyenne: 2, forte: 3 };
    const SCORE_I = { faible: 1, moyen: 2, fort: 3 };
    function couleur(p, i) {
      const s = SCORE_P[p] * SCORE_I[i];
      if (s >= 9) return 'var(--critical)';
      if (s >= 6) return 'var(--serious)';
      if (s >= 4) return 'var(--warning)';
      if (s >= 2) return 'var(--info)';
      return 'var(--good)';
    }
    let sel = null; // {p, i} cellule sélectionnée

    VUES['risques'] = function (view) {
      const e = window.ETAT || {};
      const risques = (e.registre || {}).risques || [];

      view.innerHTML = `
        <div class="hd"><h3>Risques</h3><span class="more">${risques.length} risque(s)</span></div>
        <div class="sec" style="margin-top:0"><h2>Matrice probabilité × impact <small>cliquez sur une case pour filtrer le tableau ; recliquez pour tout réafficher</small></h2>
          <div class="card">
            <div class="matrix" id="matrice"></div>
            <div class="legend">
              <span style="--c:var(--critical)">critique</span><span style="--c:var(--serious)">sérieux</span>
              <span style="--c:var(--warning)">à surveiller</span><span style="--c:var(--info)">modéré</span>
              <span style="--c:var(--good)">faible</span>
            </div>
          </div>
        </div>
        <div class="sec" id="zone-tab"></div>`;

      const matrice = view.querySelector('#matrice');
      const zone = view.querySelector('#zone-tab');
      const filtreSel = el => !sel || (el.probabilite === sel.p && el.impact === sel.i);

      function rendMatrice() {
        let html = '<div class="ax"></div>' + IMPACTS.map(i => `<div class="ax">impact ${i}</div>`).join('');
        for (const p of PROBAS) {
          html += `<div class="ax">proba ${p}</div>`;
          for (const i of IMPACTS) {
            const cellule = risques.filter(r => r.probabilite === p && r.impact === i);
            const on = sel && sel.p === p && sel.i === i ? ' on' : '';
            html += `<button class="${cellule.length ? '' : 'zero'}${on}" style="--c:${couleur(p, i)}" data-p="${p}" data-i="${i}">
              <span class="n">${cellule.length}</span>
              <span class="ids">${cellule.map(c => ech(c.id)).join(' ')}</span></button>`;
          }
        }
        matrice.innerHTML = html;
        matrice.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          const p = b.dataset.p, i = b.dataset.i;
          sel = (sel && sel.p === p && sel.i === i) ? null : { p, i };
          rendMatrice();
          vueTab(zone, { filtre: filtreSel });
        }));
      }

      rendMatrice();
      vueTab(zone, { filtre: filtreSel });
    };
  })();


  // plus de placeholders : toutes les vues ont une implémentation
  // (scenarios.js, checklists.js, reunions.js, interlocuteurs.js, planning.js, documents.js)
})();
