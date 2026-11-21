(function (root) {
  'use strict';

  // Coverage descriptions only. This module does not ingest or qualify evidence.
  const lanes = Object.freeze({
    football: 'Repository fixture snapshots and historical result and market evidence. Free-source candidate: OpenLigaDB community schedules. Its request limits remain unconfirmed.',
    racing: 'Repository racecard and future meeting snapshots. Confirmed declarations, current prices and independent settlement have limited coverage. No approved public machine-readable racecard feed identified.',
    tennis: 'Repository ATP/WTA fixture snapshot and archived result receipts. Draws may be incomplete. No approved free feed for exact fixture times or retirement settlement.',
    nfl: 'Repository NFL fixture snapshot and archived result receipts. The nflverse schedule candidate documents kickoff and game IDs. Reuse terms for the exact schedule export remain unconfirmed.',
    darts: 'Repository PDC and provider calendar snapshots. Dates and sessions may lack exact match times. No approved public fixtures or results feed identified.',
    rugby: 'Repository Union and League calendars and limited Pro D2 results. League coverage is schedule only. No approved public cross-code feed identified.',
    basketball: 'Discovery only. No approved fixture or results feed, stable event receipts or connected settlement.',
    cricket: 'Discovery only. Cricsheet offers licensed historical match data with match dates. Exact kickoff and a guaranteed refresh cadence remain unavailable.',
    golf: 'Manual directory only. No approved schedule, tee-time or results feed with stable event receipts.'
  });

  function laneForSport(sport) {
    return Object.hasOwn(lanes, sport) ? lanes[sport] : null;
  }

  const api = Object.freeze({laneForSport});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValueWatchFreeSourceLanes = api;
})(globalThis);
