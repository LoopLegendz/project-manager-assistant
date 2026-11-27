// router.js — coquille SPA : sidebar, routing par hash, recherche globale, drawer par ID.
// Les vues réelles s'enregistrent dans window.VUES[cle] = function(view, params) (R2+).

window.VUES = window.VUES || {};

const idProjet = window.location.pathname.split('/')[2];

const SECTIONS = [
  { grp: 'Projet', vues: [
    { cle: 'chat', label: 'Chat' },
    { cle: 'synthese', label: 'Synthèse' },
    { cle: 'cockpit', label: 'Cockpit' },
  ]},
  { grp: 'Pilotage', vues: [
    { cle: 'planning', label: 'Planning' },
    { cle: 'reunions', label: 'Réunions' },
    { cle: 'checklists', label: 'Check-lists' },
  ]},
  { grp: 'Décision', vues: [
    { cle: 'scenarios', label: 'Scénarios' },
    { cle: 'sujets', label: 'Sujets à instruire' },
  ]},
  { grp: 'Registre', vues: [
    { cle: 'actions', label: 'Actions', badge: 'retard' },
    { cle: 'questions', label: 'Questions', badge: 'ouvertes' },
    { cle: 'decisions', label: 'Décisions' },
    { cle: 'risques', label: 'Risques', badge: 'ouverts' },
    { cle: 'dependances', label: 'Dépendances' },
    { cle: 'faits', label: 'Faits et chiffres' },
  ]},
  { grp: 'Divers', vues: [
    { cle: 'documents', label: 'Documents' },
    { cle: 'interlocuteurs', label: 'Par interlocuteur' },
  ]},
];

const PREFIXE_VERS_VUE = { Q: 'questions', D: 'decisions', A: 'actions', R: 'risques', DEP: 'dependances', F: 'faits', J: 'planning', REU: 'reunions', S: 'sujets', H: 'questions' };

let ETAT = null;
window.ETAT = null; // exposé pour les vues (synthese.js, registre.js...)
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

function placeholder(view, cle) {
  const label = (SECTIONS.flatMap(s => s.vues).find(v => v.cle === cle) || {}).label || cle;
  view.innerHTML = `<div class="card"><h3>${ech(label)}</h3>
    <p class="lead">Vue en construction (prochain incrément du plan 10_Refonte_interface.md).</p>
    <p class="empty">Les données de cette section viendront de <code>GET /api/projets/${idProjet}/etat</code>.</p></div>`;
}

function rendreNav(hash) {
  const nav = document.getElementById('nav');
  let html = '';
  for (const s of SECTIONS) {
    html += `<div class="grp">${ech(s.grp)}</div>`;
    for (const v of s.vues) {
      const on = hash === v.cle ? ' class="on"' : '';
      let bd = '';
      if (v.badge && ETAT) {
        const n = badgeCount(v.badge);
        if (n > 0) bd = `<span class="bd${v.badge === 'retard' ? ' al' : ''}">${n}</span>`;
      }
      html += `<a href="#/${v.cle}"${on}>${ech(v.label)}${bd}</a>`;
    }
  }
  nav.innerHTML = html;
}

function badgeCount(type) {
  if (!ETAT) return 0;
  const reg = ETAT.registre || {};
  if (type === 'retard') return (reg.actions || []).filter(a => a.statut !== 'faite' && a.statut !== 'abandonnee' && a.echeance && a.echeance < AUJOURDHUI).length;
  if (type === 'ouvertes') return (reg.questions || []).filter(q => q.statut === 'ouverte').length;
  if (type === 'ouverts') return (reg.risques || []).filter(r => r.statut === 'ouvert').length;
  return 0;
}

