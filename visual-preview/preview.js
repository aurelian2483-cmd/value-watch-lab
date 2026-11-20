'use strict';

(() => {
  const toggle = document.getElementById('visual-preview-switch');
  if (new URLSearchParams(location.search).get('view') !== 'visual-preview') return;

  document.documentElement.classList.add('visual-preview');
  const heroHeading = document.querySelector('.pro-hero h2');
  if (heroHeading) heroHeading.textContent = 'Sports Research Desk';

  toggle.textContent = 'Return to classic design';
  const classic = new URL(location.href);
  classic.searchParams.delete('view');
  toggle.href = classic.href;

  const market = document.querySelector('.pro-reference-grid .pro-market');
  const darts = document.querySelector('.pro-darts-preview');
  if (market && darts) {
    const stack = document.createElement('div');
    stack.className = 'preview-market-stack';
    market.before(stack);
    stack.append(market, darts);
    darts.querySelector('.pro-darts-preview-summary').textContent = 'Historical Elo estimates and fixture coverage. Bookmaker prices unverified.';
  }

  const sportsPanel = document.querySelector('.workspace-grid > .navigation-rail');
  const competitionPicker = document.getElementById('competition')?.closest('label');
  const competitionPanel = sportsPanel?.querySelector('.competition-rail');
  if (sportsPanel && competitionPanel && competitionPicker) {
    sportsPanel.classList.add('preview-sports-panel');
    competitionPanel.append(competitionPicker);
    const tracker = sportsPanel.querySelector('.tracker-rail');
    const footer = sportsPanel.querySelector('.rail-footer');
    if (tracker) {
      const disclosure = document.createElement('details');
      disclosure.className = 'preview-tracker-dropdown';
      const label = document.createElement('summary');
      label.textContent = 'Event Tracker';
      const content = document.createElement('div');
      content.className = 'preview-tracker-content';
      tracker.before(disclosure);
      disclosure.append(label, content);
      content.append(tracker);
      if (footer) content.append(footer);
    }
    document.querySelector('.pro-steps').before(sportsPanel);
    const filters = document.querySelector('.workspace-grid .filter-panel');
    if (filters) {
      sportsPanel.after(filters);
      const engine = document.querySelector('.workspace-grid .engine-switch');
      if (engine) filters.after(engine);
    }
  }

  const sports = [
    ['[data-pro-sport="football"]', 'Football', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5 4 3-1.5 5h-5L8 10l4-3Zm0 0V2m4 8 5-2m-6.5 7 3 5m-8-5-3 5M8 10 3 8'],
    ['[data-pro-sport="racing"]', 'Horse racing', 'M5 21h14M8 21v-3h9v3M8 18v-4l4-4-1-3-4 4-3-2 6-7 1 3c5 0 8 4 8 8v5H8Z'],
    ['[data-pro-sport="tennis"]', 'Tennis', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM4 6c5 1 8 4 8 9 0 2-.5 4-2 7M14 2c-1 3-.5 6 2 8 1 1 3 2 6 2'],
    ['[data-pro-sport="nfl"]', 'NFL', 'M3 21C1 10 10 1 21 3c2 11-7 20-18 18ZM8 16l8-8m-7 4 3 3m0-6 3 3M4 15l5 5m6-16 5 5'],
    ['a[href="./darts/"]', 'Darts Lab', 'M20 12a8 8 0 1 1-8-8m4 8a4 4 0 1 1-4-4m0 4 8-8m-4 0h4V0'],
    ['a[href="./rugby/"]', 'Rugby Lab', 'M3 21C1 10 10 1 21 3c2 11-7 20-18 18ZM4 14l6 6M14 4l6 6M8 16l8-8']
  ];
  const nav = document.querySelector('.pro-topnav');
  const navItems = Array.from(nav.children);
  const menuLinks = navItems.slice(navItems.indexOf(toggle));
  const menu = document.createElement('details');
  menu.className = 'preview-nav-menu';
  const summary = document.createElement('summary');
  summary.textContent = 'Menu';
  const links = document.createElement('div');
  links.className = 'preview-nav-links';
  toggle.before(menu);
  menu.append(summary, links);
  links.append(...menuLinks);

  document.addEventListener('click', event => {
    if (!menu.contains(event.target) || links.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || !menu.open) return;
    menu.open = false;
    if (menu.contains(document.activeElement)) {
      event.preventDefault();
      summary.focus();
    }
  });

  const svgNamespace = 'http://www.w3.org/2000/svg';
  for (const [selector, label, pathData] of sports) {
    const item = nav.querySelector(selector);
    if (!item) continue;
    const icon = document.createElementNS(svgNamespace, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', pathData);
    icon.append(path);
    item.replaceChildren(icon, document.createTextNode(label));
  }
})();
