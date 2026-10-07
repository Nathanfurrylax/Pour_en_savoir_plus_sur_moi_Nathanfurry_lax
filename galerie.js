/* galerie.js — construit la section Personnages depuis data/*.json,
   puis active le slider, la grille, le flou NSFW et la vue en grand. */
(() => {
  const AUTOPLAY_MS = 3500;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.getElementById('personnages-root');
  if (!root) return;

  /* ── Utilitaires ── */
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;          // textContent : jamais de HTML injecté
    return e;
  };
  const path   = p => String(p || '').replace(/^\//, '');   // "/images/a.webp" -> "images/a.webp" (marche sur GitHub Pages en sous-dossier)
  const isHttp = u => /^https?:\/\//i.test(u || '');
  const isHex  = c => /^#[0-9a-f]{6}$/i.test(c || '');
  const loadJSON = async file => {
    const r = await fetch(file, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${file} (${r.status})`);
    return r.json();
  };

  /* ── Fenêtres (créées une seule fois) ── */
  document.body.insertAdjacentHTML('beforeend', `
<dialog class="gallery" id="gallery" aria-labelledby="g-title">
  <div class="g-head">
    <span class="g-title" id="g-title"></span>
    <a class="g-wiki" target="_blank" rel="noopener noreferrer" hidden>Wikipédia ↗</a>
    <button class="g-close" type="button" aria-label="Fermer">✕</button>
  </div>
  <div class="g-grid"></div>
</dialog>
<dialog class="viewer" id="viewer" aria-label="Image en grand">
  <img alt="">
  <button class="v-btn v-prev" type="button" aria-label="Image précédente">‹</button>
  <button class="v-btn v-next" type="button" aria-label="Image suivante">›</button>
</dialog>`);

  const dlg    = document.getElementById('gallery');
  const grid   = dlg.querySelector('.g-grid');
  const title  = dlg.querySelector('.g-title');
  const wiki   = dlg.querySelector('.g-wiki');
  const viewer = document.getElementById('viewer');
  const vImg   = viewer.querySelector('img');
  const vBtns  = viewer.querySelectorAll('.v-btn');
  let list = [], cur = 0;

  dlg.querySelector('.g-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  const showBig = n => {
    cur = (n + list.length) % list.length;
    vImg.src = list[cur].src;
    vImg.alt = list[cur].alt;
  };
  grid.addEventListener('click', e => {
    const t = e.target.closest('.thumb');
    if (!t) return;
    list = [...grid.querySelectorAll('.thumb img')];
    vBtns.forEach(b => b.hidden = list.length < 2);
    showBig(list.indexOf(t.querySelector('img')));
    viewer.showModal();
  });
  viewer.addEventListener('click', e => {
    const b = e.target.closest('.v-btn');
    if (b) showBig(cur + (b.classList.contains('v-next') ? 1 : -1));
    else viewer.close();
  });
  viewer.addEventListener('keydown', e => {
    if (list.length < 2) return;
    if (e.key === 'ArrowRight') showBig(cur + 1);
    if (e.key === 'ArrowLeft')  showBig(cur - 1);
  });

  /* ── Construction d'une carte ── */
  function buildCard(p, color) {
    const imgs = (Array.isArray(p.images) ? p.images : []).filter(i => i && i.src);
    if (!p.name || !imgs.length) return null;

    const card = el('div', 'char-card');
    if (isHttp(p.wiki)) card.dataset.wiki = p.wiki;

    const media = el('div', 'char-media');
    media.setAttribute('role', 'button');
    media.tabIndex = 0;
    imgs.forEach((im, k) => {
      const img = new Image();
      img.className = 'slide';
      img.decoding = 'async';
      if (k > 0) img.loading = 'lazy';
      img.alt = `${p.name} — ${k + 1}`;
      img.src = path(im.src);
      if (im.nsfw) img.dataset.nsfw = '';
      media.append(img);
    });

    const foot = el('div', 'char-footer');
    foot.style.borderTop = `2px solid ${color}45`;
    foot.append(el('span', 'char-name', p.name));

    card.append(media, foot);
    return card;
  }

  /* ── Comportement d'une carte : slider + ouverture de la grille ── */
  function initCard(card) {
    const media  = card.querySelector('.char-media');
    const slides = [...media.querySelectorAll('.slide')];
    const name   = card.querySelector('.char-name').textContent.trim();
    let i = 0, timer = null, dots = [];

    media.setAttribute('aria-label', `Voir toutes les images de ${name}`);

    if (slides.length > 1) {
      const d = el('div', 'dots');
      dots = slides.map(() => d.appendChild(document.createElement('i')));
      media.append(d, el('span', 'count', `▦ ${slides.length}`));
    }

    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('on', k === i));
      dots.forEach((x, k) => x.classList.toggle('on', k === i));
    };
    const stop  = () => { clearInterval(timer); timer = null; };
    const start = () => {
      if (reduce || slides.length < 2 || timer) return;
      timer = setInterval(() => show(i + 1), AUTOPLAY_MS);
    };
    show(0);

    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) setTimeout(start, Math.random() * 1500); else stop();
    }, { threshold: .3 }).observe(card);

    card.addEventListener('mouseenter', stop);
    card.addEventListener('mouseleave', start);
    media.addEventListener('focus', stop);
    media.addEventListener('blur', start);

    const open = () => {
      title.textContent = name;
      const url = card.dataset.wiki;
      wiki.hidden = !url;
      if (url) wiki.href = url;

      grid.replaceChildren(...slides.map((s, k) => {
        const b = el('button', 'thumb');
        b.type = 'button';
        b.style.setProperty('--n', k);
        b.setAttribute('aria-label', `Afficher l'image ${k + 1} en grand`);
        if (s.hasAttribute('data-nsfw')) b.dataset.nsfw = '';
        const im = new Image();
        im.src = s.src;
        im.alt = s.alt;
        b.append(im);
        return b;
      }));
      grid.scrollTop = 0;
      dlg.showModal();
    };
    media.addEventListener('click', open);
    media.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  /* ── Chargement des données et affichage ── */
  (async () => {
    let sources, persos;
    try {
      [sources, persos] = await Promise.all([
        loadJSON('data/sources.json'),
        loadJSON('data/personnages.json'),
      ]);
    } catch (err) {
      console.error('Chargement des personnages impossible :', err);
      root.append(el('p', 'sec-sub', 'Les personnages ne peuvent pas être chargés pour le moment.'));
      return;
    }
    sources = Array.isArray(sources) ? sources : [];
    persos  = Array.isArray(persos)  ? persos  : [];

    const groups = sources.map(s => ({ name: s.name, color: s.color, list: [] }));
    const others = { name: 'Autres', color: '#a855f7', list: [] };
    persos.forEach(p => (groups.find(g => g.name === p.source) || others).list.push(p));
    if (others.list.length) groups.push(others);

    groups.forEach(g => {
      const color = isHex(g.color) ? g.color : '#a855f7';
      const cards = g.list.map(p => buildCard(p, color)).filter(Boolean);
      if (!cards.length) return;

      const block = el('div', 'source-block');
      const label = el('div', 'source-label', g.name);
      label.style.cssText = `color:${color};background:linear-gradient(135deg,${color}28,${color}10);border:1px solid ${color}65`;
      const gridEl = el('div', 'char-grid');
      gridEl.append(...cards);
      block.append(label, gridEl);
      root.append(block);
    });

    root.querySelectorAll('.char-card').forEach(initCard);
  })();
})();
