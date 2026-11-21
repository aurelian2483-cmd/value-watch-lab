'use strict';

(async () => {
  const sources = ValueWatchProSources;
  const params = new URLSearchParams(location.search);
  const sport = params.get('sport');
  const source = {racing:'racing', tennis:'other', nfl:'other'};
  const $ = id => document.getElementById(id);
  const unavailable = 'This fixture is unavailable. The published event is stale, started, changed, ambiguous or missing.';
  if (!Object.hasOwn(source, sport)) {
    $('status').textContent = unavailable;
    return;
  }
  $('lane').href = '../?' + new URLSearchParams({sport}) + '#events-view';
  if (sport === 'racing') {
    $('research').href = '../racing-research/';
    $('research').hidden = false;
  }
  async function verifyFixture() {
    $('fixture-name').textContent = 'Fixture evidence';
    $('status').textContent = 'Checking published fixture identity…';
    $('evidence').hidden = true;
    const feed = await sources.load(source[sport], '../', window.fetch.bind(window));
    const exact = sources.findDetail(feed, params.get('event'));
    if (!exact || exact.sport !== sport) {
      $('status').textContent = unavailable;
      return;
    }
    const format = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short'
    });
    $('fixture-name').textContent = exact.name;
    $('competition').textContent = exact.detail.competition;
    $('kickoff').textContent = format.format(exact.startMs);
    $('identifier').textContent = exact.detail.id;
    $('snapshot').textContent = format.format(exact.detail.observedAt ?? feed.generatedAt);
    $('status').textContent = (sport === 'racing' ? 'Sporting Life racecard observation' : 'ESPN schedule observation') +
      ' · Exact match in the published snapshot. Independent verification is unavailable here.';
    $('evidence').hidden = false;
  }

  addEventListener('pageshow', event => {
    if (event.persisted) void verifyFixture();
  });
  await verifyFixture();
})();