// trouve un élément par son ID dans tout l'etat
// re-fetche l'état du projet et met à jour les badges de la nav (appelé après un chat)
async function rafraichirEtat() {
  try {
    ETAT = await API.etat();
    window.ETAT = ETAT;
    rendreNav(location.hash.replace(/^#\/?/, '').split('/')[0]);
  } catch (e) { /* silencieux : la page garde l'ancien état */ }
}
window.rafraichirEtat = rafraichirEtat;

function trouverElement(id) {
  if (!ETAT) return null;
  const reg = ETAT.registre || {};
  const sources = [
    ['questions', reg.questions || []], ['decisions', reg.decisions || []], ['actions', reg.actions || []],
    ['risques', reg.risques || []], ['dependances', reg.dependances || []],
    ['faits', (ETAT.faits || {}).faits || []], ['jalons', (ETAT.planning || {}).jalons || []],
    ['reunions', (ETAT.reunions || {}).reunions || []], ['sujets', (ETAT.sujets || {}).sujets || []],
    ['hypotheses', (ETAT.projet || {}).hypotheses || []],
  ];
  for (const [serie, liste] of sources) {
    const el = liste.find(e => e.id === id);
    if (el) return { el, serie };
  }
  return null;
}

function voirId(id) {
  const trouve = trouverElement(id);
  if (!trouve) { errMsg('Identifiant introuvable : ' + id); return; }
  const { el, serie } = trouve;
  const cle = PREFIXE_VERS_VUE[id.split('-')[0]] || 'synthese';
  location.hash = '#/' + cle;
  const champs = Object.entries(el).filter(([k]) => !['id', 'liens'].includes(k));
  const body = `<dl>${champs.map(([k, v]) => `<dt>${ech(k)}</dt><dd>${typeof v === 'object' ? ech(JSON.stringify(v)) : liens(String(v ?? ''))}</dd>`).join('')}</dl>`
    + (el.liens && el.liens.length ? `<h4>Liens</h4>${el.liens.map(l => `<div class="rel"><span class="k">${ech(l)}</span><span><a class="ref" href="#/voir/${ech(l)}">ouvrir</a></span></div>`).join('')}` : '');
  ouvrirDrawer(serie, `${el.id} — ${el.intitule || el.texte || ''}`, pill(el.statut) + ' ' + badgeAud(el.audience), body);
}

function router() {
  const hash = location.hash.replace(/^#\/?/, '');
  const view = document.getElementById('view');
  rendreNav(hash.split('/')[0]);
  if (hash.startsWith('voir/')) { voirId(hash.slice(5)); return; }
  const cle = hash || 'chat';
  if (VUES[cle]) VUES[cle](view);
  else placeholder(view, cle);
}

// ---------- recherche globale ----------
function initRecherche() {
  const input = document.getElementById('q');
  const results = document.getElementById('results');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => faireRecherche(input.value.trim()), 200);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && results.classList.contains('open')) {
      const sel = results.querySelector('.rr.sel') || results.querySelector('.rr');
      if (sel) sel.click();
    }
  });
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
  });
}

function faireRecherche(q) {
  const results = document.getElementById('results');
  if (!q || !ETAT) { results.classList.remove('open'); return; }
  const ql = q.toLowerCase();
  const hits = [];
  const trouve = trouverElement(q.toUpperCase());
  if (trouve) hits.push({ id: trouve.el.id, serie: trouve.serie, texte: (trouve.el.intitule || trouve.el.texte || '').slice(0, 80) });
  if (ETAT.registre) {
    for (const [serie, liste] of Object.entries(ETAT.registre)) {
      for (const el of (liste || [])) {
        const t = (el.intitule || el.texte || '') + ' ' + (el.origine || '');
        if (t.toLowerCase().includes(ql) && !hits.find(h => h.id === el.id)) {
          hits.push({ id: el.id, serie, texte: (el.intitule || '').slice(0, 80) });
        }
      }
    }
  }
  if (!hits.length) { results.classList.remove('open'); return; }
  results.innerHTML = `<div class="rg">Résultats (${hits.length})</div>` + hits.slice(0, 30).map((h, i) =>
    `<div class="rr${i === 0 ? ' sel' : ''}" data-id="${ech(h.id)}"><span class="k">${ech(h.id)}</span><span class="x">${ech(h.texte)}<small>${ech(h.serie)}</small></span></div>`).join('');
  results.classList.add('open');
  results.querySelectorAll('.rr').forEach(el => el.addEventListener('click', () => {
    results.classList.remove('open');
    location.hash = '#/voir/' + el.dataset.id;
  }));
}

// ---------- démarrage ----------
(async function start() {
  try {
    const info = await API.infos();
    document.getElementById('titre-projet').textContent = info.nom || idProjet;
    document.getElementById('etape-projet').textContent = 'étape : ' + (info.etape || '');
    ETAT = await API.etat();
    window.ETAT = ETAT;
  } catch (e) {
    errMsg('Erreur de chargement : ' + e.message);
  }
  initRecherche();
  window.addEventListener('hashchange', router);
  router();
})();
