/* kinks.js — affiche la liste des kinks depuis data/kinks.json.
   La liste se modifie depuis admin.html (onglet « Kinks »). */
(async () => {
  const root = document.getElementById('kinks-root');
  if (!root) return;
  try {
    const r = await fetch('data/kinks.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`data/kinks.json (${r.status})`);
    const list = await r.json();
    if (!Array.isArray(list)) throw new Error('data/kinks.json : format invalide');

    const names = list
      .map(k => (typeof k === 'string' ? k : (k && k.name) || ''))
      .map(s => String(s).trim())
      .filter(Boolean);

    root.replaceChildren(...names.map(n => {
      const d = document.createElement('div');
      d.className = 'kink';
      d.textContent = n;               // textContent : jamais de HTML injecté
      return d;
    }));
  } catch (err) {
    console.error('Chargement des kinks impossible :', err);
  }
})();
