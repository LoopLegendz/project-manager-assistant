// chat.js — vue Chat de la SPA + parcours de création (questions) si le projet n'est pas actif.
// Enregistre VUES['chat'].

(function () {
  let ctrlEnCours = null;

  function ajouterMsg(chat, m) {
    const div = document.createElement('div');
    div.className = 'msg ' + m.role;
    div.innerHTML = mdLeger(m.texte);
    chat.appendChild(div);
    if (m.role === 'assistant' && (m.cost_usd != null || m.duree_s != null)) {
      const meta = document.createElement('div');
      meta.className = 'msg meta';
      meta.textContent = `${m.duree_s ?? '?'}s — ${m.cost_usd != null ? m.cost_usd.toFixed(4) + ' USD' : ''}`;
      chat.appendChild(meta);
    }
    chat.scrollTop = chat.scrollHeight;
  }

  async function rendreChat(view) {
    const data = await API.chatGet();
    view.innerHTML = `
      <div class="card">
        <div class="hd"><h3>Conversation avec l'assistant</h3>
          <button class="btn" id="btn-rafraichir-chat" style="margin-left:auto">Rafraîchir</button></div>
        <div class="chat" id="chat"></div>
        <form class="chat-form" id="form-chat">
          <input type="text" id="input-chat" placeholder="Écrivez à l'assistant..." autocomplete="off">
          <button type="submit" class="btn pri" id="btn-chat">Envoyer</button>
          <button type="button" class="btn danger" id="btn-annuler" style="display:none">Annuler</button>
        </form>
        <div id="statut-chat"></div>
      </div>`;
    const chat = view.querySelector('#chat');
    for (const m of data.messages) ajouterMsg(chat, m);

    // si un run est déjà en cours côté serveur (verrou), l'indiquer et surveiller jusqu'à sa fin
    let pollRun = null;
    async function surveillerRun() {
      const d = await API.chatGet();
      if (!view.isConnected) { clearInterval(pollRun); pollRun = null; return; }
      const statut = view.querySelector('#statut-chat');
      const input = view.querySelector('#input-chat');
      const btn = view.querySelector('#btn-chat');
      if (d.run_en_cours) {
        statut.innerHTML = `<div class="spinner">Un run est en cours côté serveur depuis ${d.run_en_cours.age_s}s (pid ${d.run_en_cours.pid || '?'}). Rafraîchissement auto toutes les 15 s — ou cliquez sur Rafraîchir.</div>`;
        input.disabled = true; btn.disabled = true;
      } else {
        clearInterval(pollRun); pollRun = null;
        statut.innerHTML = '';
        input.disabled = false; btn.disabled = false;
        chat.innerHTML = '';
        for (const m of d.messages) ajouterMsg(chat, m);
        if (window.rafraichirEtat) window.rafraichirEtat();
      }
    }
    if (data.run_en_cours) {
      surveillerRun();
      pollRun = setInterval(surveillerRun, 15000);
    }

    view.querySelector('#btn-rafraichir-chat').addEventListener('click', async () => {
      const d = await API.chatGet();
      chat.innerHTML = '';
      for (const m of d.messages) ajouterMsg(chat, m);
      if (window.rafraichirEtat) window.rafraichirEtat();
    });

    view.querySelector('#form-chat').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = view.querySelector('#input-chat');
      const btn = view.querySelector('#btn-chat');
      const btnAnnuler = view.querySelector('#btn-annuler');
      const statut = view.querySelector('#statut-chat');
      const message = input.value.trim();
      if (!message) return;
      input.value = '';
      btn.disabled = true;
      btnAnnuler.style.display = 'inline-block';
      statut.innerHTML = '<div class="spinner">L\'assistant réfléchit... (5 min max)</div>';
      ajouterMsg(chat, { role: 'user', texte: message });
      try {
        ctrlEnCours = new AbortController();
        const timer = setTimeout(() => ctrlEnCours.abort(), 300000); // 5 min max
        const data = await API.chatPost(message, ctrlEnCours.signal);
        clearTimeout(timer);
        ajouterMsg(chat, { role: 'assistant', texte: data.reponse, cost_usd: data.cost_usd, duree_s: data.duree_s });
        statut.innerHTML = '';
        // l'assistant a pu mettre à jour etat/ : on resynchronise le reste de la SPA
        if (window.rafraichirEtat) window.rafraichirEtat();
      } catch (err) {
        if (err.name === 'AbortError') {
          statut.innerHTML = '<div class="spinner">Requête annulée côté navigateur — le run continue côté serveur. Rafraîchissement auto toutes les 15 s.</div>';
          if (!pollRun) { surveillerRun(); pollRun = setInterval(surveillerRun, 15000); }
        } else {
          statut.innerHTML = `<div class="erreur">${ech(err.message)}</div>`;
        }
      }
      btn.disabled = false;
      btnAnnuler.style.display = 'none';
    });

    view.querySelector('#btn-annuler').addEventListener('click', () => {
      if (ctrlEnCours) ctrlEnCours.abort();
    });
  }

  // parcours de création si le projet n'est pas encore actif
  async function rendreParcours(view, info) {
    if (info.etape === 'questions' && info.pre_analyse && info.pre_analyse.questions) {
      const qs = info.pre_analyse.questions;
      view.innerHTML = `
        <div class="card">
          <h3>Quelques questions avant de créer l'espace projet</h3>
          <p class="lead">Tour ${info.tour || 1} — ${qs.length} question(s).</p>
          <form id="form-questions"></form>
          <div id="statut-q"></div>
        </div>`;
      const form = view.querySelector('#form-questions');
      for (const q of qs) {
        const div = document.createElement('div');
        div.style.marginBottom = '14px';
        div.innerHTML = `<div style="font-size:14px"><a class="ref" href="#/voir/${ech(q.id)}">${ech(q.id)}</a> — ${liens(q.question)}</div>
          <div style="font-size:12px;color:var(--muted)">${ech(q.pourquoi || '')}</div>`;
        const input = document.createElement('input');
        input.type = 'text';
        input.name = q.id;
        input.placeholder = q.proposition_par_defaut ? 'Par défaut : ' + q.proposition_par_defaut : '';
        input.style.cssText = 'width:100%;margin-top:4px;font:inherit;font-size:14px;padding:8px 12px;border-radius:9px;border:1px solid var(--axis);background:var(--raised);color:var(--ink)';
        div.appendChild(input);
        form.appendChild(div);
      }
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'btn pri';
      btn.textContent = 'Envoyer les réponses';
      form.appendChild(btn);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        const statut = view.querySelector('#statut-q');
        statut.innerHTML = '<div class="spinner">Intégration des réponses, puis création de l\'espace (30 min max)...</div>';
        const reponses = {};
        for (const input of form.querySelectorAll('input[type=text]')) reponses[input.name] = input.value;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1800000); // 30 min max
          const data = await API.reponsesPost(reponses, ctrl.signal);
          clearTimeout(timer);
          location.reload();
        } catch (err) {
          statut.innerHTML = `<div class="erreur">${ech(err.message)}</div>`;
          btn.disabled = false;
        }
      });
    } else {
      const textes = { pre_analyse: 'Pré-analyse en cours...', creation: 'Création de l\'espace projet en cours (plusieurs minutes)...', description: 'Projet non initialisé via l\'interface.' };
      view.innerHTML = `<div class="card"><div class="spinner">${ech(textes[info.etape] || 'Chargement...')}</div></div>`;
      if (info.etape === 'pre_analyse' || info.etape === 'creation') {
        setTimeout(() => location.reload(), 15000);
      }
    }
  }

  VUES['chat'] = async function (view) {
    try {
      const info = await API.infos();
      if (info.etape === 'actif') await rendreChat(view);
      else await rendreParcours(view, info);
    } catch (e) {
      view.innerHTML = `<div class="erreur">${ech(e.message)}</div>`;
    }
  };
})();
