'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../football-match/core'), require('../football-match/history'));
  else root.FootballTeamIntelligence = factory(root.FootballMatchEvidence, root.FootballMatchHistory);
})(globalThis, function (evidence, history) {
  const competitionNames = Object.freeze({
    PL:'Premier League', E1:'Championship', SP1:'La Liga', D1:'Bundesliga', I1:'Serie A', F1:'Ligue 1', UCL:'Champions League'
  });
  const label = code => competitionNames[code] ?? code;
  const teamKey = (league, name) => league === 'PL' ? history.premierLeagueTeam(name) : name;
  const scheduleSnapshot = (feed, now) => feed?.schema_version === 1 && feed.research_only === true &&
    feed.model_validation === 'UNVALIDATED' && feed.publication_gate === 'BLOCKED' &&
    Array.isArray(feed.upcoming_fixtures) && evidence.instant(feed.generated_at_utc) <= now;
  const staleHours = 48;
  const isStale = (feed, now) => now - evidence.instant(feed.generated_at_utc) >= staleHours * 3600000;
  const summary = games => games.reduce((stats, game) => {
    stats[game.outcome]++;
    stats.goalsFor += game.goalsFor;
    stats.goalsAgainst += game.goalsAgainst;
    stats.points += game.points;
    return stats;
  }, {played:games.length, W:0, D:0, L:0, goalsFor:0, goalsAgainst:0, points:0});

  function build({archive, premier, expanded}, now = Date.now()) {
    const plAvailable = scheduleSnapshot(premier, now);
    const expandedAvailable = scheduleSnapshot(expanded, now);
    const fixtures = evidence.fixtureIndex([plAvailable ? premier : null, expandedAvailable ? expanded : null], now);
    const competitions = new Map();
    function team(league, name) {
      if (!competitions.has(league)) competitions.set(league, {matches:[], teams:new Map()});
      const competition = competitions.get(league);
      const key = teamKey(league,name);
      if (!competition.teams.has(key)) competition.teams.set(key, {name:key, games:[], upcoming:[]});
      return competition.teams.get(key);
    }

    const retrospective = history.archiveMatches(archive);
    const finals = expandedAvailable ? history.competitionMatches(expanded).filter(match => match.league !== 'PL') : [];
    for (const match of [...retrospective,...finals]) {
      const home = team(match.league,match.home);
      const away = team(match.league,match.away);
      if (home === away) continue;
      competitions.get(match.league).matches.push(match);
      [home,away].forEach((entry, index) => {
        const goalsFor = match.goals[index];
        const goalsAgainst = match.goals[1-index];
        entry.games.push({day:match.day, opponent:[away,home][index].name, venue:index === 0 ? 'Home' : 'Away',
          goalsFor, goalsAgainst, points:goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0,
          outcome:goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L'});
      });
    }

    for (const event of fixtures.events) {
      const [league,home,away] = event.identity;
      const participants = [team(league,home),team(league,away)];
      if (event.start > now) for (const entry of new Set(participants)) entry.upcoming.push(event);
    }

    for (const competition of competitions.values()) {
      for (const entry of competition.teams.values()) {
        entry.games.sort((a,b) => a.day.localeCompare(b.day));
        entry.upcoming.sort((a,b) => a.start - b.start);
        entry.overall = summary(entry.games);
        entry.home = summary(entry.games.filter(game => game.venue === 'Home'));
        entry.away = summary(entry.games.filter(game => game.venue === 'Away'));
        const ten = entry.games.slice(-10);
        // Date-only records cannot establish the order of two matches on the same day.
        entry.trend = ten.length === 10 && new Set(ten.map(game => game.day)).size === 10 &&
          entry.games.at(-11)?.day !== ten[0].day ?
          [summary(ten.slice(0,5)).points / 5, summary(ten.slice(5)).points / 5] : null;
      }
    }

    const schedule = (feed, available, league) => ({
      state: !available ? 'unavailable' : isStale(feed,now) ? 'stale' : 'available',
      observed: available ? evidence.instant(feed.generated_at_utc) : null,
      count: fixtures.events.filter(event => (event.identity[0] === 'PL') === (league === 'PL') && event.start > now).length
    });
    return {competitions, retrospectiveCount:retrospective.length, finalsCount:finals.length,
      premier:schedule(premier,plAvailable,'PL'), expanded:schedule(expanded,expandedAvailable,'expanded'),
      conflicts:fixtures.conflicts.size};
  }

  function fixtureHref(event) {
    return '../football-match/?' + new URLSearchParams({competition:event.identity[0], event:event.id});
  }

  return { build, fixtureHref, label, staleHours };
});
