// documents.js — vue Documents : liste par dossier d'audience + lecteur Markdown.

(function () {
  // mini-markdown pour le lecteur (échappé d'abord)
  function mdHtml(t) {
    let s = ech(t);
    const lines = s.split('\n');
    let html = '', inList = false, inQuote = false;
    for (const line of lines) {
      let l = line;
      if (inList && !/^\s*[-*] /.test(l)) { html += '</ul>'; inList = false; }
      if (inQuote && !/^>\s?/.test(l)) { html += '</blockquote>'; inQuote = false; }
      let m;
      if ((m = l.match(/^###\s+(.*)/))) html += `<h3>${inline(m[1])}</h3>`;
      else if ((m = l.match(/^##\s+(.*)/))) html += `<h2>${inline(m[1])}</h2>`;
      else if ((m = l.match(/^#\s+(.*)/))) html += `<h1>${inline(m[1])}</h1>`;
      else if (/^---+\s*$/.test(l)) html += '<hr>';
      else if ((m = l.match(/^>\s?(.*)/))) { if (!inQuote) { html += '<blockquote>'; inQuote = true; } html += inline(m[1]) + '<br>'; }
      else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(m[1])}</li>`; }
      else if (l.trim()) html += `<p>${inline(l)}</p>`;
      else html += '<br>';
    }
    if (inList) html += '</ul>';
    if (inQuote) html += '</blockquote>';
    return html;
  }
  function inline(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\b(Q|D|A|R|DEP|J|REU|F|H|S)-(\d+)\b/g, (m, p, n) => `<a class="ref" href="#/voir/${p}-${n}">${p}-${n}</a>`);
  }

  VUES['documents'] = async function (view) {
    let docs;
    try { docs = await API.documents(); }
    catch (e) { view.innerHTML = `<div class="erreur">${ech(e.message)}</div>`; return; }

    view.innerHTML = `
      <div class="hd"><h3>Documents</h3><span class="more" id="count"></span></div>
      <div class="card flush"><div style="display:grid;grid-template-columns:300px 1fr;gap:0;min-height:60vh">
        <div class="dlist" style="border-right:1px solid var(--hair);max-height:70vh;overflow-y:auto;padding:10px" id="liste"></div>
        <div class="md" style="padding:22px 30px" id="lecteur"><p class="empty">Sélectionnez un document à gauche.</p></div>
      </div></div>`;

    const liste = view.querySelector('#liste');
    const lecteur = view.querySelector('#lecteur');
    let total = 0;
    let html = '';
    for (const [dossier, fichiers] of Object.entries(docs)) {
      if (!fichiers.length) continue;
      total += fichiers.length;
      html += `<div class="grp" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:10px 8px 4px">${ech(dossier)} (${fichiers.length})</div>`;
      for (const f of fichiers) {
        html += `<a href="#" data-path="${ech(f.chemin)}" style="display:block;padding:6px 8px;border-radius:7px;text-decoration:none;color:var(--ink2);font-size:12.5px">${ech(f.chemin)}<small style="display:block;color:var(--muted);font-size:11px">${f.taille} o</small></a>`;
      }
    }
    liste.innerHTML = html || '<p class="empty">Aucun document.</p>';
    view.querySelector('#count').textContent = `${total} fichier(s)`;

    liste.querySelectorAll('a[data-path]').forEach(a => a.addEventListener('click', async (e) => {
      e.preventDefault();
      liste.querySelectorAll('a').forEach(x => x.style.background = '');
      a.style.background = 'var(--raised)';
      a.style.color = 'var(--ink)';
      const path = a.dataset.path;
      lecteur.innerHTML = '<div class="spinner">Chargement...</div>';
      try {
        const d = await API.document(path);
        lecteur.innerHTML = mdHtml(d.contenu);
      } catch (err) {
        lecteur.innerHTML = `<div class="erreur">${ech(err.message)}</div>`;
      }
    }));
  };
})();
