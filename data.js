// [School] Dining Hours — TEMPLATE, no real data yet.
//
// This mirrors the pattern used by Heights Now (the BC app this repo was
// forked from): each location is a day-of-week schedule (index 0=Sun..6=Sat),
// built from small period arrays via P(label, start, end). Times are "H:MM"
// 24-hour strings. A day with no service uses X (an empty array).
//
// NO-FABRICATION RULE: never invent hours the school hasn't actually
// published. If a meal/day isn't on the source document, leave it out
// (empty array) rather than guessing a time. If hours are genuinely unclear
// or only partially posted, say so in `note` — don't silently render it as
// closed, and don't default a missing close time to midnight.
//
// Fill this in from the school's real, currently-posted dining hours (a PDF,
// an official hours page, etc.). See CLAUDE.md for the full walkthrough and
// worked examples from the BC build this was forked from.

const T = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};
const P = (l, a, b) => ({ l, s: T(a), e: T(b) });
const L = (id, name, place, group, days, note, extra) => ({ id, name, place, group, days, note, ...(extra || {}) });
const X = [];

// EXAMPLE (delete once real locations are added):
//
// const breakfast = [P('Breakfast', '7:30', '10:30')];
// const lunch = [P('Lunch', '11:00', '14:00')];
// const dinner = [P('Dinner', '17:00', '20:00')];
// const weekday = breakfast.concat(lunch, dinner);
//
// export const LOCATIONS = [
//   L('example-hall', 'Example Dining Hall', 'Some Building · Campus', 'hall',
//     [X, weekday, weekday, weekday, weekday, weekday, X]),
//   L('example-cafe', 'Example Café', 'Student Center', 'cafe',
//     [X, [P('Open', '8:00', '18:00')], [P('Open', '8:00', '18:00')], [P('Open', '8:00', '18:00')], [P('Open', '8:00', '18:00')], [P('Open', '8:00', '15:00')], X])
// ];

// group: 'hall' (dining hall), 'cafe' (café/market), or 'rec' (campus service —
// rec center, mailroom, etc; shown under the "Campus Services" filter tab).
export const LOCATIONS = [];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
