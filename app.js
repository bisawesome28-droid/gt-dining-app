import { LOCATIONS, DAY_NAMES, DAY_LETTERS } from './data.js';
import { fmtTime, fmtRange, fmtDuration, statusFor, rank, spanMinutes, periodsFor, dateKey } from './hours.js';
import { ROUTES, STINGERETTE, DISCONTINUED_NOTE, STOP_LEVEL_CAVEAT, SCHEDULE_CHECKED, SOURCE_URL, LIVE_TRACKER_URL } from './shuttle.js';
import { LIBRARIES, libraryStatusFor, LIBRARIES_CHECKED, LIBRARIES_HUB_URL } from './libraries.js';

const root = document.getElementById('app');
let searchDebounce = null;
let lastViewKey = null;

// Change this once — it drives the wordmark on all three tabs. Also update
// index.html's <title>/apple-mobile-web-app-title and manifest.webmanifest's
// name/short_name to match.
const APP_NAME = 'GT Now';

function nowParts() {
  const n = new Date();
  return { now: n.getHours() * 60 + n.getMinutes(), today: n.getDay(), date: n.getDate() };
}

// The day-strip always shows the current real calendar week, so a weekday index
// (0=Sun..6=Sat) maps to one specific date — needed to resolve dated overrides.
function dateKeyForDayIndex(i) {
  const now = new Date();
  return dateKey(new Date(now.getFullYear(), now.getMonth(), state.date - state.today + i));
}

const state = {
  ...nowParts(),
  day: null, // selected weekday index; null = today
  tab: 'today', // 'today' | 'week' | 'shuttle'
  detailId: null,
  query: '',
  openRows: new Set(),
  filterGroup: 'all', // 'all' | 'hall' | 'cafe' | 'rec' | 'library' — resets to 'all' on every fresh load, not persisted
  justToggledId: null // set right before a row-expand toggle, consumed by the next render
};

