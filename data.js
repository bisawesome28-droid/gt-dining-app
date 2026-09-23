// Georgia Tech dining halls / cafés / retail / recreation / libraries / mail.
//
// Source: Georgia_Tech_Schedules.json, official-site snapshot verified 2026-09-23
// (dining.gatech.edu, crc.gatech.edu, library.gatech.edu, studentcenter.gatech.edu).
// See each location's `note` for source-specific caveats. Per CLAUDE.md's
// no-fabrication rule: only the hours actually published are represented here —
// where the source didn't publish a detail (e.g. the 3 halls' meal periods,
// unstaffed climbing's fixed hours), it is not invented.

const T = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};
const P = (l, a, b) => ({ l, s: T(a), e: T(b) });
const L = (id, name, place, group, days, note, extra) => ({ id, name, place, group, days, note, ...(extra || {}) });
const X = [];

// Builds a 7-slot Sun..Sat days array from a weeklyDisplay-style per-day range
// string ("11am-11pm", "Closed", or "6am-9am; 12pm-3pm" for split periods).
// `label` names the single period when a day has just one range ("Open"),
// unused when a day has multiple semicolon-separated ranges (each becomes
// its own period, unlabeled beyond its position).
function weekFromRanges(mon, tue, wed, thu, fri, sat, sun, label) {
  const order = [sun, mon, tue, wed, thu, fri, sat];
  return order.map((raw) => rangesToPeriods(raw, label));
}

function rangesToPeriods(raw, label) {
  if (!raw || /^closed$/i.test(raw.trim())) return X;
  const parts = raw.split(';').map((s) => s.trim());
  return parts.map((part) => P(label || 'Open', ...parseRange(part)));
}

// Parses "11am-11pm" / "10:30am-9pm" / "11am-midnight" / "midnight-1am" /
// "midnight-3am" into ["H:MM","H:MM"] 24h strings, handling the after-midnight
// half of a pair as running into the next day (kept same-day here since the
// source's own day-attribution for that half is itself unclear — see the
// Sankranti note below).
function parseRange(part) {
  const [a, b] = part.split('-').map((s) => s.trim());
  return [parseClock(a), parseClock(b)];
}

