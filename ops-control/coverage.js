'use strict';

(() => {
  const timeInLondon = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  function count(value) {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : 'Unavailable';
  }

  function appendRow(body, values) {
    const row = body.insertRow();
    for (const value of values) row.insertCell().textContent = value;
  }

  async function renderAudit(sport, filename, render) {
    const status = document.getElementById(sport + '-diagnostic-status');
    const body = document.getElementById(sport + '-diagnostics');
    try {
      const response = await fetch('../' + filename, {cache: 'no-cache'});
      if (!response.ok) throw new Error('Snapshot unavailable');
      const audit = await response.json();
      const generated = Date.parse(audit.generated_at_utc);
      if (audit.research_only !== true || audit.model_validation !== 'UNVALIDATED' ||
          audit.publication_gate !== 'BLOCKED' || !Number.isFinite(generated)) {
        throw new Error('Unverified snapshot');
      }
      const note = render(body, audit);
      status.textContent = 'Snapshot: ' + timeInLondon.format(generated) + ' UK. ' + note;
    } catch {
      body.replaceChildren();
      status.textContent = 'The published source audit is unavailable.';
    }
  }

  renderAudit('racing', 'racing-future-data.json', (body, audit) => {
    if (!Array.isArray(audit.days)) throw new Error('Missing daily diagnostics');
    for (const day of ValueWatchRacingCoverage.daily(audit)) {
      const details = [day.indexStatus || 'Unavailable', count(day.indexRaces) + ' index races',
        day.sourceDates.length ? 'Response dates: ' + day.sourceDates.join(', ') : '', day.error].filter(Boolean).join(' · ');
      appendRow(body, [day.date || 'Unavailable', details,
        count(day.meetings) + ' meetings · ' + count(day.recoveredPages) + ' / ' + count(day.attempted) + ' pages recovered',
        count(day.races) + ' published · ' + count(day.recoveredRaces) + ' recovered from meeting pages',
        count(day.observedFields) + ' single-source fields · ' + count(day.unconfirmedFields) + ' unconfirmed · ' +
        count(day.runnerObservations) + ' meeting-page runner observations', day.scope]);
    }
    const providers = document.getElementById('racing-provider-diagnostics');
    if (Array.isArray(audit.fixture_provider_results)) {
      for (const result of audit.fixture_provider_results.filter(row => row && row.status !== 'SOURCE_OBSERVED')) {
        const item = document.createElement('li');
        item.textContent = [result.provider, result.status, result.error].filter(Boolean).join(' · ');
        providers.append(item);
      }
    }
    return 'Meeting-page recovery records partial source observations. Coverage and declarations can remain incomplete.';
  });

  renderAudit('football', 'football-expanded-data.json', (body, audit) => {
    if (!audit.league_audits || typeof audit.league_audits !== 'object') throw new Error('Missing competition diagnostics');
    for (const [code, league] of Object.entries(audit.league_audits)) {
      const errors = Array.isArray(league.source_errors) ? league.source_errors.map(issue =>
        [issue.source, issue.month, issue.error].filter(Boolean).join(' · ')).join(' | ') : '';
      appendRow(body, [league.name || code, count(league.discovered_fixtures),
        count(league.schedule_matches), errors || 'No source exception recorded']);
    }
    return 'Discovered fixtures come from the primary feed. Corroboration depends on the secondary source responding.';
  });
})();
