'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValueWatchRacingCoverage = api;
})(globalThis, () => {
  const dayUK = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'});
  const list = value => Array.isArray(value) ? value : [];
  const known = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

  function daily(audit) {
    const racesByDate = new Map();
    for (const race of list(audit.races)) {
      const start = Date.parse(race?.startUTC);
      if (!Number.isFinite(start) || !race.race_id) continue;
      const date = dayUK.format(start);
      if (!racesByDate.has(date)) racesByDate.set(date, new Map());
      racesByDate.get(date).set(String(race.race_id), race);
    }
    return list(audit.days).map(day => {
      const meetings = list(audit.fixture_meetings).filter(row => row?.date === day.date && typeof row.course === 'string' && row.course.trim());
      const receipts = list(audit.meeting_card_results).filter(row => row?.date === day.date && row.url);
      const successful = new Set(receipts.filter(row => row.status === 'SOURCE_OBSERVED').map(row => row.url));
      const attempted = new Set(receipts.map(row => row.url));
      const races = [...(racesByDate.get(day.date)?.values() || [])];
      const fields = races.filter(row => row.runner_data_status === 'SINGLE_SOURCE_RUNNERS_OBSERVED').length;
      return {
        date: day.date, indexStatus: day.status, indexRaces: known(day.count), sourceDates: Object.keys(day.source_meeting_dates || {}),
        error: day.error, meetings: Array.isArray(audit.fixture_meetings) ?
          new Set(meetings.map(row => row.course.trim().toLowerCase())).size : null,
        attempted: Array.isArray(audit.meeting_card_results) ? attempted.size : null,
        recoveredPages: Array.isArray(audit.meeting_card_results) ? successful.size : null,
        recoveredRaces: known(day.meeting_page_races),
        races: Array.isArray(audit.races) ? races.length : null,
        observedFields: Array.isArray(audit.races) ? fields : null,
        unconfirmedFields: Array.isArray(audit.races) ? races.length - fields : null,
        runnerObservations: known(day.meeting_page_runner_observations),
        scope: races.length ? 'Partial source observations' : meetings.length ? 'Meetings observed; race coverage unknown' :
          'Schedule unknown; no racecards recovered'
      };
    });
  }

  return {daily};
});
