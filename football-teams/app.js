'use strict';

(() => {
  const intelligence = FootballTeamIntelligence;
  const $ = id => document.getElementById(id);
  const fmt = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'});
  const add = (parent,tag,value) => {
    const element = document.createElement(tag);
    if (value != null) element.textContent = String(value);
    parent.append(element);
    return element;
  };
  const ppg = record => record.played ? (record.points / record.played).toFixed(2) : '—';
  const recordLabel = record => record.played ? [record.W,record.D,record.L].join('–') : '—';
  let data;
  let teams = [];

  function cards(parent, rows) {
    parent.replaceChildren();
    for (const [label,value] of rows) {
      const cell = add(parent,'div');
      cell.className = 'stat';
      add(cell,'small',label);
      add(cell,'strong',value);
    }
  }

  function choose(name, focus = false) {
    $('team-select').value = name;
    const team = teams.find(entry => entry.name === name);
    const panel = $('team-panel');
    for (const button of document.querySelectorAll('.team-button')) {
      button.setAttribute('aria-pressed',String(button.textContent === name));
    }
    panel.replaceChildren();
    panel.className = team ? '' : 'empty';
    if (!team) {
      panel.textContent = teams.length ? 'Select a team to view its record and schedule.' : 'No teams are available from the loaded snapshots.';
      return;
    }
    add(panel,'h3',team.name);
    const stats = add(panel,'div');
    stats.className = 'stats';
    const overall = team.overall;
    if (overall.played) add(panel,'p','Team sample: ' + overall.played + ' results · ' +
      team.games[0].day + ' to ' + team.games.at(-1).day + '.').className = 'note';
    cards(stats,[['Recorded matches',overall.played],['Wins–draws–losses',recordLabel(overall)],
      ['Goals for / against',overall.played ? overall.goalsFor + ' / ' + overall.goalsAgainst : '—'],['Points per match',ppg(overall)]]);
    add(panel,'p','Home: ' + team.home.played + ' matches, ' + recordLabel(team.home) + ' W–D–L, ' + ppg(team.home) +
      ' points per match. Away: ' + team.away.played + ' matches, ' + recordLabel(team.away) + ' W–D–L, ' + ppg(team.away) + ' points per match.').className = 'note';
    if (team.trend) {
      const [previous,latest] = team.trend;
      const change = latest - previous;
      add(panel,'p','Descriptive results trend: ' + previous.toFixed(2) + ' to ' + latest.toFixed(2) +
        ' points per match (' + (change > 0 ? '+' : '') + change.toFixed(2) +
        '), preceding five vs latest five recorded matches. Team-strength rating unavailable.').className = 'note';
    } else add(panel,'p','Results trend: insufficient data for two chronologically distinct five-match samples.').className = 'note';
    add(panel,'h3','Most recent recorded results');
    if (!overall.played) add(panel,'p','No qualifying historical results for this team in the available sample.');
    for (const game of team.games.slice(-5).reverse()) {
      const row = add(panel,'div');
      row.className = 'fixture';
      add(row,'span',game.day + ' · ' + game.venue + ' vs ' + game.opponent);
      add(row,'strong',game.goalsFor + '–' + game.goalsAgainst + ' · ' + game.outcome);
    }
    add(panel,'h3','Upcoming fixtures');
    const schedule = $('competition').value === 'PL' ? data.premier : data.expanded;
    if (schedule.state === 'stale') add(panel,'p','Stale schedule snapshot. Check the sourced kickoff before relying on it.');
    if (!team.upcoming.length) add(panel,'p',schedule.state === 'unavailable' ?
      'Schedule snapshot unavailable.' : 'No upcoming fixture for this team in the loaded snapshot.');
    for (const event of team.upcoming) {
      const row = add(panel,'div');
      row.className = 'fixture';
      const match = event.identity.slice(1).join(' v ');
      add(row,'span',fmt.format(event.start) + ' UK · ' + match);
      const link = add(row,'a','Open ' + match + ' in Match Centre');
      link.href = intelligence.fixtureHref(event);
    }
    if (focus) $('team-dashboard').focus();
  }

  function render() {
    const code = $('competition').value;
    const competition = data.competitions.get(code);
    const matches = competition?.matches ?? [];
    teams = [...(competition?.teams.values() ?? [])].sort((a,b) => b.overall.points - a.overall.points ||
      (b.overall.goalsFor - b.overall.goalsAgainst) - (a.overall.goalsFor - a.overall.goalsAgainst) || a.name.localeCompare(b.name));
    const historyTeams = teams.filter(team => team.overall.played).length;
    const days = matches.map(match => match.day).sort();
    const historySource = code === 'PL' ? 'Retrospective Premier League reconstruction' : 'Two-source regulation-time finals';
    $('coverage').textContent = historySource + ' · ' + matches.length + ' recorded matches · ' + historyTeams + ' teams with results · ' +
      (days.length ? days[0] + ' to ' + days.at(-1) : 'no qualifying history') + '. Coverage may omit matches and teams.';
    cards($('competition-stats'),[['Recorded matches',matches.length],['Teams with results',historyTeams],
      ['Recorded goals',matches.length ? matches.reduce((total,match) => total + match.goals[0] + match.goals[1],0) : '—'],
      ['Teams including schedule',teams.length]]);
    const selector = $('team-select');
    const previous = selector.value;
    selector.replaceChildren(new Option('Choose a team',''));
    $('table').replaceChildren();
    $('teams').replaceChildren();
    for (const team of teams) {
      selector.add(new Option(team.name,team.name));
      const row = add($('table'),'tr');
      const header = add(row,'th');
      header.scope = 'row';
      add(header,'button',team.name).onclick = () => choose(team.name,true);
      const r = team.overall;
      const last = team.games.at(-1);
      for (const value of [r.played,recordLabel(r),r.played ? r.goalsFor : '—',r.played ? r.goalsAgainst : '—',
        r.played ? r.goalsFor-r.goalsAgainst : '—',r.played ? r.points : '—',
        team.home.played ? team.home.points + ' (' + team.home.played + ')' : '—',
        team.away.played ? team.away.points + ' (' + team.away.played + ')' : '—',last ? last.outcome + ' · ' + last.day : '—']) add(row,'td',value);
      const button = add($('teams'),'button',team.name);
      button.className = 'team-button';
      button.onclick = () => choose(team.name,true);
    }
    $('team-count').textContent = teams.length + ' teams · ' + matches.length + ' recorded matches';
    choose(teams.some(team => team.name === previous) ? previous : '');
  }

  async function read(path) {
    const response = await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Snapshot unavailable');
    return response.json();
  }

  function scheduleNote(name,schedule) {
    if (schedule.state === 'unavailable') return name + ' unavailable or failed research checks';
    return name + ': ' + schedule.count + ' upcoming fixtures · observed ' + fmt.format(schedule.observed) +
      ' UK' + (schedule.state === 'stale' ? ' · stale (at least ' + intelligence.staleHours + ' hours old)' : '');
  }

  async function load() {
    const [archive,premier,expanded] = await Promise.allSettled([
      read('../research/football-baseline-v1/608-reconstructed-forecasts.json'),
      read('../research-dashboard-data.json'), read('../football-expanded-data.json')
    ]);
    data = intelligence.build({archive:archive.value,premier:premier.value,expanded:expanded.value});
    const leagues = [...data.competitions.keys()].sort((a,b) => intelligence.label(a).localeCompare(intelligence.label(b)));
    $('competition').replaceChildren(...leagues.map(code => new Option(intelligence.label(code),code)));
    if (!leagues.length) $('competition').add(new Option('No competition data available',''));
    if (leagues.includes('PL')) $('competition').value = 'PL';
    $('updated').textContent = [
      scheduleNote('Premier League schedule',data.premier), scheduleNote('Expanded schedule',data.expanded),
      data.retrospectiveCount ? data.retrospectiveCount + ' retrospective Premier League results' : 'Premier League archive unavailable or has no qualifying results',
      data.finalsCount + ' two-source expanded finals', data.conflicts ? data.conflicts + ' conflicting fixture identities withheld' : null
    ].filter(Boolean).join(' · ');
    render();
  }

  $('competition').addEventListener('change',() => { $('team-select').value = ''; render(); });
  $('team-select').addEventListener('change',() => choose($('team-select').value));
  load().catch(() => { $('updated').textContent = 'Football evidence is unavailable. Publication remains BLOCKED.'; });
})();