function parseClock(s) {
  if (/^midnight$/i.test(s)) return '24:00';
  if (/^noon$/i.test(s)) return '12:00';
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3].toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${h}:${String(min).padStart(2, '0')}`;
}

const ALL_DAY = [P('Open', '0:00', '24:00')];
const ALL_DAY_WEEK = [ALL_DAY, ALL_DAY, ALL_DAY, ALL_DAY, ALL_DAY, ALL_DAY, ALL_DAY];

const SOURCE_DINING = 'https://dining.gatech.edu/dining-locations/hours-operation';
const SOURCE_CRC = 'https://crc.gatech.edu/hours/';
const SOURCE_CLIMBING = 'https://crc.gatech.edu/locations/';
const SOURCE_LIBRARY = 'https://library.gatech.edu/about/hours';
const SOURCE_STUDENT_CENTER = 'https://studentcenter.gatech.edu/hours';
const SOURCE_POST_OFFICE = 'https://studentcenter.gatech.edu/georgia-tech-post-office';
const SOURCE_LOCKERS = 'https://studentcenter.gatech.edu/using-amazon-lockers-on-campus';

// ---------- Dining halls ----------

export const LOCATIONS = [
  L('brittain-dining-hall', 'Brittain Dining Hall', 'Georgia Tech Dining', 'hall',
    weekFromRanges('11am-11pm', '11am-11pm', '11am-11pm', '11am-11pm', '11am-11pm', 'Closed', 'Closed'),
    'Overall hall hours only — separate breakfast/lunch/dinner windows aren’t published on the official location pages.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('north-ave-dining-hall', 'North Ave Dining Hall', 'Georgia Tech Dining', 'hall',
    weekFromRanges('7am-11pm', '7am-11pm', '7am-11pm', '7am-11pm', '7am-11pm', '9am-9pm', '9am-9pm'),
    'Overall hall hours only — separate breakfast/lunch/dinner windows aren’t published on the official location pages.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('west-village-dining-hall', 'West Village Dining Hall', 'Georgia Tech Dining', 'hall',
    weekFromRanges('7am-11pm', '7am-11pm', '7am-11pm', '7am-11pm', '7am-11pm', '9am-9pm', '9am-9pm'),
    'Overall hall hours only — separate breakfast/lunch/dinner windows aren’t published on the official location pages.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  // ---------- Campus cafés & retail ----------

  L('dunkin', 'Dunkin’', 'Campus Cafés & Retail', 'cafe',
    weekFromRanges('7am-8pm', '7am-8pm', '7am-8pm', '7am-8pm', '7am-7pm', '8am-5pm', '9am-4pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('gold-bold-coffee-roasters-ibb', 'Gold & Bold Coffee Roasters (IBB)', 'Campus Cafés & Retail', 'cafe',
    weekFromRanges('Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed', 'Closed'),
    'Currently listed closed all week on the official site; a reopening date isn’t posted.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('jimmy-johns', 'Jimmy John’s', 'Campus Cafés & Retail', 'cafe',
    weekFromRanges('10am-8pm', '10am-8pm', '10am-8pm', '10am-8pm', '10am-7pm', '10am-5pm', '10am-4pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('kaldis-coffee-clough', 'Kaldi’s Coffee (Clough)', 'Campus Cafés & Retail', 'cafe',
    weekFromRanges('7am-7pm', '7am-7pm', '7am-7pm', '7am-7pm', '7am-7pm', 'Closed', 'Closed'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('sideways-cafe', 'Sideways Cafe — by Blue Donkey', 'Campus Cafés & Retail', 'cafe',
    weekFromRanges('7am-10pm', '7am-10pm', '7am-10pm', '7am-10pm', '7am-10pm', '9am-5pm', '9am-9pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  // ---------- Student Center food & market (John Lewis Student Center) ----------

  L('big-chicken', 'Big Chicken', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '12pm-4pm', '10:30am-5pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('blenz-bowls', 'Blenz Bowls', 'John Lewis Student Center', 'cafe',
    weekFromRanges('9am-6pm', '9am-6pm', '9am-6pm', '9am-6pm', '9am-5pm', 'Closed', '12pm-6pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('chick-fil-a', 'Chick-fil-A', 'John Lewis Student Center', 'cafe',
    weekFromRanges('7am-10pm', '7am-10pm', '7am-10pm', '7am-10pm', '7am-7pm', '9am-5pm', 'Closed'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('dancing-goats', 'Dancing Goats', 'John Lewis Student Center', 'cafe',
    weekFromRanges('7am-9pm', '7am-9pm', '7am-9pm', '7am-9pm', '7am-9pm', '9am-4pm', '9am-4pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('fresh-brothers-pizza', 'Fresh Brothers Pizza', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10:30am-11pm', '10:30am-11pm', '10:30am-11pm', '10:30am-11pm', '10:30am-11pm', '12pm-4pm', '10:30am-7pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('kinnamons', 'Kinnamons', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-5pm', '10:30am-5pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('krafted-wander-dawgs-bennys', 'Krafted / Wander Dawgs / Benny’s Cheesesteaks', 'John Lewis Student Center', 'cafe',
    weekFromRanges('8:30am-11pm', '8:30am-11pm', '8:30am-11pm', '8:30am-11pm', '8:30am-11pm', '10:30am-7pm', '10:30am-7pm'),
    'Official site lists all three brands as one shared counter/hours listing — shown here as one entry rather than splitting into unverified separate schedules. Breakfast: Mon–Fri 8:30–10:30am, Sat–Sun 10:30am–noon; remaining posted hours are the second (all-day) service period.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('marrakech-express', 'Marrakech Express', 'John Lewis Student Center', 'cafe',
    weekFromRanges('11am-6pm', '11am-6pm', '11am-6pm', '11am-6pm', '11am-6pm', 'Closed', 'Closed'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('panda-express', 'Panda Express', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10am-9pm', '10am-9pm', '10am-9pm', '10am-9pm', '10am-7pm', '11am-4pm', '11am-5pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('taim-mediterranean-kitchen', 'taim — Mediterranean Kitchen', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-9pm', '10:30am-5pm', '10:30am-5pm'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('tech-it-to-go', 'Tech It To Go', 'John Lewis Student Center', 'cafe',
    weekFromRanges('9am-4pm', '9am-4pm', '9am-4pm', '9am-4pm', '9am-4pm', 'Closed', 'Closed'),
    'Convenience store. A special-hours panel for Sep 23–24 listed Wednesday 10am–3pm, but the panel didn’t give a year — not applied here as a dated override until that’s confirmed.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('twisted-taco', 'Twisted Taco', 'John Lewis Student Center', 'cafe',
    weekFromRanges('10:30am-7pm', '10:30am-7pm', '10:30am-7pm', '10:30am-7pm', '10:30am-5pm', 'Closed', 'Closed'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  // ---------- Tech Square dining ----------

  L('boho-taco', 'Boho Taco', 'Tech Square', 'cafe',
    weekFromRanges('11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm'),
    'Listed by Tech Dining under Tech Square — distinct from the campus dining halls.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('moes-midtown', 'Moe’s Midtown At Georgia Tech', 'Tech Square', 'cafe',
    weekFromRanges('10:30am-10pm', '10:30am-10pm', '10:30am-10pm', '10:30am-10pm', '10:30am-10pm', '10:30am-10pm', '10:30am-10pm'),
    'Listed by Tech Dining under Tech Square — distinct from the campus dining halls.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('rays-pizza', 'Ray’s Pizza', 'Tech Square', 'cafe',
    weekFromRanges('11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm', '11am-10pm'),
    'Listed by Tech Dining under Tech Square — distinct from the campus dining halls.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('tech-square-tavern', 'Tech Square Tavern', 'Tech Square', 'cafe',
    weekFromRanges('4pm-11pm', '4pm-11pm', '4pm-11pm', '4pm-11pm', '4pm-11pm', '4pm-11pm', '4pm-11pm'),
    'Listed by Tech Dining under Tech Square — distinct from the campus dining halls.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('tin-drum-asian-kitchen', 'Tin Drum Asian Kitchen', 'Tech Square', 'cafe',
    weekFromRanges('11am-9pm', '11am-9pm', '11am-9pm', '11am-9pm', '11am-9pm', '11am-9pm', '11am-9pm'),
    'Listed by Tech Dining under Tech Square — distinct from the campus dining halls.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('kaldis-coffee-tech-square', 'Kaldi’s Coffee @ Tech Square', 'Tech Square', 'cafe',
    weekFromRanges('8am-5pm', '8am-5pm', '8am-5pm', '8am-5pm', '8am-5pm', 'Closed', 'Closed'),
    null, { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('conference-dining-room', 'Conference Dining Room', '800 Spring St NW · Tech Square', 'cafe',
    [
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')],
      [P('Breakfast', '7:00', '11:00'), P('Lunch', '11:30', '14:00'), P('Dinner', '16:00', '23:00')]
    ],
    'Daily, all week. Meal periods are the actual food-service windows — the building itself doesn’t serve food during the gaps between them even though it’s posted open 7am–11pm overall.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026' }),

  L('sankranti', 'Sankranti', 'Tech Square', 'cafe',
    weekFromRanges(
      '11am-midnight', '11am-midnight', '11am-midnight', '11am-midnight',
      '11am-midnight', '11am-midnight', '11am-midnight'
    ),
    'Needs review: the official site splits its listing at midnight (e.g. Mon 11am–midnight, then midnight–1am; Fri/Sat runs midnight–3am after that). Which calendar day the after-midnight portion belongs to isn’t clear from the source, so only the pre-midnight portion is shown here until that’s confirmed — don’t treat this as the full posted hours.',
    { sourceUrl: SOURCE_DINING, checked: 'Sep 23, 2026', needsReview: true }),

  // ---------- Recreation ----------

  L('campus-recreation-center-crc', 'Campus Recreation Center (CRC)', 'Georgia Tech Recreation', 'rec',
    weekFromRanges('5:30am-midnight', '5:30am-midnight', '5:30am-midnight', '5:30am-midnight', '5:30am-9pm', '9am-7pm', '9am-10pm'),
    'Fall 2026 building schedule. This is building access only — facility access requirements apply, and pool/climbing have their own schedules below. A closed building overrides any activity’s own posted hours.',
    {
      sourceUrl: SOURCE_CRC,
      checked: 'Sep 23, 2026',
      childrenTitle: 'Inside the Rec Center',
      overrides: {
        '2026-10-04': { periods: [P('Open', '9:00', '17:00')], note: 'Fall break weekend hours.' },
        '2026-10-05': { periods: [P('Open', '9:00', '20:00')], note: 'Fall break hours.' },
        '2026-10-06': { periods: [P('Open', '9:00', '22:00')], note: 'Fall break hours.' }
      },
      children: [
        {
          id: 'indoor-climbing-wall', name: 'Indoor Climbing Wall', mode: 'climbing',
          staffedDays: weekFromRanges('5pm-9pm', '5pm-9pm', '5pm-9pm', '5pm-9pm', '2pm-4:45pm', 'Closed', 'Closed', 'Staffed'),
          staffedNote: 'No staffed weekend hours are posted — this does not mean climbing is closed on weekends, only that no staffed session is scheduled then. Staffed sessions allow bouldering, Kilter Board, top rope, and lead; belay tests during staffed hours only.',
          unstaffedNote: 'Unstaffed: bouldering below the 13.5-ft line and Kilter Board only. Requires a free climbing membership/waiver and a reserved time slot — check in at Main Issue. No fixed weekly hours are posted for this mode. Known group closures: Thu noon–2pm and 9:30–11:30pm; Fri noon–2pm.',
          bookingUrl: 'https://mycrc.gatech.edu/booking/f68c280f-7336-43af-b23f-aa265cee32e7',
          sourceUrl: SOURCE_CLIMBING, checked: 'Sep 23, 2026', needsReview: true
        },
        {
          id: 'crc-member-services', name: 'Member Services', mode: 'weekly',
          days: weekFromRanges('10am-9pm', '10am-9pm', '10am-9pm', '10am-9pm', '10am-6pm', '11am-6pm', '10am-8pm'),
          sourceUrl: SOURCE_CRC, checked: 'Sep 23, 2026'
        },
        {
          id: 'crc-esports', name: 'Esports', mode: 'weekly',
          days: weekFromRanges('1pm-9pm', '1pm-9pm', '1pm-9pm', '1pm-9pm', '1pm-8pm', '12pm-6pm', '12pm-9pm'),
          sourceUrl: SOURCE_CRC, checked: 'Sep 23, 2026'
        },
        {
          id: 'mcauley-competition-pool', name: 'McAuley Competition Pool — rec swim', mode: 'weekly',
          days: weekFromRanges('9am-2pm', '6am-9am; 12pm-3pm', '9am-2pm', '6am-9am; 12pm-3pm', '9am-2pm', 'Closed', 'Closed'),
          note: 'Weekend rec swim uses the Crawford Leisure Pool instead. Meet/lane availability can change without notice.',
          sourceUrl: SOURCE_CRC, checked: 'Sep 23, 2026'
        },
        {
          id: 'crawford-leisure-pool-lap-lanes', name: 'Crawford Leisure Pool — lap lanes', mode: 'weekly',
          days: weekFromRanges('6am-9am; 2pm-8pm', '6am-12pm; 2pm-8pm', '6am-9am; 2pm-8pm', '6am-12pm; 2pm-8pm', '6am-9am; 2pm-8pm', '10am-6pm', '12pm-6pm'),
          note: 'Lane counts vary — check the rec-swim calendar.',
          sourceUrl: SOURCE_CRC, checked: 'Sep 23, 2026'
        },
        {
          id: 'crawford-rec-area-water-slide', name: 'Crawford Rec Area & Water Slide', mode: 'weekly',
          days: weekFromRanges('4pm-8pm', '4pm-8pm', '4pm-8pm', '4pm-8pm', '4pm-8pm', '10am-6pm', '12pm-6pm'),
          sourceUrl: SOURCE_CRC, checked: 'Sep 23, 2026'
        }
      ]
    }),

  L('tech-rec-student-center', 'Tech Rec (Student Center)', 'John Lewis Student Center', 'rec',
    weekFromRanges('10am-10pm', '10am-10pm', '10am-10pm', '10am-10pm', '12pm-midnight', '2pm-11pm', 'Closed'),
    'A separate Student Center recreation venue — not part of the CRC building.',
    { sourceUrl: SOURCE_STUDENT_CENTER, checked: 'Sep 23, 2026' }),

  // ---------- Mail & packages ----------

  L('georgia-tech-post-office', 'Georgia Tech Post Office', 'John Lewis Student Center, 1st floor · 351 Ferst Dr NW', 'rec',
    weekFromRanges('8:30am-5pm', '8:30am-6pm', '8:30am-5pm', '8:30am-6pm', '8:30am-5pm', '9am-12pm', 'Closed'),
    'Staffed counter hours. Wait for GT’s pickup-ready email, then bring your BuzzCard or a government photo ID to the pickup location named in that email. A closed counter doesn’t affect the Amazon Lockers below — they run independently, 24/7.',
    {
      sourceUrl: SOURCE_POST_OFFICE,
      checked: 'Sep 23, 2026',
      childrenTitle: 'Amazon Lockers',
      children: [
        { id: 'amazon-locker-daksh', name: 'Amazon Locker — Daksh', mode: 'allday', sourceUrl: SOURCE_LOCKERS },
        { id: 'amazon-locker-len', name: 'Amazon Locker — Len', mode: 'allday', sourceUrl: SOURCE_LOCKERS },
        { id: 'amazon-locker-dilophosaurus', name: 'Amazon Locker — Dilophosaurus', mode: 'allday', sourceUrl: SOURCE_LOCKERS },
        { id: 'amazon-locker-bubbly', name: 'Amazon Locker — Bubbly', mode: 'allday', sourceUrl: SOURCE_LOCKERS }
      ],
      childrenNote: 'Locker identities are from the official GT page; their 24/7 access schedule is a user-supplied update (Sep 23, 2026), not independently verified against an official posted hours page. These are grouped here for navigation only — an open locker does not mean the Post Office counter is open, and vice versa.'
    }),

  // ---------- Libraries ----------
  // GT's library hours are a plain fixed weekly pattern (not a dated calendar
  // with real exceptions), so per CLAUDE.md these go straight into LOCATIONS
  // as group 'library' rather than through libraries.js's dated-calendar model.

  L('price-gilbert-library', 'Price Gilbert Memorial Library', 'Georgia Tech Library', 'library',
    ALL_DAY_WEEK,
    'Open 24/7 for current GT students, faculty, and staff outside semester breaks — BuzzCard required 6pm–7am. Visitor hours differ: Mon–Fri 7:30am–6pm, Sat–Sun 9am–5pm. Service desks and outdoor areas keep their own separate hours.',
    { sourceUrl: SOURCE_LIBRARY, checked: 'Sep 23, 2026' }),

  L('crosland-tower', 'Crosland Tower', 'Georgia Tech Library', 'library',
    ALL_DAY_WEEK,
    'Open 24/7 for current GT students, faculty, and staff outside semester breaks — BuzzCard required 6pm–7am. Visitor hours differ: Mon–Fri 7:30am–6pm, Sat–Sun 9am–5pm. Service desks and outdoor areas keep their own separate hours.',
    { sourceUrl: SOURCE_LIBRARY, checked: 'Sep 23, 2026' }),

  L('clough-undergraduate-commons', 'Clough Undergraduate Learning Commons', 'Georgia Tech Library', 'library',
    ALL_DAY_WEEK,
    'The official page describes Clough as typically open 24/7 — a study building, not a third main library. Access and semester-break exceptions may apply.',
    { sourceUrl: SOURCE_LIBRARY, checked: 'Sep 23, 2026' })
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
