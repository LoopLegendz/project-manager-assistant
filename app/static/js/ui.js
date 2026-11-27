// ui.js — utilitaires d'affichage : échappement, mini-markdown, liens d'ID, pills, drawer.

// registre des vues : déclaré ici car ui.js est chargé avant tous les fichiers de vue
// (router.js le réassigne de façon idempotente).
window.VUES = window.VUES || {};

function ech(s) {
  const e = document.createElement('span');
  e.textContent = s == null ? '' : String(s);
  return e.innerHTML;
}

// mini-markdown sécurisé : **gras** -> <b>, \n -> <br>
function mdLeger(t) {
  let s = ech(t);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

// rend les identifiants Q-001, R-01... cliquables
function liens(texte) {
  return ech(texte).replace(/\b(Q|D|A|R|DEP|J|REU|F|H|S)-(\d+)\b/g,
    (m, p, n) => `<a class="ref" href="#/voir/${p}-${n}">${p}-${n}</a>`);
}

// pill coloré selon la valeur
function pill(valeur) {
  const v = String(valeur || '');
  let cls = 's-neutral';
  if (['faite', 'repondue', 'prise', 'levee', 'atteint', 'tenue', 'confirmee', 'instruit', 'clos', 'maitrise', 'actif'].includes(v)) cls = 's-good';
  else if (['en_cours', 'planifiee', 'prevu', 'a_planifier', 'a_faire', 'ouverte', 'proposee', 'a_instruire', 'a_confirmer', 'ouvert', 'decale'].includes(v)) cls = 's-info';
  else if (['abandonnee', 'annulee', 'infirmee', 'remplace'].includes(v)) cls = 's-neutral';
  return `<span class="pill ${cls}"><b>${ech(v)}</b></span>`;
}

function badgeAud(a) { return `<span class="tag">${ech(a || '')}</span>`; }

// ---------- Drawer fiche ----------
function ouvrirDrawer(ty, titre, pillsHtml, bodyHtml) {
  document.getElementById('dr-ty').textContent = ty;
  document.getElementById('dr-titre').textContent = titre;
  document.getElementById('dr-pills').innerHTML = pillsHtml || '';
  document.getElementById('dr-body').innerHTML = bodyHtml;
  document.body.classList.add('dr');
}
function fermerDrawer() { document.body.classList.remove('dr'); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dr-close').addEventListener('click', fermerDrawer);
  document.getElementById('shade').addEventListener('click', fermerDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerDrawer(); });
});

// affiche une erreur globale (bandeau rouge en bas)
function errMsg(msg) {
  const e = document.getElementById('err');
  e.textContent = msg;
  e.style.display = 'block';
  setTimeout(() => { e.style.display = 'none'; }, 8000);
}
