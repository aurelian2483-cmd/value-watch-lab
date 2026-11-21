'use strict';

(() => {
  if (document.documentElement.classList.contains('visual-preview')) return;
  const overview = document.querySelector('.pro-landing');
  if (!overview) return;
  const hero = overview.querySelector('.pro-hero');
  const fixtures = overview.querySelector('.pro-reference-grid');
  const slips = overview.querySelector('.pro-slip-grid');
  const preview = document.getElementById('preview-slip-dropdown');
  const methods = overview.querySelector('.research-methods');
  const darts = overview.querySelector('.pro-darts-preview');
  const methodsNav = overview.querySelector('.pro-steps');

  // Keep visual, reading and keyboard order aligned.
  overview.append(hero, fixtures, slips, preview, darts, methods, methodsNav,
    overview.querySelector('.pro-disclosure'));
  hero.querySelector('h2').textContent = 'Research desk';
  hero.querySelector('p').textContent = 'Fixtures, source evidence and paper analysis across nine sport lanes.';
  hero.querySelector('.pro-hero-note').hidden = true;
  document.querySelector('#app-tabs [data-view="events"]').textContent = 'Events';
})();
