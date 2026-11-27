// reunions.js — vue Réunions : cartes .meet (comme le modèle) + filtre par audience, clic → fiche.

(function () {
  VUES['reunions'] = function (view) {
    const e = window.ETAT || {};
    const reus = ((e.reunions || {}).reunions || []).slice().sort((a, b) => {
      const sa = { a_planifier: 0, planifiee: 1, tenue: 2, annulee: 3 }[a.statut] ?? 9;
      const sb = { a_planifier: 0, planifiee: 1, tenue: 2, annulee: 3 }[b.statut] ?? 9;
      return sa - sb || String(a.date || '9999').localeCompare(String(b.date || '9999'));
    });

    view.innerHTML = `
      <div class="hd"><h3>Réunions</h3><span class="more">${reus.length} réunion(s) — cliquez sur une carte pour ouvrir la fiche</span></div>
      <div class="filters">
        <select id="f-aud"><option value="">Toutes audiences</option>${['perso', 'projet', 'direction', 'public'].map(a => `<option>${a}</option>`).join('')}</select>
        <span class="count" id="count"></span>
      </div>
      <div class="grid g2" id="liste"></div>`;

    const liste = view.querySelector('#liste');
    function maj(filtre) {
      const res = reus.filter(r => !filtre || r.audience === filtre);
      view.querySelector('#count').textContent = `${res.length} / ${reus.length}`;
      liste.innerHTML = res.length ? res.map(r => `
        <div class="card meet${r.statut === 'tenue' || r.statut === 'annulee' ? ' done' : ''}" data-id="${ech(r.id)}">
          <div class="r1"><span class="k">${ech(r.id)}</span>${badgeAud(r.audience)}<span class="pill s-${r.statut === 'planifiee' ? 'info' : r.statut === 'tenue' ? 'good' : 'neutral'}"><b>${ech(r.statut)}</b></span></div>
          <div class="n">${liens(r.intitule || '')}</div>
          <div class="w">${liens((r.objectif || '').slice(0, 140))}</div>
          <div class="f"><span>${ech(r.date || 'à planifier')}</span><span>${ech((r.participants || []).length)} participant(s)</span><span>${ech((r.ordre_du_jour || []).length)} point(s) à l'ordre du jour</span></div>
        </div>`).join('') : '<p class="empty">Aucune réunion pour cette audience.</p>';
      liste.querySelectorAll('.meet').forEach(c => c.addEventListener('click', () => { location.hash = '#/voir/' + c.dataset.id; }));
    }
    view.querySelector('#f-aud').addEventListener('change', ev => maj(ev.target.value));
    maj('');
  };
})();
