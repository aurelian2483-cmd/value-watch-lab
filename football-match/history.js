'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else root.FootballMatchHistory = factory(root.FootballMatchEvidence);
})(globalThis, function (evidence) {
  const archiveNames = {
    'AFC Bournemouth':'Bournemouth', 'Wolverhampton Wanderers FC':'Wolves',
    'Brighton & Hove Albion FC':'Brighton', 'Tottenham Hotspur FC':'Tottenham',
    'Newcastle United FC':'Newcastle', 'West Ham United FC':'West Ham',
    'Leeds United FC':'Leeds', 'Sunderland AFC':'Sunderland',
    'Ipswich Town FC':'Ipswich', 'Leicester City FC':'Leicester',
    'Leeds United':'Leeds', 'Ipswich Town':'Ipswich', 'Leicester City':'Leicester',
    'Newcastle United':'Newcastle', 'West Ham United':'West Ham', 'Tottenham Hotspur':'Tottenham',
    'Wolverhampton Wanderers':'Wolves', 'Brighton & Hove Albion':'Brighton'
  };
  const score = value => Number.isSafeInteger(value) && value >= 0;

  const archiveName = name => archiveNames[name] ?? name.replace(/ FC$/, '');

  function archiveMatches(document) {
    return evidence.historicalRows(document).filter(row => Array.isArray(row.ft) &&
      row.ft.length === 2 && row.ft.every(score)).map(row => ({
      league:'PL', season:row.season, day:row.date, home:archiveName(row.home),
      away:archiveName(row.away), goals:row.ft
    }));
  }

  function competitionMatches(feed) {
    if (feed?.research_only !== true || feed.model_validation !== 'UNVALIDATED' ||
        feed.publication_gate !== 'BLOCKED' || !Array.isArray(feed.performance?.entries)) return [];
    const published = evidence.instant(feed.generated_at_utc);
    const matches = new Map();
    for (const row of feed.performance.entries) {
      if (!row || row.verification !== 'TWO_SOURCE_REGULATION_TIME_FINAL' || row.publication_gate !== 'BLOCKED' ||
          ![row.league,row.home,row.away].every(value => typeof value === 'string' && value.trim()) ||
          ![row.score_home,row.score_away].every(score) || !Array.isArray(row.source_receipts)) continue;
      const kickoff = evidence.instant(row.kickoff_utc);
      const receipts = row.source_receipts.filter(receipt => evidence.receiptURL(receipt?.url) && evidence.hash(receipt.sha256) &&
        evidence.instant(receipt.observed_at_utc) > kickoff && evidence.instant(receipt.observed_at_utc) <= published);
      if (new Set(receipts.map(receipt => new URL(receipt.url).hostname)).size < 2) continue;
      const day = new Date(kickoff).toISOString().slice(0,10);
      const key = JSON.stringify([row.league,row.home,row.away,new Date(kickoff).toISOString()]);
      const candidate = {exact:key,league:row.league,day,home:row.home,away:row.away,goals:[row.score_home,row.score_away]};
      const previous = matches.get(key);
      if (!matches.has(key)) matches.set(key,candidate);
      else if (!previous || previous.goals.some((goal,index) => goal !== candidate.goals[index])) matches.set(key,null);
    }
    return [...matches.values()].filter(Boolean);
  }

  function matchHistory(event, matches) {
    const [league,...teams] = event.identity;
    const [home,away] = league === 'PL' ? teams.map(archiveName) : teams;
    const cutoffDay = event.archived ? event.row.date : new Date(event.marketCutoff).toISOString().slice(0,10);
    const prior = matches.filter(match => match.league === league && match.day < cutoffDay)
      .sort((a,b) => b.day.localeCompare(a.day));
    const forTeam = (team, side) => prior.flatMap(match => {
      const venue = match.home === team ? 'home' : match.away === team ? 'away' : null;
      if (!venue || (side && side !== venue)) return [];
      const isHome = venue === 'home';
      const scored = match.goals[isHome ? 0 : 1];
      const conceded = match.goals[isHome ? 1 : 0];
      return [{day:match.day,venue,opponent:isHome ? match.away : match.home,scored,conceded,
        outcome:scored === conceded ? 'D' : scored > conceded ? 'W' : 'L'}];
    });
    return { count:prior.length, goals:prior.reduce((sum,match) => sum + match.goals[0] + match.goals[1],0),
      home:forTeam(home), away:forTeam(away), homeVenue:forTeam(home,'home'), awayVenue:forTeam(away,'away'),
      meetings:prior.filter(match => (match.home === home && match.away === away) || (match.home === away && match.away === home)) };
  }

  return { archiveMatches, competitionMatches, matchHistory, premierLeagueTeam: archiveName };
});
