// checklists.js — vue Check-lists : une check-list de préparation par réunion « à planifier »,
// dérivée de l'etat (sujets à instruire, questions ouvertes, actions en retard), filtrée par
// audience compatible (audience de la réunion + projet). Cases persistées en localStorage.

(function () {
  const AUJ = new Date().toISOString().slice(0, 10);

  VUES['checklists'] = function (view) {
    const e = window.ETAT || {};
    const reg = e.registre || {};
    const reus = ((e.reunions || {}).reunions || [])
      .filter(r => r.statut === 'a_planifier')
      .sort((a, b) => a.id.localeCompare(b.id));
    const sujets = (e.sujets || {}).sujets || [];
    const questions = reg.questions || [];
    const actions = reg.actions || [];
    // cloisonnement : une réunion d'audience A voit ses éléments A + les éléments projet
    const compatible = (el, aud) => !el.audience || el.audience === aud || el.audience === 'projet';

    function itemsPour(reu) {
      const items = [{ id: 'date-' + reu.id, label: `Fixer la date de ${reu.id} — ${reu.intitule}` }];
      for (const s of sujets.filter(s => s.statut === 'a_instruire' && compatible(s, reu.audience))) {
        items.push({ id: s.id, label: `Instruire ${s.id} — ${s.intitule}${s.chantier ? ' (chantier ' + s.chantier + ')' : ''}` });
      }
      for (const q of questions.filter(q => q.statut === 'ouverte' && compatible(q, reu.audience)).slice(0, 8)) {
        items.push({ id: q.id, label: `Préparer la réponse de ${q.id} — ${(q.intitule || '').slice(0, 90)}${q.echeance ? ' (échéance ' + q.echeance + ')' : ''}` });
      }
      for (const a of actions.filter(a => a.statut !== 'faite' && a.statut !== 'abandonnee' && a.echeance && a.echeance < AUJ && compatible(a, reu.audience))) {
        items.push({ id: 'relance-' + a.id, label: `Relancer ${a.id} en retard (échéance ${a.echeance}) — ${(a.intitule || '').slice(0, 70)}` });
      }
      return items;
    }

    if (!reus.length) {
      view.innerHTML = `<div class="hd"><h3>Check-lists</h3></div>
        <div class="card"><h3>Check-lists</h3><p class="empty">Aucune réunion « à planifier » — la check-list de préparation apparaîtra ici.</p></div>`;
      return;
    }

    view.innerHTML = `<div class="hd"><h3>Check-lists</h3><span class="more">${reus.length} réunion(s) à planifier — cases persistées localement (navigateur)</span></div>
      <div class="grid g2" id="liste">${reus.map(reu => {
        const items = itemsPour(reu);
        const cle = 'ck_' + idProjet + '_' + reu.id;
        let coches = {};
        try { coches = JSON.parse(localStorage.getItem(cle) || '{}'); } catch (err) { coches = {}; }
        return `<div class="card" data-reu="${ech(reu.id)}" data-cle="${ech(cle)}">
          <div class="ck-head">
            <div><h3 style="margin:0">Préparation de ${ech(reu.id)} — ${liens(reu.intitule || '')}</h3>
            <p class="lead" style="margin:2px 0 0">${badgeAud(reu.audience)} ${ech((reu.participants || []).join(', ') || '')}</p></div>
            <div class="prog"><span class="ck-prog"></span><div class="bar6 ck-bar"><i style="width:0%"></i></div></div>
          </div>
          <div class="ck-liste">${items.map(it => `
            <div class="ck-item${coches[it.id] ? ' done' : ''}">
              <input type="checkbox" id="${ech(reu.id + '_' + it.id)}"${coches[it.id] ? ' checked' : ''}>
              <label for="${ech(reu.id + '_' + it.id)}">${liens(it.label)}</label>
            </div>`).join('')}</div>
        </div>`;
      }).join('')}</div>`;

    view.querySelectorAll('.card[data-reu]').forEach(card => {
      const cle = card.dataset.cle;
      let coches = {};
      try { coches = JSON.parse(localStorage.getItem(cle) || '{}'); } catch (err) { coches = {}; }
      const items = card.querySelectorAll('.ck-item');
      function maj() {
        const faits = [...items].filter(d => d.querySelector('input').checked).length;
        const pct = items.length ? Math.round(faits / items.length * 100) : 0;
        const span = card.querySelector('.ck-prog');
        if (span) span.textContent = `${faits} / ${items.length} fait(s) — ${pct} %`;
        const bar = card.querySelector('.ck-bar i');
        if (bar) bar.style.width = pct + '%';
        items.forEach(d => d.classList.toggle('done', d.querySelector('input').checked));
      }
      items.forEach(d => {
        const cb = d.querySelector('input');
        cb.addEventListener('change', () => {
          coches[cb.id.replace(card.dataset.reu + '_', '')] = cb.checked;
          localStorage.setItem(cle, JSON.stringify(coches));
          maj();
        });
      });
      maj();
    });
  };
})();
