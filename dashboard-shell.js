'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const overview = !query.has('watch') && (['overview', 'visual-preview'].includes(query.get('view')) ||
    ['fsport', 'fq'].some(key => query.has(key)));
  document.documentElement.classList.toggle('unified-desk', !overview);

  const menu = $('research-pages');
  if (!overview) {
    const sports = $('sport-nav');
    const railHeading = sports.parentElement;
    $('dashboard-sports').append(sports);
    railHeading.remove();
    $('desk-page-group').prepend($('app-tabs'));
    document.querySelector('.competition-rail').before(document.querySelector('.filter-panel'));
    const coverage = $('sport-evidence');
    const disclosure = document.createElement('details');
    disclosure.id = 'dashboard-coverage';
    disclosure.open = location.hash === '#sport-evidence';
    disclosure.className = 'coverage-disclosure';
    const summary = document.createElement('summary');
    summary.textContent = 'Sport coverage and safeguards';
    coverage.before(disclosure);
    disclosure.append(summary, coverage, $('paper-eligibility-audit'), $('coverage-summary'));
    for (const id of ['racing-date-coverage', 'tennis-tournament-coverage']) {
      const section = $(id);
      if (section) disclosure.append(section);
    }

    const phone = matchMedia('(max-width: 680px)');
    function responsiveDisclosure(anchor, label, className, ...controls) {
      const group = document.createElement('details');
      group.className = className;
      const trigger = document.createElement('summary');
      trigger.textContent = label;
      anchor.before(group);
      group.append(trigger, ...controls);
      const resize = () => { group.open = !phone.matches; };
      phone.addEventListener('change', resize);
      resize();
    }
    const engine = document.querySelector('.engine-switch');
    responsiveDisclosure(engine, 'Model engine', 'dashboard-engine-tools', engine);
    const filters = document.querySelector('.filter-controls');
    responsiveDisclosure(filters, 'Dates and filters', 'dashboard-filter-tools', filters);
    const scope = document.querySelector('#events-view .build-scope');
    responsiveDisclosure(scope, 'Paper slip tools', 'dashboard-slip-tools', scope,
      $('find-racing'), $('generate'), $('fresh-daily-slips'));
    document.querySelector('#slip-panel .slip-footnote').before($('weekly-wildcard'));
    menu.addEventListener('click', event => {
      if (event.target.closest('[data-view]')) {
        menu.open = false;
        document.querySelector('#main-content').focus();
      }
    });
    document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open && menu.contains(document.activeElement)) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  const policy = window.ValueWatchSportsWatch;
  const watch = $('dashboard-watch');
  const share = $('dashboard-share');
  const copyStatus = $('dashboard-copy-status');
  const title = $('dashboard-watch-title');
  title.tabIndex = -1;
  let selected = null;
  let activeKey = '';
  let approvals = [];
  let provider = null;

  function approvedProvider(event) {
    const matches = approvals.filter(entry => entry?.event_key === event.key && entry.sport === event.sport &&
      entry.approved === true && entry.event_time === event.time);
    if (matches.length !== 1) return null;
    const entry = matches[0];
    const id = policy.youtubeId(entry.url);
    if (id) return { link: 'https://www.youtube.com/watch?v=' + id,
      embed: entry.embed_allowed === true ? policy.embedUrl(id) : null };
    try {
      const url = new URL(entry.url);
      const approved = policy.bySport(event.sport).some(source => {
        const base = new URL(source.url);
        return url.origin === base.origin && url.pathname.startsWith(base.pathname) && url.pathname !== base.pathname;
      });
      if (approved && url.protocol === 'https:' && !url.username && !url.password &&
          !url.port && !url.search && !url.hash) return { link: url.href, embed: null };
    } catch { /* Invalid approval record. */ }
    return null;
  }

  function render(event, requested) {
    selected = event;
    const next = event && policy ? approvedProvider(event) : null;
    const nextKey = JSON.stringify([event?.key, event?.name, event?.time, Boolean(requested), next?.link, next?.embed]);
    if (activeKey === nextKey) return;
    activeKey = nextKey;
    provider = next;
    watch.hidden = !requested;
    $('copy-event-link').disabled = !event;
    $('dashboard-watch-fixture').textContent = event?.name || '';
    $('dashboard-watch-note').textContent = event
      ? provider ? 'Approved provider for this fixture. Availability depends on the provider.' : 'No approved event-specific provider link or video is available for this fixture.'
      : 'The selected event is unavailable in the loaded snapshots. Check the source status or reopen a fixture.';
    $('dashboard-provider-controls').hidden = !provider;
    $('dashboard-play').hidden = !provider?.embed;
    $('dashboard-watch-player').replaceChildren();
    if (provider) $('dashboard-provider-open').href = provider.link;
    else $('dashboard-provider-open').removeAttribute('href');
    share.hidden = true;
    copyStatus.textContent = '';
  }

  async function copy(value, label) {
    share.hidden = true;
    try {
      await navigator.clipboard.writeText(value);
      copyStatus.textContent = label + ' copied.';
    } catch {
      share.hidden = false;
      const field = $('dashboard-copy-value');
      field.value = value;
      field.focus();
      field.select();
      copyStatus.textContent = 'Automatic copying is unavailable. Link selected for manual copy.';
    }
  }

  $('copy-event-link').addEventListener('click', () => {
    if (!selected) return;
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('sport', selected.sport);
    url.searchParams.set('watch', selected.key);
    return copy(url.href, 'Event link');
  });
  $('copy-provider-link').addEventListener('click', () => {
    if (provider) return copy(provider.link, 'Provider link');
  });
  $('dashboard-play').addEventListener('click', () => {
    if (!provider?.embed || $('dashboard-watch-player').firstChild) return;
    const frame = document.createElement('iframe');
    frame.title = 'Approved provider video for ' + selected.name;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    frame.src = provider.embed;
    $('dashboard-watch-player').append(frame);
  });

  window.addEventListener('valuewatch:watch-selection', ({detail}) => render(detail.event, detail.requested));
  window.dispatchEvent(new Event('valuewatch:watch-ready'));
  fetch('./sports-watch/approved-events.json', { cache: 'no-store' }).then(async response => {
    if (!response.ok) return;
    const document = await response.json();
    if (document?.version !== 1 || !Array.isArray(document.events)) return;
    approvals = document.events;
    render(selected, !watch.hidden);
  }).catch(() => { /* Watch remains usable without a provider registry. */ });
})();
