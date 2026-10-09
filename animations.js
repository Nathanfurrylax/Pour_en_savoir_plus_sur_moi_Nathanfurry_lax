/* animations.js — rend la page vivante : révélation au scroll, pétales, barre de progression,
   menu actif, parallaxe du hero, bouton « retour en haut ».
   Fonctionne avec le contenu chargé plus tard (kinks, personnages). Respecte « réduire les animations ». */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  /* ───────── 1. Barre de progression + menu + parallaxe + retour en haut ───────── */
  const progress = make('div', 'progress');
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const toTop = make('button', 'to-top', '&#8593;');
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'Retour en haut de la page');
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  document.body.append(toTop);

  const nav = $('nav');
  const hero = $('.hero');
  let hint = null;
  if (hero && !reduce) {
    hint = make('a', 'scroll-hint', '<span class="mouse"></span><span>Scroll</span>');
    hint.href = '#kinks';
    hint.setAttribute('aria-label', 'Descendre vers la suite');
    document.body.append(hint);        // fixé en bas de l'écran, disparaît dès qu'on scrolle
  }

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    if (nav) nav.classList.toggle('scrolled', y > 24);
    toTop.classList.toggle('show', y > 600);
    if (hint) hint.classList.toggle('gone', y > 60);
    if (hero && !reduce && y < innerHeight * 1.3) hero.style.setProperty('--sy', y);
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ───────── 2. Menu : lien actif selon la section visible ───────── */
  const links = [...document.querySelectorAll('nav a[href^="#"]')];
  if ('IntersectionObserver' in window && links.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['hero', 'kinks', 'personnages', 'erp'].forEach(id => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ───────── 3. Pétales dans le hero ───────── */
  if (hero && !reduce) {
    const box = make('div', 'petals');
    box.setAttribute('aria-hidden', 'true');
    const colors = [['#f0abfc', '#e040fb'], ['#e879f9', '#a855f7'], ['#c084fc', '#7c3aed'], ['#67e8f9', '#22d3ee']];
    const count = innerWidth < 600 ? 9 : 18;
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < count; i++) {
      const p = make('span', 'petal');
      const [c1, c2] = colors[Math.floor(Math.random() * (i % 5 === 4 ? 4 : 3))]; // un peu de cyan, surtout du rose/violet
      const size = rnd(7, 15);
      p.style.setProperty('--x', `${rnd(0, 100).toFixed(1)}%`);
      p.style.setProperty('--s', `${size.toFixed(1)}px`);
      p.style.setProperty('--t', `${rnd(11, 22).toFixed(1)}s`);
      p.style.setProperty('--d', `${(-rnd(0, 22)).toFixed(1)}s`);
      p.style.setProperty('--dx', `${rnd(-90, 90).toFixed(0)}px`);
      p.style.setProperty('--o', rnd(.25, .65).toFixed(2));
      p.style.setProperty('--b', size < 9 ? '1.5px' : '0px');
      p.style.setProperty('--c1', c1);
      p.style.setProperty('--c2', c2);
      box.append(p);
    }
    hero.prepend(box);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => box.classList.toggle('paused', !en.isIntersecting), { threshold: 0 }).observe(hero);
    }
  }

  /* ───────── 4. Révélation au scroll ───────── */
  if (reduce || !('IntersectionObserver' in window)) return;

  const RULES = [
    ['.sec-title', 'title'],
    ['.sec-sub', ''],
    ['.divider', 'line'],
    ['.kink-note', ''],
    ['.note-card', 'left'],
    ['.kink', 'pop'],
    ['.source-label', ''],
    ['.char-card', 'pop'],
    ['.erp-card', 'pop'],
    ['footer', ''],
  ];

  const io = new IntersectionObserver(entries => {
    // Apparition en cascade pour les éléments qui entrent en même temps
    const visible = entries.filter(e => e.isIntersecting);
    visible.forEach((e, i) => {
      const el = e.target;
      const delay = Math.min(i, 14) * 55;
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add('in');
      io.unobserve(el);
      // Une fois affiché, on retire la mécanique pour retrouver les effets de survol d'origine
      setTimeout(() => {
        el.classList.remove('reveal', 'in');
        el.removeAttribute('data-r');
        el.style.transitionDelay = '';
      }, 1100 + delay);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  const prepare = (el, variant) => {
    if (el.dataset.rv) return;
    el.dataset.rv = '1';
    el.classList.add('reveal');
    if (variant) el.dataset.r = variant;
    io.observe(el);
  };
  const tag = root => RULES.forEach(([sel, variant]) => {
    if (root.nodeType === 1 && root.matches(sel)) prepare(root, variant);
    root.querySelectorAll(sel).forEach(el => prepare(el, variant));
  });

  tag(document);

  // Contenu ajouté plus tard (kinks et personnages chargés depuis les JSON)
  ['kinks-root', 'personnages-root'].forEach(id => {
    const target = document.getElementById(id);
    if (!target) return;
    new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) tag(n);
    }))).observe(target, { childList: true, subtree: true });
  });
})();
