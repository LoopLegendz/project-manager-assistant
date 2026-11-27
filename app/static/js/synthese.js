// synthese.js — vues Synthèse (hero + KPI) et Cockpit (alertes + listes détaillées).
// Utilise window.ETAT (chargé par router.js).

(function () {
  const AUJ = new Date().toISOString().slice(0, 10);

  function stats() {
    const e = window.ETAT || {};
    const reg = e.registre || {};
    const jalons = (e.planning || {}).jalons || [];
    const reunions = (e.reunions || {}).reunions || [];
    const actions = reg.actions || [];
    const aRetard = actions.filter(a => a.statut !== 'faite' && a.statut !== 'abandonnee' && a.echeance && a.echeance < AUJ);
    const aProches = actions.filter(a => a.statut !== 'faite' && a.statut !== 'abandonnee' && a.echeance && a.echeance >= AUJ && a.echeance <= new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10));
    const prochainJalon = jalons.filter(j => j.statut === 'prevu' && j.date).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
    const prochaineReu = reunions.filter(r => (r.statut === 'planifiee') && r.date).sort((a, b) => a.date.localeCompare(b.date))[0]
      || reunions.filter(r => r.statut === 'a_planifier').sort((a, b) => a.id.localeCompare(b.id))[0] || null;
    return {
      e, reg,
      qOuvertes: (reg.questions || []).filter(q => q.statut === 'ouverte').length,
      qTotal: (reg.questions || []).length,
      aRetard, aProches,
      aFaire: actions.filter(a => a.statut === 'a_faire' || a.statut === 'en_cours').length,
      rOuverts: (reg.risques || []).filter(r => r.statut === 'ouvert').length,
      rTotal: (reg.risques || []).length,
      dTotal: (reg.decisions || []).length,
      prochainJalon, prochaineReu,
      reuSansDate: reunions.filter(r => r.statut !== 'annulee' && !r.date),
    };
  }

  function kpi(lbl, val, sub, href, acc) {
    return `<a class="kpi${acc ? ' acc' : ''}" href="${href}">
      <div class="lbl">${ech(lbl)}</div>
      <div class="val">${val}</div>
      <div class="sub">${ech(sub || '')}</div></a>`;
  }

  VUES['synthese'] = function (view) {
    const s = stats();
    const p = s.e.projet || {};
    view.innerHTML = `
      <div class="hero">
        <h2>${ech(p.nom || idProjet)}</h2>
        <p>${liens(p.objet || '')}</p>
        <p style="margin-top:6px">${p.commanditaire ? 'Sponsor : <b>' + ech(p.commanditaire) + '</b> · ' : ''}${p.chef_de_projet ? 'Chef de projet : <b>' + ech(p.chef_de_projet) + '</b> · ' : ''}Échéance : <b>${ech(p.echeance_principale || '—')}</b></p>
      </div>
      <div class="sec"><h2>Indicateurs</h2>
      <div class="grid gauto">
        ${kpi('Questions ouvertes', s.qOuvertes, `sur ${s.qTotal} au total`, '#/questions', true)}
        ${kpi('Actions en retard', s.aRetard.length, `${s.aFaire} encore à faire`, '#/actions')}
        ${kpi('Risques ouverts', s.rOuverts, `sur ${s.rTotal} au total`, '#/risques')}
        ${kpi('Décisions prises', s.dTotal, '', '#/decisions')}
        ${kpi('Prochain jalon', s.prochainJalon ? ech(s.prochainJalon.date) : '—', s.prochainJalon ? ech(s.prochainJalon.id + ' ' + (s.prochainJalon.intitule || '')) : '', '#/planning')}
        ${kpi('Prochaine réunion', s.prochaineReu ? ech(s.prochaineReu.date || 'à planifier') : '—', s.prochaineReu ? ech(s.prochaineReu.id + ' ' + (s.prochaineReu.intitule || '')) : '', '#/reunions')}
      </div></div>
      <div class="sec"><h2>Alertes</h2><div class="card" id="zone-alertes"></div></div>`;
    rendreAlertes(view.querySelector('#zone-alertes'), s);
  };

  VUES['cockpit'] = function (view) {
    const s = stats();
    const alertes = listeAlertes(s);
    view.innerHTML = `
      <div class="grid g21">
        <div>
          <div class="sec" style="margin-top:0"><h2>Alertes <small>${alertes.length}</small></h2>
            <div class="card">${alertes.length ? alertes.map(a => `<div class="alert" style="--c:${a.c}"><b>●</b><span class="x">${a.html}</span></div>`).join('') : '<p class="empty">Aucune alerte.</p>'}</div>
          </div>
          <div class="sec"><h2>Actions en retard <small>${s.aRetard.length}</small></h2>
            <div class="card">${s.aRetard.length ? s.aRetard.map(a => `<div class="item"><span class="k"><a class="ref" href="#/voir/${ech(a.id)}">${ech(a.id)}</a></span><span class="x">${liens(a.intitule)}</span><span class="m">échéance <b style="color:var(--critical)">${ech(a.echeance)}</b></span></div>`).join('') : '<p class="empty">Aucune.</p>'}</div>
          </div>
        </div>
        <div>
          <div class="sec" style="margin-top:0"><h2>Prochaines échéances</h2>
            <div class="card" id="zone-echeances"></div>
          </div>
          <div class="sec"><h2>Prochaine réunion</h2>
            <div class="card" id="zone-reunion"></div>
          </div>
        </div>
      </div>`;
    // échéances = actions à venir triées par date
    const aVenir = (s.reg.actions || []).filter(a => a.statut !== 'faite' && a.statut !== 'abandonnee' && a.echeance).sort((a, b) => a.echeance.localeCompare(b.echeance));
    view.querySelector('#zone-echeances').innerHTML = aVenir.length ? aVenir.slice(0, 8).map(a =>
      `<div class="item"><span class="k"><a class="ref" href="#/voir/${ech(a.id)}">${ech(a.id)}</a></span><span class="x">${liens(a.intitule)}</span><span class="m">${ech(a.echeance)}</span></div>`).join('')
      : '<p class="empty">Aucune échéance.</p>';
    const r = s.prochaineReu;
    view.querySelector('#zone-reunion').innerHTML = r
      ? `<div class="item"><span class="k"><a class="ref" href="#/voir/${ech(r.id)}">${ech(r.id)}</a></span><span class="x">${liens(r.intitule)} ${pill(r.statut)}</span><span class="m">${ech(r.date || 'à planifier')}</span></div>`
      : '<p class="empty">Aucune réunion prévue.</p>';
  };

  function listeAlertes(s) {
    const out = [];
    for (const a of s.aRetard) out.push({ c: 'var(--critical)', html: `Action <a class="ref" href="#/voir/${ech(a.id)}">${ech(a.id)}</a> en retard (échéance ${ech(a.echeance)}) : ${liens(a.intitule)}` });
    for (const a of s.aProches) out.push({ c: 'var(--warning)', html: `Action <a class="ref" href="#/voir/${ech(a.id)}">${ech(a.id)}</a> à échéance proche (${ech(a.echeance)})` });
    for (const r of s.reuSansDate) out.push({ c: 'var(--warning)', html: `Réunion <a class="ref" href="#/voir/${ech(r.id)}">${ech(r.id)}</a> sans date : ${liens(r.intitule || '')}` });
    for (const r of (s.reg.risques || []).filter(x => x.statut === 'ouvert' && x.probabilite === 'forte' && x.impact === 'fort')) {
      out.push({ c: 'var(--critical)', html: `Risque majeur <a class="ref" href="#/voir/${ech(r.id)}">${ech(r.id)}</a> : ${liens(r.intitule)}` });
    }
    return out;
  }

  function rendreAlertes(el, s) {
    const a = listeAlertes(s);
    el.innerHTML = a.length ? a.map(x => `<div class="alert" style="--c:${x.c}"><b>●</b><span class="x">${x.html}</span></div>`).join('') : '<p class="empty">Aucune alerte.</p>';
  }
})();
