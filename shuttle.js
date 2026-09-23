// Georgia Tech Stinger shuttle + Stingerette — route-level model.
//
// GT does run a real, currently-operating campus shuttle system (unlike the
// original assumption when this fork started) — it was reorganized for Fall
// 2026 under new route names (Gold, Clough, Green, Blue, Red, Northside–
// Atlantic Station) plus the on-demand Stingerette. Source: GT Parking &
// Transportation's "Transportation Update for Fall 2026" post (pts.gatech.edu,
// Aug 17, 2026) via web search — this environment couldn't fetch pts.gatech.edu
// or bus.gatech.edu directly to confirm the page verbatim.
//
// What's deliberately NOT modeled, per the no-fabrication rule: per-route stop
// lists and any weekday-vs-weekend hour split. Neither was confirmable from
// what could be reached, and GT's own routes changed shape for this term, so
// carrying over older (2025) stop data would misrepresent the current network.
// Each route below runs the same posted hours every day of the week until
// that's confirmed otherwise — not a claim that it's identical on weekends,
// just the one range that could actually be sourced. Live positions and exact
// stops: use the TransLoc tracker linked below, same as the school does.

const T = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};
const P = (l, a, b) => ({ l, s: T(a), e: T(b) });
const daily = (period) => [period, period, period, period, period, period, period];

export const ROUTES = [
  {
    id: 'gold', name: 'Gold Route',
    days: daily([P('Running', '5:15', '24:00')]),
    note: 'Runs through Midtown and central campus.'
  },
  {
    id: 'clough', name: 'Clough Route',
    days: daily([P('Running', '7:30', '24:00')]),
    note: 'Previously combined with Gold in the evenings/weekends — as of Fall 2026 each runs as its own separate route all week.'
  },
  {
    id: 'green', name: 'Green Route',
    days: daily([P('Running', '6:45', '19:00')]),
    note: ''
  },
  {
    id: 'blue', name: 'Blue Route',
    days: daily([P('Running', '7:00', '22:00')]),
    note: ''
  },
  {
    id: 'red', name: 'Red Route',
    days: daily([P('Running', '7:00', '22:00')]),
    note: ''
  },
  {
    id: 'northside-atlantic-station', name: 'Northside – Atlantic Station Route',
    days: daily([P('Running', '7:15', '19:00')]),
    note: ''
  }
];

export const STINGERETTE = {
  id: 'stingerette',
  name: 'Stingerette',
  days: daily([P('Available', '20:00', '27:15')]),
  note: 'On-demand, shared-ride van service across main campus, Tech Square, and Midtown MARTA — not a fixed loop. Book at pts.gatech.edu/shuttles/stingerette or by phone at (404) 385-7433. Not running on Institute holidays or during home football games.',
  bookingUrl: 'https://www.pts.gatech.edu/shuttles/stingerette/',
  bookingPhone: '(404) 385-7433'
};

export const DISCONTINUED_NOTE = 'The NARA–Science Square Route was discontinued for low ridership; that area is now served by Stingerette vans and the Yellow Jacket Voucher (Uber) program instead.';

export const STOP_LEVEL_CAVEAT = 'Route hours above are the one overall range GT Parking & Transportation posted for Fall 2026 — a weekday/weekend split, if any, and the actual stop-by-stop order aren’t independently confirmed here. For live positions and exact stops, use the TransLoc tracker.';

export const SCHEDULE_CHECKED = 'Sep 23, 2026';
export const SOURCE_URL = 'https://www.pts.gatech.edu/2026/08/17/transportation-update-for-fall-2026/';
export const LIVE_TRACKER_URL = 'https://bus.gatech.edu/routes';
