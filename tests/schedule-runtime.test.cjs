const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const canonical = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/upcoming-shows-2026-08-27.json')));
const fallback = JSON.parse(fs.readFileSync(path.join(root, 'data/jazzycat-current-schedule.json')));
const source = fs.readFileSync(path.join(root, 'assets/jazzycat-schedule-runtime.js'), 'utf8');
function runtime(fetch = async () => {throw Error('offline');}) {
  const context = {Intl, Date, URL, fetch, document: {getElementById: () => ({src:'https://example.com/jazzycat.html'})}};
  // Expose closure functions only in the test VM; production has no test hooks.
  const marker = "  frame.addEventListener('load', install);";
  assert.ok(source.includes(marker));
  vm.runInNewContext(source.slice(0, source.indexOf(marker)) + `
    globalThis.api = {parseAuthority, loadSchedule, scheduleAnswer, scheduleIntent,
      set: value => {scheduleState = value;}};
  })();`, context);
  return context.api;
}
const now = new Date('2026-09-06T23:30:00Z'); // Sunday 6:30 PM Chicago
for (const mode of ['canonical', 'fallback']) {
  const api = runtime();
  api.set(mode === 'canonical' ? api.parseAuthority(canonical) : fallback);
  test(`${mode}: today, tomorrow, weekday, named and numeric dates`, () => {
    assert.match(api.scheduleAnswer('lineup tonight', now), /JAM BRASS BAND/);
    assert.match(api.scheduleAnswer('tomorrow', now), /September 7.*yet/);
    assert.match(api.scheduleAnswer('Thursday', now), /September 10/);
    for (const q of ['shows September 18', 'shows 2026-09-18', 'shows 9/18/2026'])
      assert.match(api.scheduleAnswer(q, now), /WOODY&#39;S RAMPAGE/);
    assert.equal(api.scheduleIntent('9/18/2026'), true);
    assert.equal(api.scheduleIntent('2026-09-18'), true);
  });
  test(`${mode}: weekend, weeks, month and month handoff`, () => {
    assert.match(api.scheduleAnswer('this weekend', now), /September 6/);
    assert.doesNotMatch(api.scheduleAnswer('this week', now), /September 3/);
    assert.match(api.scheduleAnswer('next week', now), /GABE STILLMAN/);
    assert.doesNotMatch(api.scheduleAnswer('this month', now), /August|September 3</);
    assert.match(api.scheduleAnswer('next week', new Date('2026-08-30T17:00:00Z')), /September 3/);
    assert.match(api.scheduleAnswer('this month', new Date('2026-10-01T17:00:00Z')), /no.*dates|don't have more dates/);
  });
  test(`${mode}: current, next, wrapped and Chicago date`, () => {
    assert.match(api.scheduleAnswer('who is playing now', now), /Right now:.*JAM BRASS BAND/);
    assert.match(api.scheduleAnswer('who is playing now', new Date('2026-09-06T22:45:00Z')), /Next up:.*JAM BRASS BAND/);
    assert.match(api.scheduleAnswer('who is playing now', new Date('2026-09-07T04:45:00Z')), /wrapped/);
    assert.match(api.scheduleAnswer('lineup today', new Date('2026-09-07T02:00:00Z')), /September 6/);
  });
  test(`${mode}: artist variants find upcoming September dates`, () => {
    assert.match(api.scheduleAnswer('When is Shorty playing?', now), /September 6/);
    assert.match(api.scheduleAnswer('When is Big Mike playing?', now), /September 11/);
    assert.match(api.scheduleAnswer("When is Woody's Rampage playing?", now), /September 18/);
    assert.equal(api.scheduleIntent('Where is the bathroom?'), false);
  });
}
test('live and fallback parse to identical date/time/artist rows', () => {
  const parsed = runtime().parseAuthority(canonical);
  const rows = d => JSON.stringify(d.schedule.map(day => [day.date, day.acts.map(a => [a.start_time,a.end_time,a.artist_name])]));
  assert.equal(rows(parsed), rows(fallback));
});
test('authority first; network failure uses local fallback; total outage is explicit', async () => {
  const calls = [];
  let api = runtime(async url => {calls.push(url);return {ok:true,json:async()=>canonical};});
  assert.equal((await api.loadSchedule()).source, 'UpcomingShows');
  assert.equal(calls.length, 1);
  api = runtime(async url => {if(url.includes('raw.githubusercontent'))throw Error('offline');return {ok:true,json:async()=>fallback};});
  assert.equal((await api.loadSchedule()).source, 'local fallback');
  assert.match(api.scheduleAnswer('tonight', now), /JAM BRASS BAND/);
  api = runtime();
  await api.loadSchedule();
  assert.match(api.scheduleAnswer('tonight', now), /can't reach the current schedule/);
});