function selectedDay() {
  return state.day === null ? state.today : state.day;
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

// ---------- Icons ----------

const icon = {
  search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(5,30,57,.45)" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>`,
  today: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v4.8l3.4 2"></path></svg>`,
  week: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M3.5 10h17M8.5 3.2v3.4M15.5 3.2v3.4"></path></svg>`,
  shuttle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5.5" width="17" height="11" rx="3"></rect><path d="M3.5 11h17M7 16.5v2M17 16.5v2"></path><circle cx="7.5" cy="16.2" r=".4" fill="currentColor"></circle><circle cx="16.5" cy="16.2" r=".4" fill="currentColor"></circle></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5h5v5M18.5 5.5 10 14"></path><path d="M18 13v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"></path></svg>`,
  back: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>`
};

// ---------- Pill styling per status kind ----------

function pillFor(st) {
  if (st.kind === 'open') return { text: 'Open', bg: 'var(--green-wash)', ink: 'var(--green-ink)', dot: 'var(--green)' };
  if (st.kind === 'soon') return { text: 'Closing', bg: 'var(--amber-wash)', ink: 'var(--amber-ink)', dot: 'var(--amber)' };
  if (st.kind === 'later') return { text: `Opens ${fmtTime(st.next.s)}`, bg: 'var(--neutral-wash)', ink: 'rgba(5,30,57,.72)', dot: 'rgba(5,30,57,.62)' };
  if (st.kind === 'sched') return { text: st.label, bg: 'var(--neutral-wash)', ink: 'rgba(5,30,57,.72)', dot: 'rgba(5,30,57,.62)' };
  if (st.kind === 'unknown') return { text: 'Check hours', bg: 'var(--amber-wash)', ink: 'var(--amber-ink)', dot: 'var(--amber)' };
  return { text: 'Closed', bg: 'rgba(5,30,57,.06)', ink: 'rgba(5,30,57,.4)', dot: 'rgba(5,30,57,.18)' };
}

// Libraries follow a dated calendar, not a recurring weekly pattern, and some
// checked days are genuinely incomplete (an open event with no posted close).
// This maps that into the same {kind, label, sub} shape dining's statusFor
// produces, so library rows can sort/render through the same list — but only
// ever as 'open' | 'closed' | 'unknown' | 'sched', never fabricating a 'soon'
// or 'later' countdown the source data doesn't support.
function libraryRowStatus(lib, dateStr, isToday) {
  if (isToday) {
    const r = libraryStatusFor(lib, dateStr, state.now);
    if (r.kind === 'open') {
      const sub = r.closesAt != null
        ? `Open until ${fmtTime(r.closesAt)}`
        : r.spillsToNextDay
          ? `Open until ${fmtTime(r.nextDayCloseAt)} (next day)`
          : 'Open — closing time not posted';
      return { kind: 'open', label: 'Open', sub, cur: null };
    }
    if (r.kind === 'unknown') return { kind: 'unknown', label: 'Check hours', sub: 'Hours not fully posted for today — check the library’s official calendar', cur: null };
    return { kind: 'closed', label: 'Closed', sub: 'Closed right now', cur: null };
  }
  const windows = lib.windows[dateStr];
  if (!windows) return { kind: 'unknown', label: 'Check hours', sub: 'Hours not posted for this date — check the library’s official calendar', cur: null };
  const [s, e] = windows[0];
  let label;
  if (e === null) {
    label = `Opens ${fmtTime(s)}, no close posted`;
  } else if (e - s >= 1440) {
    label = 'Open 24 hours';
  } else if (e > 1440) {
    label = `${fmtTime(s)}–${fmtTime(e - 1440)} (next day)`;
  } else {
    label = `${fmtTime(s)}–${fmtTime(e)}`;
    if (lib.gapStatus === 'unknown') label += ', then unconfirmed';
  }
  return { kind: 'sched', label, sub: 'Posted hours for that day', cur: null };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Row (list item) ----------

function buildRows(list, day, dateStr) {
  return list.map(({ loc, st }) => {
    const p = pillFor(st);
    const isOpen = st.kind === 'open' || st.kind === 'soon';
    const live = st.cur ? (state.now - st.cur.s) / (st.cur.e - st.cur.s) : 0;
    const sub = loc.group === 'library' && loc.accessNote
      ? st.sub
      : isOpen
        ? capitalize(st.sub)
        : st.kind === 'later'
          ? `${st.sub} starts ${fmtTime(st.next.s)}`
          : st.kind === 'sched'
            ? st.sub
            : 'No service today';
    const periods = (loc.group === 'library' && loc.accessNote) ? [] : periodsFor(loc, day, dateStr).map((pd) => {
      const cur = day === state.today && state.now >= pd.s && state.now < pd.e;
      return { l: pd.l, range: fmtRange(pd), cur };
    });
    return { loc, st, p, isOpen, live, sub, periods };
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderRow(r) {
  const barFill = r.st.kind === 'soon' ? '#8f713d' : '#23934d';
  const barW = Math.max(3, Math.min(100, r.live * 100)).toFixed(1) + '%';
  return `
    <button class="row-card${r.isOpen ? ' is-open' : ''}" data-action="open-row" data-id="${r.loc.id}">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:${r.st.kind === 'closed' ? 'rgba(5,30,57,.66)' : '#051e39'}">${esc(r.loc.name)}</div>
          <div class="row-place">${esc(r.loc.place)}</div>
        </div>
        <span class="pill" style="background:${r.p.bg};color:${r.p.ink}">
          <span class="pill-dot" style="background:${r.p.dot}"></span>
          <span class="pill-text">${esc(r.p.text)}</span>
        </span>
      </div>
      <div class="row-sub" style="color:${r.isOpen ? 'rgba(5,30,57,.78)' : 'rgba(5,30,57,.62)'}">${esc(r.sub)}</div>
      ${r.st.cur ? `<div class="row-bar-track"><div class="row-bar-fill" style="width:${barW};background:${barFill}"></div></div>` : ''}
      <div class="row-periods-wrap" data-periods-for="${r.loc.id}">${renderRowPeriods(r)}</div>
    </button>
  `;
}

function renderRowPeriods(r) {
  if (r.loc.group === 'library' && r.loc.accessNote) {
    return `
      <div class="row-periods">
        <div class="row-empty-note">${esc(r.loc.accessNote)}</div>
        <span class="row-view-week" data-action="open-detail" data-id="${r.loc.id}">View details &rsaquo;</span>
      </div>
    `;
  }
  if (!r.periods.length) {
    return `<div class="row-periods"><div class="row-empty-note">Nothing posted for ${DAY_NAMES[selectedDay()]}.</div></div>`;
  }
  return `
    <div class="row-periods">
      ${r.periods.map((p) => `
        <div class="row-period" style="background:${p.cur ? 'rgba(179,144,81,.22)' : 'transparent'}">
          <span class="row-period-label" style="color:${p.cur ? '#051e39' : 'rgba(5,30,57,.55)'}">${esc(p.l)}</span>
          <span class="row-period-range" style="color:${p.cur ? '#051e39' : 'rgba(5,30,57,.55)'}">${esc(p.range)}</span>
        </div>
      `).join('')}
      <span class="row-view-week" data-action="open-detail" data-id="${r.loc.id}">View full week &rsaquo;</span>
    </div>
  `;
}

// ---------- Today tab ----------

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'hall', label: 'Dining halls' },
  { key: 'cafe', label: 'Cafés' },
  { key: 'rec', label: 'Campus Services' },
  { key: 'library', label: 'Libraries' }
];

const SEARCH_PLACEHOLDER = {
  all: 'Search Campus',
  hall: 'Search Dining',
  cafe: 'Search Cafés',
  rec: 'Search Campus Services',
  library: 'Search Libraries'
};

function computeList(day, dateStr) {
  const q = state.query.trim().toLowerCase();
  const isToday = day === state.today;
  const dining = LOCATIONS.map((loc) => ({ loc, st: statusFor(periodsFor(loc, day, dateStr), isToday, state.now) }));
  const libs = LIBRARIES.map((loc) => ({ loc, st: libraryRowStatus(loc, dateStr, isToday) }));
  let list = dining.concat(libs);
  if (state.filterGroup !== 'all') list = list.filter((x) => x.loc.group === state.filterGroup);
  if (q) list = list.filter((x) => `${x.loc.name} ${x.loc.place}`.toLowerCase().includes(q));
  list = list.slice().sort((a, b) => rank(a.st) - rank(b.st));
  return list;
}

function renderToday() {
  const day = selectedDay();
  const dateStr = dateKeyForDayIndex(day);
  const list = computeList(day, dateStr);
  const openArr = list.filter((x) => x.st.kind === 'open');
  const soonArr = list.filter((x) => x.st.kind === 'soon');
  // .cur is only ever set by dining's statusFor (a real countdown to a known
  // close time) — libraries can be 'open' with no .cur, so this must be
  // filtered down before sorting on .cur.e, not just filtered by kind.
  const closeNext = openArr.concat(soonArr).filter((x) => x.st.cur).sort((a, b) => a.st.cur.e - b.st.cur.e)[0];
  const isToday = day === state.today;

  const openNowCount = openArr.length + soonArr.length;
  const headline = isToday ? `${openNowCount} open now` : DAY_NAMES[day];
  const subline = isToday
    ? (closeNext ? `${closeNext.loc.name} closes in ${fmtDuration(closeNext.st.cur.e - state.now)}`
      : openNowCount ? 'Open now — closing times vary' : 'Nothing serving right now')
    : `${list.filter((x) => x.st.kind !== 'closed').length} locations serving`;

  const rec = list.filter((x) => x.loc.group === 'rec');
  const halls = list.filter((x) => x.loc.group === 'hall');
  const cafes = list.filter((x) => x.loc.group === 'cafe');
  const libs = list.filter((x) => x.loc.group === 'library');
  const rowsRec = buildRows(rec, day, dateStr);
  const rowsHalls = buildRows(halls, day, dateStr);
  const rowsCafes = buildRows(cafes, day, dateStr);
  const rowsLibs = buildRows(libs, day, dateStr);

  const noResults = state.query.trim() && list.length === 0;

  return `
    <div class="banner">
      <div class="header">
        <div class="header-row">
          <div>
            <div class="wordmark">${APP_NAME}</div>
            <div class="headline">${esc(headline)}</div>
            <div class="subline">${esc(subline)}</div>
          </div>
        </div>
      </div>
      ${renderDayStrip()}
    </div>
    <div class="search-wrap">
      <div class="search-box">
        ${icon.search}
        <input type="text" placeholder="${esc(SEARCH_PLACEHOLDER[state.filterGroup] || 'Search')}" value="${esc(state.query)}" data-action="search" />
      </div>
    </div>
    <div class="filter-strip">
      ${FILTER_TABS.map((t) => `
        <button class="filter-chip${state.filterGroup === t.key ? ' is-selected' : ''}" data-action="pick-filter" data-group="${t.key}">${esc(t.label)}</button>
      `).join('')}
    </div>
    <div class="body-scroll">
      ${noResults ? `<div class="empty-state">No locations match "${esc(state.query.trim())}".</div>` : `
        ${renderGroup('Dining halls', `${halls.filter((x) => x.st.kind !== 'closed').length} serving`, rowsHalls)}
        ${renderGroup('Cafés & markets', `${cafes.filter((x) => x.st.kind !== 'closed').length} serving`, rowsCafes)}
        ${renderGroup('Campus Services', `${rec.filter((x) => x.st.kind !== 'closed').length} open`, rowsRec)}
        ${renderGroup('Libraries', `${libs.filter((x) => x.st.kind === 'open').length} open`, rowsLibs)}
      `}
      <div class="footnote">Posted hours, checked Sep 23, 2026 from official Georgia Tech pages. Subject to change — this is a snapshot, not a live feed.</div>
    </div>
  `;
}

function renderGroup(title, count, rows) {
  if (!rows.length) return '';
  return `
    <div class="group-head">
      <span class="group-title">${esc(title)}</span>
      <span class="group-count">${esc(count)}</span>
    </div>
    <div class="group-list">${rows.map(renderRow).join('')}</div>
  `;
}

function renderDayStrip() {
  const day = selectedDay();
  const sunDate = state.date - state.today;
  return `
    <div class="day-strip">
      ${DAY_LETTERS.map((dow, i) => {
        const selected = i === day;
        const isToday = i === state.today;
        const cls = selected ? 'is-selected' : isToday ? 'is-today' : '';
        return `
          <button class="day-btn ${cls}" data-action="pick-day" data-day="${i}">
            <span class="day-dow">${dow}</span>
            <span class="day-num">${sunDate + i}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

// ---------- Week tab ----------

function renderWeek() {
  const day = selectedDay();
  return `
    <div class="header">
      <div class="header-row">
        <div>
          <div class="wordmark">${APP_NAME}</div>
          <div class="headline">Posted week</div>
          <div class="subline">Hours of service by location and day</div>
        </div>
      </div>
    </div>
    <div class="body-scroll">
      <div class="week-grid">
        <div class="week-head-row">
          <div></div>
          ${DAY_LETTERS.map((dow) => `<div class="week-head-cell">${dow}</div>`).join('')}
        </div>
        ${LOCATIONS.map((loc) => `
          <button class="week-row" data-action="open-detail" data-id="${loc.id}">
            <span class="week-name">${esc(loc.name)}</span>
            ${loc.days.map((ps, i) => {
              ps = periodsFor(loc, i, dateKeyForDayIndex(i));
              const h = spanMinutes(ps) / 60;
              let bg = 'rgba(5,30,57,.05)', ink = 'rgba(5,30,57,.45)', label = '·';
              if (h >= 8) { bg = 'rgba(35,147,77,.85)'; ink = '#08130b'; label = Math.round(h); }
              else if (h >= 4) { bg = 'rgba(35,147,77,.42)'; ink = '#eafff0'; label = Math.round(h); }
              else if (h > 0) { bg = 'rgba(35,147,77,.18)'; ink = 'rgba(234,255,240,.9)'; label = Math.round(h); }
              return `<span class="week-cell" style="background:${bg};color:${ink}">${label}</span>`;
            }).join('')}
          </button>
        `).join('')}
      </div>
      <div class="footnote">Number is hours of posted service. Tap a row to open it.</div>
    </div>
  `;
}

// ---------- Shuttle tab ----------

function shuttleRouteStatus(route) {
  const day = selectedDay();
  const isToday = day === state.today;
  return statusFor(periodsFor(route, day, dateKeyForDayIndex(day)), isToday, state.now);
}

// The Stingerette's 8pm-3:15am window spills past midnight into the next
// calendar day, which hours.js's statusFor doesn't model (it only handles
// periods ending at or before midnight) — libraries.js needed its own status
// logic for the same reason. Runs identically every day, so this only needs
// to reason about "today vs. spilled over from last night," not a weekly
// pattern.
function stingeretteStatus(day) {
  const p = STINGERETTE.days[0][0];
  const spilloverEnd = p.e - 1440;
  if (day !== state.today) {
    return { kind: 'sched', label: `${fmtTime(p.s)}–${fmtTime(spilloverEnd)}`, sub: 'Posted hours for that day', cur: null };
  }
  const now = state.now;
  const activeTonight = now >= p.s;
  const activeFromLastNight = now < spilloverEnd;
  if (activeTonight || activeFromLastNight) {
    const left = activeFromLastNight ? (spilloverEnd - now) : ((1440 - now) + spilloverEnd);
    return {
      kind: left <= 60 ? 'soon' : 'open',
      label: left <= 60 ? `Closes in ${fmtDuration(left)}` : 'Open',
      sub: `Available until ${fmtTime(spilloverEnd)}`,
      cur: null
    };
  }
  return { kind: 'later', label: `Opens ${fmtTime(p.s)}`, sub: 'Available', next: { s: p.s }, cur: null };
}

function renderShuttleRouteCard(route) {
  const st = shuttleRouteStatus(route);
  const p = pillFor(st);
  const isOpen = st.kind === 'open' || st.kind === 'soon';
  const sub = isOpen ? capitalize(st.sub)
    : st.kind === 'later' ? `${st.sub} starts ${fmtTime(st.next.s)}`
      : st.kind === 'sched' ? 'Posted hours for this day'
        : 'Not running today';
  return `
    <div class="row-card${isOpen ? ' is-open' : ''}" style="cursor:default">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:${st.kind === 'closed' ? 'rgba(5,30,57,.66)' : '#051e39'}">${esc(route.name)}</div>
        </div>
        <span class="pill" style="background:${p.bg};color:${p.ink}">
          <span class="pill-dot" style="background:${p.dot}"></span>
          <span class="pill-text">${esc(p.text)}</span>
        </span>
      </div>
      <div class="row-sub" style="color:${isOpen ? 'rgba(5,30,57,.78)' : 'rgba(5,30,57,.62)'}">${esc(sub)}</div>
      ${route.note ? `<div class="row-empty-note" style="padding-top:6px">${esc(route.note)}</div>` : ''}
    </div>
  `;
}

function renderShuttle() {
  const day = selectedDay();
  const isToday = day === state.today;
  const statuses = ROUTES.map((r) => shuttleRouteStatus(r));
  const runningCount = statuses.filter((s) => s.kind === 'open' || s.kind === 'soon').length;
  const scheduledCount = statuses.filter((s) => s.kind !== 'closed').length;
  const stingeretteSt = stingeretteStatus(day);

  const headline = isToday ? `${runningCount} of ${ROUTES.length} routes running` : DAY_NAMES[day];
  const subline = isToday ? 'Stinger campus shuttle' : `${scheduledCount} of ${ROUTES.length} routes scheduled`;
  const groupCount = isToday ? `${runningCount} running` : `${scheduledCount} scheduled`;

  return `
    <div class="banner">
      <div class="header">
        <div class="header-row">
          <div>
            <div class="wordmark">${APP_NAME}</div>
            <div class="headline">${esc(headline)}</div>
            <div class="subline">${esc(subline)}</div>
          </div>
        </div>
      </div>
      ${renderDayStrip()}
    </div>
    <div class="body-scroll">
      <a class="tracker-link" href="${LIVE_TRACKER_URL}" target="_blank" rel="noopener">
        Open live tracker (TransLoc) — real bus positions &amp; stops ${icon.external}
      </a>
      <div style="height:14px"></div>
      <div class="group-head"><span class="group-title">Stinger routes</span><span class="group-count">${esc(groupCount)}</span></div>
      <div class="group-list">${ROUTES.map(renderShuttleRouteCard).join('')}</div>

      <div class="group-head" style="margin-top:6px"><span class="group-title">Stingerette</span></div>
      <div class="group-list">
        <div class="row-card${stingeretteSt.kind === 'open' ? ' is-open' : ''}" style="cursor:default">
          <div class="row-top">
            <div class="row-name-wrap">
              <div class="row-name" style="color:#051e39">${esc(STINGERETTE.name)}</div>
              <div class="row-place">On-demand · book ahead, not a fixed loop</div>
            </div>
            <span class="pill" style="background:${pillFor(stingeretteSt).bg};color:${pillFor(stingeretteSt).ink}">
              <span class="pill-dot" style="background:${pillFor(stingeretteSt).dot}"></span>
              <span class="pill-text">${esc(pillFor(stingeretteSt).text)}</span>
            </span>
          </div>
          <div class="row-empty-note" style="padding-top:6px">${esc(STINGERETTE.note)}</div>
          <a class="row-view-week" href="${STINGERETTE.bookingUrl}" target="_blank" rel="noopener">Book a ride &rsaquo;</a>
        </div>
      </div>

      <div class="note-card" style="margin-top:14px">
        <div class="note-key">Route changes</div>
        <div class="note-val">${esc(DISCONTINUED_NOTE)}</div>
      </div>
      <div class="note-card" style="margin-top:9px">
        <div class="note-key">What's not shown here</div>
        <div class="note-val">${esc(STOP_LEVEL_CAVEAT)}</div>
      </div>
      <div class="footnote">Schedule checked ${esc(SCHEDULE_CHECKED)} from <a href="${SOURCE_URL}" target="_blank" rel="noopener" style="color:inherit">GT Parking & Transportation</a>. Not a live feed — use the tracker link above for real-time bus positions.</div>
    </div>
  `;
}

// ---------- Detail screen ----------

const GROUP_LABELS = { hall: 'Dining hall', cafe: 'Café & market', rec: 'Campus Services', library: 'Library' };

// Builds the period-list + posted-week data for one schedule (the location's
// primary schedule, or its `secondary` one, e.g. a climbing wall) on a given day.
function buildScheduleSection(schedule, day, dateStr) {
  const isToday = day === state.today;
  const ps = periodsFor(schedule, day, dateStr);

  const periods = ps.map((pd) => {
    const cur = isToday && state.now >= pd.s && state.now < pd.e;
    const done = isToday && state.now >= pd.e;
    return {
      l: pd.l,
      range: fmtRange(pd),
      state: cur ? 'Open now' : done ? 'Finished' : isToday ? 'Later today' : 'Scheduled',
      bg: cur ? 'rgba(35,147,77,.14)' : 'var(--card)',
      border: cur ? 'rgba(35,147,77,.35)' : 'var(--border)',
      ink: done ? 'rgba(5,30,57,.45)' : '#051e39',
      subColor: cur ? '#176b38' : 'rgba(5,30,57,.62)',
      dot: cur ? '#23934d' : done ? 'rgba(5,30,57,.28)' : '#8f713d'
    };
  });

  const spanLine = ps.length ? `Posted ${fmtTime(ps[0].s)} – ${fmtTime(ps[ps.length - 1].e)}` : 'Closed all day';

  const week = schedule.days.map((_, i) => {
    const wps = periodsFor(schedule, i, dateKeyForDayIndex(i));
    return {
      day: DAY_NAMES[i].slice(0, 3),
      range: wps.length ? `${fmtTime(wps[0].s)} – ${fmtTime(wps[wps.length - 1].e)}` : 'Closed',
      meta: wps.length ? `${wps.length} ${wps.length > 1 ? 'periods' : 'period'}` : '—',
      isSel: i === day,
      ink: wps.length ? '#051e39' : 'rgba(5,30,57,.45)'
    };
  });

  return { periods, spanLine, week };
}

function renderScheduleBlock(title, section, day) {
  const isToday = day === state.today;
  return `
    ${title ? `<div class="detail-section-title" style="padding:0 4px 10px">${esc(title)}</div>` : ''}
    <div class="detail-section-head">
      <span class="detail-section-title">${isToday ? 'Today · ' : ''}${DAY_NAMES[day]}</span>
      <span class="detail-section-meta">${esc(section.spanLine)}</span>
    </div>
    <div class="period-list">
      ${section.periods.length ? section.periods.map((pd) => `
        <div class="period-card" style="background:${pd.bg};border-color:${pd.border}">
          <div class="period-left">
            <span class="period-dot" style="background:${pd.dot}"></span>
            <div>
              <div class="period-name" style="color:${pd.ink}">${esc(pd.l)}</div>
              <div class="period-state" style="color:${pd.subColor}">${esc(pd.state)}</div>
            </div>
          </div>
          <span class="period-range" style="color:${pd.ink}">${esc(pd.range)}</span>
        </div>
      `).join('') : `<div class="empty-state" style="padding:24px 0">Nothing posted for ${DAY_NAMES[day]}.</div>`}
    </div>
    <div class="posted-week-title">Posted week</div>
    <div class="posted-week">
      ${section.week.map((w) => `
        <div class="posted-week-row" style="background:${w.isSel ? 'rgba(179,144,81,.18)' : 'transparent'};border-left-color:${w.isSel ? '#b39051' : 'transparent'}">
          <span class="posted-week-day" style="color:${w.ink}">${w.day}</span>
          <span class="posted-week-meta">${esc(w.meta)}</span>
          <span class="posted-week-range" style="color:${w.ink}">${esc(w.range)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- Nested children (CRC "Inside the Rec Center" / Post Office "Amazon Lockers") ----------
//
// Some locations (CRC, Post Office) have child items that are independent
// schedules navigable from within the parent's own detail page, rather than
// separate main-list cards. They render as an accordion using the exact same
// row-card markup/expand mechanism as the main list (data-action="open-row",
// data-periods-for, state.openRows, justToggledId) — child ids are globally
// unique strings, so no extra plumbing is needed to reuse that machinery.

function renderLockerRow(child) {
  return `
    <div class="row-card is-open" style="cursor:default">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:#051e39">${esc(child.name)}</div>
        </div>
        <span class="pill" style="background:var(--green-wash);color:var(--green-ink)">
          <span class="pill-dot" style="background:var(--green)"></span>
          <span class="pill-text">Open 24/7</span>
        </span>
      </div>
      <div class="row-sub" style="color:rgba(5,30,57,.78)">Available every day, all day</div>
    </div>
  `;
}

function periodsRowsHtml(periods, isToday) {
  return periods.map((pd) => {
    const cur = isToday && state.now >= pd.s && state.now < pd.e;
    return `
      <div class="row-period" style="background:${cur ? 'rgba(179,144,81,.22)' : 'transparent'}">
        <span class="row-period-label" style="color:${cur ? '#051e39' : 'rgba(5,30,57,.55)'}">${esc(pd.l)}</span>
        <span class="row-period-range" style="color:${cur ? '#051e39' : 'rgba(5,30,57,.55)'}">${esc(fmtRange(pd))}</span>
      </div>
    `;
  }).join('');
}

function renderWeeklyChildRow(child, day, dateStr, gated) {
  const isToday = day === state.today;
  const periods = gated ? [] : periodsFor(child, day, dateStr);
  const st = gated ? { kind: 'closed', label: 'Closed', sub: 'CRC building is closed' } : statusFor(periods, isToday, state.now);
  const p = pillFor(st);
  const isOpen = st.kind === 'open' || st.kind === 'soon';
  const sub = gated ? st.sub
    : isOpen ? capitalize(st.sub)
      : st.kind === 'later' ? `${st.sub} starts ${fmtTime(st.next.s)}`
        : st.kind === 'sched' ? st.sub
          : 'No service today';
  return `
    <button class="row-card${isOpen ? ' is-open' : ''}" data-action="open-row" data-id="${child.id}">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:${st.kind === 'closed' ? 'rgba(5,30,57,.66)' : '#051e39'}">${esc(child.name)}</div>
        </div>
        <span class="pill" style="background:${p.bg};color:${p.ink}">
          <span class="pill-dot" style="background:${p.dot}"></span>
          <span class="pill-text">${esc(p.text)}</span>
        </span>
      </div>
      <div class="row-sub" style="color:${isOpen ? 'rgba(5,30,57,.78)' : 'rgba(5,30,57,.62)'}">${esc(sub)}</div>
      <div class="row-periods-wrap" data-periods-for="${child.id}">
        <div class="row-periods">
          ${gated
            ? `<div class="row-empty-note">Closed while the CRC building is closed.</div>`
            : periods.length
              ? periodsRowsHtml(periods, isToday)
              : `<div class="row-empty-note">Nothing posted for ${DAY_NAMES[day]}.</div>`}
          ${child.note ? `<div class="row-empty-note" style="padding-top:6px">${esc(child.note)}</div>` : ''}
        </div>
      </div>
    </button>
  `;
}

function renderClimbingChildRow(child, day, dateStr, gated) {
  const isToday = day === state.today;
  const staffedPeriods = gated ? [] : periodsFor({ days: child.staffedDays }, day, dateStr);
  const st = gated ? { kind: 'closed', label: 'Closed', sub: 'CRC building is closed' } : statusFor(staffedPeriods, isToday, state.now);
  const p = pillFor(st);
  const isOpen = st.kind === 'open' || st.kind === 'soon';
  return `
    <button class="row-card${isOpen ? ' is-open' : ''}" data-action="open-row" data-id="${child.id}">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:${st.kind === 'closed' ? 'rgba(5,30,57,.66)' : '#051e39'}">${esc(child.name)}</div>
          <div class="row-place">Staffed sessions shown below · unstaffed is reservation-only</div>
        </div>
        <span class="pill" style="background:${p.bg};color:${p.ink}">
          <span class="pill-dot" style="background:${p.dot}"></span>
          <span class="pill-text">${esc(p.text)}</span>
        </span>
      </div>
      <div class="row-periods-wrap" data-periods-for="${child.id}">
        <div class="row-periods">
          <div class="row-empty-note" style="padding:2px 9px 4px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(5,30,57,.5)">Staffed</div>
          ${gated
            ? `<div class="row-empty-note">Closed while the CRC building is closed.</div>`
            : staffedPeriods.length
              ? periodsRowsHtml(staffedPeriods, isToday)
              : `<div class="row-empty-note">No staffed session posted for ${DAY_NAMES[day]}.</div>`}
          ${child.staffedNote ? `<div class="row-empty-note" style="padding-top:6px">${esc(child.staffedNote)}</div>` : ''}
          <div class="row-empty-note" style="padding:10px 9px 4px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(5,30,57,.5)">Unstaffed — reservation only</div>
          <div class="row-empty-note">${esc(child.unstaffedNote)}</div>
          <a class="row-view-week" href="${child.bookingUrl}" target="_blank" rel="noopener">Book a slot &rsaquo;</a>
        </div>
      </div>
    </button>
  `;
}

function renderChildrenSection(loc, day, dateStr, parentStatus) {
  if (!loc.children || !loc.children.length) return '';
  const gated = !!(loc.childrenGatedByParent && parentStatus.kind === 'closed');
  const rows = loc.children.map((child) => {
    if (child.mode === 'allday') return renderLockerRow(child);
    if (child.mode === 'climbing') return renderClimbingChildRow(child, day, dateStr, gated);
    return renderWeeklyChildRow(child, day, dateStr, gated);
  }).join('');
  return `
    <div class="detail-section-title" style="padding:22px 4px 11px">${esc(loc.childrenTitle || 'Details')}</div>
    <div class="group-list">${rows}</div>
    ${loc.childrenNote ? `<div class="note-callout">${esc(loc.childrenNote)}</div>` : ''}
  `;
}

function renderDetail(id) {
  const lib = LIBRARIES.find((l) => l.id === id);
  if (lib) return renderLibraryDetail(lib);

  const loc = LOCATIONS.find((l) => l.id === id);
  const day = selectedDay();
  const dateStr = dateKeyForDayIndex(day);
  const st = statusFor(periodsFor(loc, day, dateStr), day === state.today, state.now);
  const p = pillFor(st);

  const statusLine = st.kind === 'closed'
    ? `No service posted for ${DAY_NAMES[day]}`
    : st.kind === 'open' || st.kind === 'soon'
      ? capitalize(st.sub)
      : st.kind === 'later'
        ? `${st.sub} starts ${fmtTime(st.next.s)}`
        : st.label;

  const primary = buildScheduleSection(loc, day, dateStr);
  const secondary = loc.secondary ? buildScheduleSection(loc.secondary, day, dateStr) : null;

  const activeOverride = loc.overrides && loc.overrides[dateStr];
  const noteText = (activeOverride && activeOverride.note) || loc.note;

  return `
    <div class="banner">
      <div class="detail-topbar">
        <button class="back-btn" data-action="close-detail" aria-label="Back">${icon.back}</button>
        <span class="detail-group-label">${esc(GROUP_LABELS[loc.group] || loc.group)}</span>
      </div>
      <div class="detail-head">
        <div class="detail-name">${esc(loc.name)}</div>
        <div class="detail-place">${esc(loc.place)}</div>
        <div class="detail-tags">
          <span class="pill" style="background:${p.bg};color:${p.ink}">
            <span class="pill-dot" style="background:${p.dot}"></span>
            <span class="pill-text">${esc(p.text)}</span>
          </span>
          <span class="detail-status-line">${esc(statusLine)}</span>
        </div>
      </div>
      ${renderDayStrip()}
    </div>
    <div class="body-scroll">
      ${renderScheduleBlock(secondary ? loc.name : '', primary, day)}
      ${noteText ? `<div class="note-callout">${esc(noteText)}</div>` : ''}
      ${secondary ? `<div style="height:22px"></div>${renderScheduleBlock(loc.secondary.title, secondary, day)}` : ''}
      ${renderChildrenSection(loc, day, dateStr, st)}
      <div class="footnote">${loc.sourceUrl ? `Source: <a href="${loc.sourceUrl}" target="_blank" rel="noopener" style="color:inherit">official GT page</a>, checked ${esc(loc.checked || 'Sep 23, 2026')}.` : 'Posted schedule.'} Subject to change — verify time-sensitive plans against the source.</div>
    </div>
  `;
}

// Libraries follow a dated calendar rather than a recurring weekly
// pattern, so their detail screen shows the specific checked dates rather
// than a "posted week" grid, and a status line that can honestly say
// "unknown" instead of guessing.
function renderLibraryDetail(lib) {
  const day = selectedDay();
  const dateStr = dateKeyForDayIndex(day);
  const isToday = day === state.today;
  const st = libraryRowStatus(lib, dateStr, isToday);
  const p = pillFor(st);

  const weekRows = DAY_LETTERS.map((_, i) => {
    const ds = dateKeyForDayIndex(i);
    // Always the scheduled-hours label here, never the live status — this is
    // a "posted week" table, same as dining's, so today's row reads the same
    // way as every other row instead of switching to a live "Open" pill.
    const rst = libraryRowStatus(lib, ds, false);
    const isSel = i === day;
    const ink = rst.kind === 'open' ? '#176b38' : rst.kind === 'unknown' ? '#6b5527' : 'rgba(5,30,57,.55)';
    return `
      <div class="posted-week-row" style="background:${isSel ? 'rgba(179,144,81,.18)' : 'transparent'};border-left-color:${isSel ? '#b39051' : 'transparent'}">
        <span class="posted-week-day" style="color:${ink}">${DAY_NAMES[i].slice(0, 3)}</span>
        <span class="posted-week-meta">${esc(rst.label)}</span>
        <span class="posted-week-range" style="color:${ink}"></span>
      </div>
    `;
  }).join('');

  return `
    <div class="banner">
      <div class="detail-topbar">
        <button class="back-btn" data-action="close-detail" aria-label="Back">${icon.back}</button>
        <span class="detail-group-label">Library</span>
      </div>
      <div class="detail-head">
        <div class="detail-name">${esc(lib.name)}</div>
        <div class="detail-place">${esc(lib.place)}</div>
        <div class="detail-tags">
          <span class="pill" style="background:${p.bg};color:${p.ink}">
            <span class="pill-dot" style="background:${p.dot}"></span>
            <span class="pill-text">${esc(p.text)}</span>
          </span>
          <span class="detail-status-line">${esc(st.sub)}</span>
        </div>
      </div>
      ${renderDayStrip()}
    </div>
    <div class="body-scroll">
      <div class="note-callout">${esc(lib.accessNote)}</div>
      <div class="posted-week-title">This week</div>
      <div class="posted-week">${weekRows}</div>
      <a class="tracker-link" href="${lib.sourceUrl}" target="_blank" rel="noopener">
        Open official hours page ${icon.external}
      </a>
      <div class="footnote">Published hours, checked ${esc(LIBRARIES_CHECKED)}. Not a live feed — future weeks, breaks, and finals periods aren't reflected here; see <a href="${LIBRARIES_HUB_URL}" target="_blank" rel="noopener" style="color:inherit">the library's official calendar</a> directly.</div>
    </div>
  `;
}

// ---------- Tab bar ----------

function renderTabBar() {
  const tabs = [
    { key: 'today', label: 'Today', icon: icon.today },
    { key: 'week', label: 'Week', icon: icon.week },
    { key: 'shuttle', label: 'Shuttle', icon: icon.shuttle }
  ];
  return `
    <div class="tab-bar">
      ${tabs.map((t) => `
        <button class="tab-btn${state.tab === t.key ? ' is-active' : ''}" data-action="go-tab" data-tab="${t.key}">
          ${t.icon}
          <span class="tab-label">${t.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

// ---------- Root render ----------

function render() {
  // Only the search box should ever grab focus, and only if it already had it
  // (e.g. the user is mid-keystroke) — never as a side effect of tapping something else.
  const active = document.activeElement;
  const restoreSearchFocus = !!(active && active.dataset && active.dataset.action === 'search');
  const selStart = restoreSearchFocus ? active.selectionStart : null;
  const selEnd = restoreSearchFocus ? active.selectionEnd : null;

  // root.innerHTML rebuilds .body-scroll as a brand new element every render,
  // which resets its scroll position to 0 — without this, expanding a row
  // (which triggers a re-render) would always snap the page back to the top.
  // Only carry it over when re-rendering the *same* screen though — switching
  // tabs or opening a detail screen should still start at the top.
  const viewKey = `${state.tab}:${state.detailId || ''}`;
  const prevScroller = root.querySelector('.body-scroll');
  const prevScrollTop = viewKey === lastViewKey && prevScroller ? prevScroller.scrollTop : 0;
  lastViewKey = viewKey;

  let body;
  if (state.detailId) {
    body = renderDetail(state.detailId);
  } else if (state.tab === 'week') {
    body = renderWeek() + renderTabBar();
  } else if (state.tab === 'shuttle') {
    body = renderShuttle() + renderTabBar();
  } else {
    body = renderToday() + renderTabBar();
  }
  root.innerHTML = body;
  attachHandlers();
  syncRowPeriodHeights();

  const nextScroller = root.querySelector('.body-scroll');
  if (nextScroller && prevScrollTop) nextScroller.scrollTop = prevScrollTop;

  if (restoreSearchFocus) {
    const input = root.querySelector('[data-action="search"]');
    if (input) {
      input.focus();
      if (selStart !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}

// root.innerHTML fully replaces the DOM on every render, so nothing about a
// previous element (its inline max-height, whether it was mid-transition)
// survives from one render to the next — this re-establishes it every time.
// Only the row named by justToggledId actually animates; every other open
// row is snapped straight to its full height with no transition, since it
// didn't just change state, it's only being redrawn for an unrelated reason.
function syncRowPeriodHeights() {
  const toggledId = state.justToggledId;
  state.justToggledId = null;
  root.querySelectorAll('[data-periods-for]').forEach((wrap) => {
    const id = wrap.dataset.periodsFor;
    const isOpen = state.openRows.has(id);
    if (id !== toggledId) {
      wrap.classList.remove('is-animating');
      wrap.style.maxHeight = isOpen ? wrap.scrollHeight + 'px' : '0px';
      wrap.style.opacity = isOpen ? '1' : '0';
      return;
    }
    if (isOpen) {
      const target = wrap.scrollHeight; // measured while still visually collapsed
      requestAnimationFrame(() => {
        wrap.classList.add('is-animating');
        requestAnimationFrame(() => {
          wrap.style.maxHeight = target + 'px';
          wrap.style.opacity = '1';
        });
      });
    } else {
      // Closing: this is a fresh DOM node with no memory of how tall it
      // looked a moment ago, so snap it to its current content height first
      // (invisible to the viewer — it's the same height it already was),
      // then transition down to 0 on the next frame.
      wrap.classList.remove('is-animating');
      wrap.style.maxHeight = wrap.scrollHeight + 'px';
      wrap.style.opacity = '1';
      requestAnimationFrame(() => {
        wrap.classList.add('is-animating');
        requestAnimationFrame(() => {
          wrap.style.maxHeight = '0px';
          wrap.style.opacity = '0';
        });
      });
    }
  });
}

function attachHandlers() {
  root.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    if (action === 'search') {
      // A full render rebuilds the whole page's HTML, which felt laggy on every
      // keystroke. Debouncing means the input itself stays instantly responsive
      // (it's just a native text box) while the filtered list only rebuilds once
      // typing actually pauses.
      el.addEventListener('input', (e) => {
        const value = e.target.value;
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => setState({ query: value }), 120);
      });
      return;
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (action === 'pick-day') setState({ day: Number(el.dataset.day) });
      else if (action === 'go-tab') setState({ tab: el.dataset.tab, detailId: null });
      else if (action === 'open-detail') setState({ detailId: el.dataset.id });
      else if (action === 'close-detail') setState({ detailId: null });
      else if (action === 'open-row') {
        const id = el.dataset.id;
        const next = new Set(state.openRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        // Consumed once by the very next render to decide which row actually
        // animates open/closed — every other row just snaps to its settled
        // height with no transition, so an unrelated re-render (the live
        // clock tick, a search keystroke) never replays the animation.
        state.justToggledId = id;
        setState({ openRows: next });
      } else if (action === 'pick-filter') setState({ filterGroup: el.dataset.group });
    });
  });
}

// Live clock — recompute status every 30s, matching the original design.
setInterval(() => {
  Object.assign(state, nowParts());
  render();
}, 30000);

render();

// Confirmed via live device inspection: on this iOS standalone install,
// window.innerHeight under-reports the true screen by exactly the top
// safe-area-inset amount (e.g. 812 vs a real 874), while content still
// renders flush at the true top — so the missing height silently turns
// into empty space at the bottom instead. height:100% inherits that wrong
// number since it's ultimately derived from innerHeight. screen.height is
// the one value that reports the true physical height correctly, so use
// it (via a CSS var, since this is portrait-only per the manifest, no
// orientation-swap concern) instead of trusting 100%/dvh for the outer
// layout height.
function syncAppHeight() {
  const real = Math.max(window.innerHeight, screen.height || 0);
  document.documentElement.style.setProperty('--app-height', real + 'px');
}
window.addEventListener('resize', syncAppHeight);
window.addEventListener('orientationchange', syncAppHeight);
syncAppHeight();

// Register service worker for offline + installable use. Also force an
// explicit update check on every launch and reload once a new worker takes
// over, so an installed-to-homescreen icon can never get permanently stuck
// on an old version the way it has been.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
