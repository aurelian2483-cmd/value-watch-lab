(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchConnections = factory();
})(globalThis, function () {
  'use strict';
  const paths = Object.freeze({ football: 'football', racing: 'horse-racing', tennis: 'tennis', nfl: 'american-football' });
  function oddschecker(sport) {
    if (!Object.hasOwn(paths, sport)) throw Error('Unsupported sport.');
    return 'https://www.oddschecker.com/' + paths[sport];
  }
  // Exact match links must come from a source receipt, never a guessed team-name slug.
  function eventLink(event, hostname) {
    if (!['www.oddschecker.com', 'www.sofascore.com'].includes(hostname)) return null;
    for (const receipt of event.sources || []) {
      try {
        const url = new URL(receipt.url);
        if (url.protocol === 'https:' && !url.username && !url.password &&
            [hostname, hostname.replace(/^www\./, '')].includes(url.hostname) && url.pathname !== '/') return url.href;
      } catch {}
    }
    return null;
  }
  return Object.freeze({ oddschecker, eventLink });
});
