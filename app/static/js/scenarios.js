// scenarios.js — vue Scénarios : 3 propositions construites à partir de l'etat réel
// (ancrées sur les IDs existants : Q-003, R-01, F-026, D-001, J-02...). Démo : à faire valider
// par l'agent via une question du registre.

(function () {
  function trouver(e, id) {
    const reg = e.registre || {};
    for (const liste of Object.values(reg)) {
      const el = (liste || []).find(x => x.id === id);
      if (el) return el;
    }
    for (const src of [(e.planning || {}).jalons, (e.reunions || {}).reunions, (e.sujets || {}).sujets, (e.faits || {}).faits]) {
      const el = (src || []).find(x => x.id === id);
      if (el) return el;
    }
    return null;
  }

  VUES['scenarios'] = function (view) {
    const e = window.ETAT || {};
    const q003 = trouver(e, 'Q-003'), r01 = trouver(e, 'R-01'), f026 = trouver(e, 'F-026');
    const d001 = trouver(e, 'D-001'), j02 = trouver(e, 'J-02'), q001 = trouver(e, 'Q-001');
    const txt = el => el ? liens((el.intitule || el.texte || '').slice(0, 110)) : '';

    const scen = (titre, pitch, points) => `
      <div class="card scen">
        <span class="tag">scénario</span>
        <div class="n">${ech(titre)}</div>
        <div class="p">${pitch}</div>
        <ul>${points.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>`;

    view.innerHTML = `
      <div class="hd"><h3>Scénarios</h3><span class="more">propositions construites à partir de l'état — à faire valider par l'agent (créer une question du registre)</span></div>
      <div class="grid g3">
        ${scen(`A — Financer l'écart et retenir Alpha (395 k€)`,
          `On valide le chiffrage révisé d'Alpha et on finance les 45 k€ manquants.`,
          [`Coût : 395 k€ (${txt(f026)}) — écart à financer via ${liens('Q-003')}`,
           `Délai : mise en service maintenue au ${ech(j02 ? j02.date : '2027-09-30')} (${liens('J-02')})`,
           `Risque ${liens('R-01')} levé ; décision à prendre en COPIL du 2026-12-08 (${liens('REU-02')})`,
           `Pénalité de retard Alpha : 0,5 %/semaine si J-02 dérape`])}
        ${scen(`B — Renégocier ou mettre en concurrence`,
          `On refuse le chiffrage révisé et on rouvre la consultation (offre concurrente ou renégociation).`,
          [`Coût visé : revenir dans le budget validé de 350 k€ (${liens('D-001')})`,
           `Délai : risque de dérive de ${liens('J-02')} (re-consultation : +2 à 3 mois)`,
           `Risque fournisseur : ${liens('R-03')} (perte de l'offre si périmètre non validé — ${liens('Q-001')}, ${liens('Q-002')})`,
           `Condition : valider le périmètre exact rapidement (${liens('A-001')})`])}
        ${scen(`C — Phaser le projet dans 350 k€`,
          `On décale une partie du périmètre (ex. archivage légal, double validation) en V2 pour tenir le budget.`,
          [`Coût : 350 k€ tenus (${liens('D-001')}, ${liens('F-004')})`,
           `Périmètre réduit en V1 ; V2 à financer plus tard`,
           `Risque métier : besoins DRH/finances partiellement couverts (atelier du 2026-11-25)`,
           `Question au sponsor : phasage accepté ? (${liens('Q-013')})`])}
      </div>`;
  };
})();
