// interlocuteurs.js — vue "Par interlocuteur" : une carte par partie prenante avec
// ses actions / questions / décisions / dépendances / réunions (dérivé de l'etat).

(function () {
  function contient(texte, nom) {
    return (texte || '').toLowerCase().includes((nom || '').toLowerCase());
  }

  VUES['interlocuteurs'] = function (view) {
    const e = window.ETAT || {};
    const pp = (e.projet || {}).parties_prenantes || [];
    const reg = e.registre || {};
    const reunions = (e.reunions || {}).reunions || [];
    const actions = reg.actions || [];
    const questions = reg.questions || [];
    const decisions = reg.decisions || [];
    const deps = reg.dependances || [];

    function bloc(titre, liste) {
      if (!liste.length) return '';
      return `<div style="margin-top:10px"><div class="grp-h" style="margin:0 0 2px">${ech(titre)} <small>${liste.length}</small></div>`
        + liste.map(el => `<div class="item"><span class="k"><a class="ref" href="#/voir/${ech(el.id)}">${ech(el.id)}</a></span>`
          + `<span class="x" style="font-size:12.5px;color:var(--ink2)">${liens((el.intitule || '').slice(0, 100))}</span>`
          + `<span class="m">${pill(el.statut)}</span></div>`).join('')
        + '</div>';
    }

    let html = `<div class="hd"><h3>Par interlocuteur</h3><span class="more">${pp.length} partie(s) prenante(s)</span></div>`;
    if (!pp.length) html += '<p class="empty">Aucune partie prenante enregistrée dans etat/projet.json.</p>';
    html += '<div class="grid g2">';
    for (const p of pp) {
      const nom = p.nom || '';
      const a = actions.filter(x => contient(x.porteur, nom));
      const q = questions.filter(x => contient(x.posee_a, nom));
      const d = decisions.filter(x => contient(x.decideur, nom));
      const dep = deps.filter(x => contient(x.envers, nom));
      const reu = reunions.filter(x => (x.participants || []).some(pt => contient(pt, nom)));
      const rien = !a.length && !q.length && !d.length && !dep.length && !reu.length;
      html += `<div class="card"><h3>${ech(nom)}</h3>
        <p class="lead">${ech(p.role || '')}${p.organisation ? ' — ' + ech(p.organisation) : ''}</p>
        ${bloc('Actions', a)}${bloc('Questions', q)}${bloc('Décisions', d)}${bloc('Dépendances', dep)}${bloc('Réunions', reu)}
        ${rien ? '<p class="empty">Aucun élément pour cet interlocuteur.</p>' : ''}
      </div>`;
    }
    html += '</div>';
    view.innerHTML = html;
  };
})();
