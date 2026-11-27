// planning.js — vue Planning : frise type Gantt copiée de Dashboard.html (.gantt/.g-row/.g-pt/.g-grid)
// au-dessus du tableau des jalons (registre.js).

(function () {
  const vueTab = VUES['planning'];
  const AUJ = new Date().toISOString().slice(0, 10);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const COUL = { atteint: 'var(--good)', prevu: 'var(--ink2)', decale: 'var(--warning)' };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  function jour(d) { return new Date(d + 'T12:00:00Z'); }
  function iso(d) { return d.toISOString().slice(0, 10); }

  VUES['planning'] = function (view) {
    const e = window.ETAT || {};
    const jalons = (e.planning || {}).jalons || [];
    const avecDate = jalons.filter(j => typeof j.date === 'string' && ISO.test(j.date));
    const sansDate = jalons.filter(j => !avecDate.includes(j));
    const atteints = avecDate.filter(j => j.statut === 'atteint').sort((a, b) => a.date.localeCompare(b.date));
    const prevus = avecDate.filter(j => j.statut !== 'atteint').sort((a, b) => a.date.localeCompare(b.date));

    let gantt = '<p class="empty">Aucun jalon daté pour la frise.</p>';
    if (avecDate.length) {
      const dates = avecDate.map(j => j.date).sort();
      const min = new Date(jour(dates[0]).getTime() - 15 * 864e5);
      let max = new Date(jour(dates[dates.length - 1]).getTime() + 15 * 864e5);
      if (max - min < 60 * 864e5) max = new Date(min.getTime() + 60 * 864e5);
      const pos = d => Math.max(0, Math.min(100, (jour(d) - min) / (max - min) * 100));
      const posPt = d => Math.max(1, Math.min(97, pos(d))); // losange jamais coupé aux bords

      // échelle (en-tête) + grille verticale : mois + semaines (lundis) + aujourd'hui
      // les libellés .ml sont espacés d'au moins `seuil` % pour éviter les chevauchements
      const mois = [];
      const cur = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
      while (cur <= max) {
        const pRaw = (jour(iso(cur)) - min) / (max - min) * 100;
        if (pRaw > 0.5) { // ignore le 1er du mois de la borne min s'il est hors plage
          mois.push({
            p: Math.max(0, Math.min(100, pRaw)),
            nom: MOIS[cur.getUTCMonth()] + ' ' + cur.getUTCFullYear(),
            dl: String(cur.getUTCDate()).padStart(2, '0') + '/' + String(cur.getUTCMonth() + 1).padStart(2, '0'),
          });
        }
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
      function echelle(seuil) {
        let s = '', dernier = -100;
        for (const m of mois) {
          if (m.p - dernier >= seuil || m.p < 4) { if (m.p <= 90) { s += `<span class="ml" style="left:${m.p}%">${m.nom}</span>`; dernier = m.p; } }
          s += `<span class="dl" style="left:${m.p}%">${m.dl}</span>`;
        }
        return s;
      }
      let scale = echelle(14);
      if ((scale.match(/class="ml"/g) || []).length < 2) scale = echelle(7);
      let grid = mois.map(m => `<div class="mo" style="left:${m.p}%"></div>`).join('');
      // semaines : chaque lundi
      const lun = new Date(min.getTime());
      lun.setUTCDate(lun.getUTCDate() - ((lun.getUTCDay() + 6) % 7));
      while (lun <= max) {
        grid += `<div class="wk" style="left:${pos(iso(lun))}%"></div>`;
        lun.setUTCDate(lun.getUTCDate() + 7);
      }
      if (AUJ >= iso(min) && AUJ <= iso(max)) {
        grid += `<div class="now" style="left:${Math.min(pos(AUJ), 80)}%"><span>aujourd'hui ${AUJ.slice(8)}/${AUJ.slice(5, 7)}</span></div>`;
      }

      const prochain = prevus.filter(j => j.statut === 'prevu' && j.date >= AUJ).sort((a, b) => a.date.localeCompare(b.date))[0];

      function ligne(j) {
        const p = posPt(j.date);
        const cls = j === prochain ? 'g-pt next' : 'g-pt';
        const bg = j === prochain ? '' : `background:${COUL[j.statut] || 'var(--ink2)'}`;
        // texte à droite du point, sauf près du bord droit où il passe à gauche
        const txt = p > 72
          ? `style="right:${(100 - p).toFixed(2)}%;left:auto;padding-left:0;padding-right:10px"`
          : `style="left:${p}%"`;
        return `<div class="g-row">
          <div class="g-lab"><a href="#/voir/${ech(j.id)}" title="${ech(j.intitule || '')}"><b>${ech(j.id)}</b>${ech(j.intitule || '')}</a></div>
          <div class="g-trk">
            <a class="${cls}" style="left:${p}%;${bg}" href="#/voir/${ech(j.id)}" title="${ech(j.id + ' — ' + j.date + ' (' + j.statut + ')')}"></a>
            <span class="g-txt" ${txt}>${ech(j.date)} · ${ech(j.statut)}</span>
          </div>
        </div>`;
      }
      function ligneSansDate(j) {
        return `<div class="g-row">
          <div class="g-lab"><a href="#/voir/${ech(j.id)}" title="${ech(j.intitule || '')}"><b>${ech(j.id)}</b>${ech(j.intitule || '')}</a></div>
          <div class="g-trk"><span class="g-pt ext" style="left:97%" title="sans date"></span><span class="g-txt" style="right:1%;left:auto;padding-left:0;padding-right:10px">à caler · ${ech(j.statut)}</span></div>
        </div>`;
      }

      gantt = `<div class="gantt">
        <div class="g-grid">${grid}</div>
        <div class="g-row hdr"><div class="g-lab"></div><div class="g-scale">${scale}</div></div>
        ${atteints.length ? '<div class="g-row sep"><div class="g-lab">Jalons atteints</div><div></div></div>' + atteints.map(ligne).join('') : ''}
        ${prevus.length ? '<div class="g-row sep"><div class="g-lab">Jalons prévus</div><div></div></div>' + prevus.map(ligne).join('') : ''}
        ${sansDate.length ? '<div class="g-row sep"><div class="g-lab">Sans date (à caler)</div><div></div></div>' + sansDate.map(ligneSansDate).join('') : ''}
      </div>`;
    }

    view.innerHTML = `
      <div class="hd"><h3>Planning — jalons</h3><span class="more">${jalons.length} jalon(s) — cliquez sur un losange ou un libellé pour ouvrir la fiche</span></div>
      <div class="sec" style="margin-top:0"><h2>Frise</h2>
        <div class="card flush"><div class="scroll" style="padding:0 0 6px">${gantt}</div></div>
      </div>
      <div class="sec" id="zone-tab"></div>`;

    vueTab(view.querySelector('#zone-tab'));
  };
})();
