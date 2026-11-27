// api.js — wrappers fetch vers l'API FastAPI. La page projet connaît idProjet (défini dans router.js).
window.API = {
  async infos() {
    const r = await fetch('/api/projets/' + idProjet);
    if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
    return r.json();
  },
  async etat() {
    const r = await fetch('/api/projets/' + idProjet + '/etat');
    if (!r.ok) throw new Error('etat: ' + r.statusText);
    return r.json();
  },
  async documents() {
    const r = await fetch('/api/projets/' + idProjet + '/documents');
    if (!r.ok) throw new Error('documents: ' + r.statusText);
    return r.json();
  },
  async chatGet() {
    const r = await fetch('/api/projets/' + idProjet + '/chat');
    return r.json();
  },
  async chatPost(message, signal) {
    const r = await fetch('/api/projets/' + idProjet + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }), signal,
    });
    const data = await r.json();
    if (r.status === 409) throw new Error(data.detail || 'Un run est déjà en cours.');
    if (!r.ok) throw new Error(data.detail || r.statusText);
    return data;
  },
  async reponsesPost(reponses, signal) {
    const r = await fetch('/api/projets/' + idProjet + '/reponses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reponses }), signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || r.statusText);
    return data;
  },
  async document(path) {
    const r = await fetch('/api/projets/' + idProjet + '/document?path=' + encodeURIComponent(path));
    if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
    return r.json();
  },
};
