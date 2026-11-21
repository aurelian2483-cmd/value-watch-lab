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

  function inferredSeason(day) {
    const year = Number(day.slice(0,4)) - (day.slice(5,7) < '07' ? 1 : 0);
    return year + '-' + String(year + 1).slice(-2);
  }

  function resultsTrend(games) {
    const ten = games.slice(-10);
    // Date-only rows cannot resolve ties within or at the boundary of the windows.
    if (ten.length !== 10 || new Set(ten.map(game => game.day)).size !== 10 || games.at(-11)?.day === ten[0].day)
      return null;
    return [ten.slice(0,5),ten.slice(5)].map(window => ({
      ...summary(window), from:window[0].day, to:window.at(-1).day
    }));
  }

  function distinctRetrospective(matches) {
    const fixtures = new Map();
    for (const match of matches) {
      if (match.home === match.away || new Date(match.day).toISOString().slice(0,10) !== match.day) continue;
      const key = JSON.stringify([match.season,match.day,match.home,match.away]);
      const previous = fixtures.get(key);
      if (!fixtures.has(key)) fixtures.set(key,match);
      else if (!previous || previous.goals.some((goal,i) => goal !== match.goals[i])) fixtures.set(key,null);
    }
    return [...fixtures.values()].filter(Boolean);
  }

  function build({archive, premier, expanded}, now = Date.now()) {
    const plAvailable = scheduleSnapshot(premier, now);
    const expandedAvailable = scheduleSnapshot(expanded, now);
    const fixtures = evidence.fixtureIndex([plAvailable ? premier : null, expandedAvailable ? expanded : null], now);
    const competitions = new Map();
    const upcoming = new Map();
    function seasonFor(league, season, inferred) {
      if (!competitions.has(league)) competitions.set(league,new Map());
      const seasons = competitions.get(league);
      if (!seasons.has(season)) seasons.set(season,{
        season, inferred, matches:[], teams:new Map(), outcomes:{home:0,draw:0,away:0}, goals:0
      });
      return seasons.get(season);
    }
    function team(bucket, league, name) {
      const key = teamKey(league,name);
      if (!bucket.teams.has(key)) bucket.teams.set(key, {name:key, games:[]});
      return bucket.teams.get(key);
    }

    const retrospective = distinctRetrospective(history.archiveMatches(archive));
    const finals = expandedAvailable ? history.competitionMatches(expanded).filter(match => match.league !== 'PL') : [];
    for (const match of [...retrospective,...finals]) {
      const bucket = seasonFor(match.league, match.season ?? inferredSeason(match.day), !match.season);
      const home = team(bucket,match.league,match.home);
      const away = team(bucket,match.league,match.away);
      if (home === away) continue;
      bucket.matches.push(match);
      const [homeGoals,awayGoals] = match.goals;
      bucket.goals += homeGoals + awayGoals;
      bucket.outcomes[homeGoals === awayGoals ? 'draw' : homeGoals > awayGoals ? 'home' : 'away']++;
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
      const season = inferredSeason(new Date(event.start).toISOString().slice(0,10));
      const bucket = seasonFor(league,season,true);
      const participants = [team(bucket,league,home),team(bucket,league,away)];
      if (event.start <= now) continue;
      for (const entry of new Set(participants)) {
        const key = JSON.stringify([league,entry.name]);
        if (!upcoming.has(key)) upcoming.set(key,[]);
        upcoming.get(key).push(event);
      }
    }

    for (const seasons of competitions.values()) for (const bucket of seasons.values()) {
      for (const entry of bucket.teams.values()) {
        entry.games.sort((a,b) => a.day.localeCompare(b.day));
        entry.overall = summary(entry.games);
        entry.home = summary(entry.games.filter(game => game.venue === 'Home'));
        entry.away = summary(entry.games.filter(game => game.venue === 'Away'));
        entry.trend = resultsTrend(entry.games);
      }
    }
    for (const events of upcoming.values()) events.sort((a,b) => a.start - b.start);

    const schedule = (feed, available, league) => ({
      state: !available ? 'unavailable' : isStale(feed,now) ? 'stale' : 'available',
      observed: available ? evidence.instant(feed.generated_at_utc) : null,
      count: fixtures.events.filter(event => (event.identity[0] === 'PL') === (league === 'PL') && event.start > now).length
    });
    return {competitions, upcoming, retrospectiveCount:retrospective.length, finalsCount:finals.length,
      premier:schedule(premier,plAvailable,'PL'), expanded:schedule(expanded,expandedAvailable,'expanded'),
      conflicts:fixtures.conflicts.size};
  }

  function fixtureHref(event) {
    return '../football-match/?' + new URLSearchParams({competition:event.identity[0], event:event.id});
  }

  return { build, fixtureHref, inferredSeason, resultsTrend, label, staleHours };
});
