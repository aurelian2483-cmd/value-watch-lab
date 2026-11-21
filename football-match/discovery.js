'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FootballFixtureDiscovery = factory();
})(globalThis, function () {
  const preferenceKey = 'value-watch-football-discovery-favourites-v1';
  const statusLabels = Object.freeze({
    scheduled: 'Scheduled', elapsed: 'Kickoff elapsed · final unavailable',
    final: 'Source-backed final', archived: 'Historical reconstruction'
  });
  const ukDay = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'
  });
  const codes = value => Array.isArray(value) ?
    new Set(value.filter(code => typeof code === 'string' && /^[A-Z0-9]{1,12}$/.test(code)).slice(0,64)) : new Set();

  const browserStorage = () => globalThis.localStorage;

  function readFavourites(storage = browserStorage) {
    try { return codes(JSON.parse(storage().getItem(preferenceKey))); }
    catch { return new Set(); }
  }

  function saveFavourites(favourites, storage = browserStorage) {
    try {
      storage().setItem(preferenceKey, JSON.stringify([...codes([...favourites])]));
      return true;
    } catch { return false; }
  }

  function day(event, archive) {
    if (archive) return event.row.date;
    const parts = Object.fromEntries(ukDay.formatToParts(event.start).map(({type,value}) => [type,value]));
    return [parts.year,parts.month,parts.day].join('-');
  }

  function status(event, now, finals, archive) {
    if (archive) return 'archived';
    if (event.start > now) return 'scheduled';
    return finals.has(event.exact) ? 'final' : 'elapsed';
  }

  function groupFixtures(fixtures, archive) {
    const groups = new Map();
    for (const event of fixtures) {
      const key = day(event, archive);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(event);
    }
    return groups;
  }

  return { preferenceKey, statusLabels, readFavourites, saveFavourites, day, status, groupFixtures };
});
