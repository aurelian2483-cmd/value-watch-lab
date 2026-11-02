/* Published qualitative research is distinct from model forecasts and qualified bets. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const format = value => new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
  let generation = 0;
  function node(parent, tag, text, className) {
    const child = document.createElement(tag);
    if (text !== undefined) child.textContent = String(text);
    if (className) child.className = className;
    parent.append(child);
    return child;
  }
  async function json(url) {
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error('Published file unavailable');
    return response.json();
  }
  function validate(report) {
    if (report.kind !== 'MASTER_RESEARCH_REPORT' || report.live !== false || report.modelValidated !== false || report.qualifiedCount !== 0 || !Array.isArray(report.preselected) || !Array.isArray(report.builders) || !Array.isArray(report.passes)) throw Error('Research report controls failed');
    const ids = new Set();
    for (const item of [...report.preselected, ...report.builders]) {
      if (!item.id || ids.has(item.id) || !item.event || !item.home || !item.away || !Number.isFinite(Date.parse(item.startUTC)) || item.price !== null) throw Error('Invalid or duplicate research item');
      ids.add(item.id);
    }
    for (const builder of report.builders) {
      if (builder.jointProbability !== null || builder.expectedValue !== null || !Array.isArray(builder.legs) || builder.legs.length < 2 || builder.legs.some(leg => typeof leg.selection !== 'string' || !leg.selection.trim())) throw Error('Invalid experimental builder');
    }
  }
  function fixtureStatus(item, feeds) {
    if (Date.parse(item.startUTC) <= Date.now()) return 'PAST RESEARCH';
    const match = feeds.some(feed => {
      const age = Date.now() - Date.parse(feed.generated_at_utc);
      if (feed.research_only !== true || feed.publication_gate !== 'BLOCKED' || feed.model_validation !== 'UNVALIDATED' || !Number.isFinite(age) || age < -300000 || age > 36 * 3600000) return false;
      return (feed.upcoming_fixtures || []).some(f => f.home === item.home && f.away === item.away && Math.abs(Date.parse(f.kickoff_utc) - Date.parse(item.startUTC)) <= 60000 && f.verification === 'SCHEDULE_CROSS_CHECK');
    });
    return match ? 'SCHEDULE CROSS-CHECKED' : 'SCHEDULE RECHECK REQUIRED';
  }
  async function copy(text, status) {
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied experimental research with its evidence warnings.';
    } catch {
      status.replaceChildren();
      const area = node(status, 'textarea');
      area.value = text; area.readOnly = true; area.rows = 8;
      area.setAttribute('aria-label', 'Research text to copy');
      area.style.cssText = 'display:block;width:100%;margin:10px 0;padding:10px;font:inherit';
      area.focus(); area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch {}
      if (copied) status.textContent = 'Copied experimental research with its evidence warnings.';
      else node(status, 'span', 'Select the text above and choose Copy. Automatic clipboard access is unavailable.');
    }
  }
  async function load() {
    const current = ++generation;
    const button = el('mastercopy');
    button.disabled = true;
    try {
      const report = await json('./master-research-report.json');
      validate(report);
      const fetched = await Promise.allSettled([json('./research-dashboard-data.json'), json('./football-expanded-data.json'), json('./research-reports/index.json')]);
      if (current !== generation) return;
      const feeds = fetched.slice(0, 2).filter(r => r.status === 'fulfilled').map(r => r.value);
      el('masterstate').textContent = 'PUBLISHED CHAT REPORT · ' + report.snapshotDate;
      el('masterdate').textContent = 'Chat report: ' + report.snapshotDate + ' · Website publication: ' + format(report.publishedAtUTC) + ' UK. Supporting observations are copied research and have not been reverified.';
      const passes = el('masterpasses'); passes.replaceChildren();
      for (const pass of report.passes) {
        const card = node(passes, 'div', undefined, 'card');
        node(card, 'b', pass.label); node(card, 'div', pass.coverage, 'small'); node(card, 'div', pass.notes, 'small');
      }
      const picks = el('masterpicks'); picks.replaceChildren();
      const active = report.preselected.filter(p => fixtureStatus(p, feeds) === 'SCHEDULE CROSS-CHECKED');
      const others = report.preselected.filter(p => !active.includes(p));
      const renderPick = (parent, p) => {
        const card = node(parent, 'article', undefined, 'card');
        node(card, 'h3', p.event); node(card, 'p', p.market);
        node(card, 'span', p.status, 'pill');
        node(card, 'p', format(p.startUTC) + ' UK · ' + fixtureStatus(p, feeds), 'small');
        node(card, 'p', 'Reported support: ' + p.support, 'small');
        node(card, 'p', 'Counter-evidence / gaps: ' + p.counter, 'small');
        node(card, 'p', p.verification + ' Price and selection probability unavailable.', 'small');
      };
      for (const p of active) renderPick(picks, p);
      if (!active.length) node(picks, 'p', 'No upcoming singles have a current schedule match.', 'empty');
      if (others.length) {
        const details = node(picks, 'details'); node(details, 'summary', 'Past / schedule-unconfirmed singles (' + others.length + ')');
        for (const p of others) renderPick(details, p);
      }
      const builders = el('chatbuilders'); builders.replaceChildren();
      for (const b of report.builders) {
        const card = node(builders, 'article', undefined, 'card');
        node(card, 'h3', b.title); node(card, 'span', b.status, 'pill');
        node(card, 'p', format(b.startUTC) + ' UK · ' + fixtureStatus(b, feeds), 'small');
        node(card, 'p', b.evidenceStatus, 'small');
        const list = node(card, 'ol');
        for (const leg of b.legs) {
          const row = node(list, 'li'); node(row, 'strong', leg.selection); node(row, 'p', leg.support, 'small');
        }
        node(card, 'p', 'Counter-evidence / gaps: ' + b.counter, 'small');
        node(card, 'p', b.limitation, 'small');
        node(card, 'p', 'Combined price: UNPRICED · Joint probability: UNMODELLED · EV: UNKNOWN', 'small');
        const details = node(card, 'details'); node(details, 'summary', 'Publication evidence');
        node(details, 'p', b.provenance, 'small'); node(details, 'p', 'Schedule snapshot: ' + format(b.scheduleSnapshotUTC) + ' UK. Schedule checks do not validate the selection or its supporting statistics.', 'small');
        const status = node(card, 'p', '', 'small'); status.setAttribute('aria-live', 'polite');
        const copyButton = node(card, 'button', 'Copy ' + (b.id.includes('BUILDER-A') ? 'Builder A' : 'Builder B') + ' research', 'btn');
        copyButton.type = 'button'; copyButton.disabled = fixtureStatus(b, feeds) !== 'SCHEDULE CROSS-CHECKED';
        copyButton.onclick = () => copy(b.title + '\n' + b.legs.map((leg, i) => (i + 1) + '. ' + leg.selection).join('\n') + '\n' + format(b.startUTC) + ' UK\nEXPERIMENTAL / UNPRICED / UNMODELLED\nSupporting observations not reverified. No verified joint probability, EV or betting recommendation.\n' + b.limitation, status);
      }
      button.disabled = !active.length;
      button.onclick = () => copy('VALUE WATCH — PUBLISHED EXPERIMENTAL SINGLES\nReport: ' + report.snapshotDate + '\n' + active.map(p => p.event + ' | ' + p.market + ' | ' + format(p.startUTC) + ' UK').join('\n') + '\nEXPERIMENTAL / UNPRICED / UNMODELLED\nSchedule checks do not validate selections. No verified prices, EV or qualified bets.', el('mastercopystatus'));
      el('mastercopystatus').textContent = active.length + ' upcoming singles · ' + report.builders.length + ' published builders · 0 qualified bets. Builder legs are related research hypotheses, not independent evidence.';
      const provenance = el('chatpublication'); provenance.replaceChildren();
      node(provenance, 'p', 'Publication coverage: this 2 November report contains 3 recovered singles and 2 builders. It is not a complete copy of every chat. New chat messages require publication before appearing here.', 'small');
      const archive = fetched[2]?.status === 'fulfilled' ? fetched[2].value : null;
      if (archive?.kind === 'CHAT_RESEARCH_ARCHIVE') node(provenance, 'p', archive.additionalRecoveredReports + ' additional recovered reports · ' + archive.recoveredEntries + ' restored entries · ' + archive.gaps.length + ' recovery gap. Restored notes do not add official challenge credit.', 'small');
      const archiveLink = node(provenance, 'a', 'Browse all recovered chat reports', 'btn'); archiveLink.href = './research-reports/';
      for (const previous of report.previousReports || []) {
        const link = node(provenance, 'a', previous.label, 'btn'); link.href = previous.url;
      }
    } catch (error) {
      if (current !== generation) return;
      el('masterstate').textContent = 'REPORT UNAVAILABLE';
      el('masterdate').textContent = error.message;
      for (const id of ['masterpicks', 'chatbuilders', 'masterpasses', 'chatpublication']) el(id).replaceChildren();
      el('mastercopystatus').textContent = 'No verified published report available.';
      button.disabled = true;
    }
  }
  el('manualrefreshbutton')?.addEventListener('click', load);
  load();
})();
