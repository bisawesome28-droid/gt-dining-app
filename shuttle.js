// [School] Shuttle — TEMPLATE, no real schedule yet.
//
// Why schedule-only (unless you can verify otherwise): this app is a static
// site with no server backend. Before assuming there's no live feed, check
// whether the school's shuttle/transit provider (TransLoc, Passio, DoubleMap,
// etc.) has a documented, CORS-accessible, key-free public API — if one
// exists, a "next bus" feature could genuinely use it. If not, ship the
// regular published schedule + a manual stop picker, and link out to
// whatever live tracker the school already runs instead of guessing at
// arrival times. Don't invent stop coordinates or route geometry that
// haven't been verified either — that's what would be needed for a real
// interactive map, and fabricating it would be worse than not having one.
//
// Fill this in from the school's actual published shuttle schedule.

function fmtClock(m) {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60), mi = mm % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return mi ? `${hh}:${String(mi).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}

function freqLabel(freq) {
  return freq[0] === freq[1] ? `every ${freq[0]} min` : `every ${freq[0]}–${freq[1]} min`;
}

// EXAMPLE shape (delete once real data is added):
//
// const SERVICE_WINDOWS = [
//   { days: 'weekday', start: 7 * 60, end: 19 * 60, variant: 'Main Loop', freq: [10, 15] }
// ];
// const VARIANT_SEQUENCE = { 'Main Loop': ['stopA', 'stopB', 'stopC'] };
// export const STOPS = [
//   { id: 'stopA', name: 'Stop A' },
//   { id: 'stopB', name: 'Stop B' },
//   { id: 'stopC', name: 'Stop C' }
// ];

// weekdays: 'weekday' (Mon–Fri) or 'weekend' (Sat–Sun). start/end in minutes
// past midnight of that weekday-type's day; end may exceed 1440 for "runs
// into the next day".
const SERVICE_WINDOWS = [];

// Published stop order per route/variant — used to show "next stops," not a
// verified direction/trip mapping. Don't read a "toward X" claim into this.
const VARIANT_SEQUENCE = {};

export const STOPS = [];

function variantsServing(stopId) {
  return Object.keys(VARIANT_SEQUENCE).filter((v) => VARIANT_SEQUENCE[v].includes(stopId));
}

function windowsFor(variant) {
  return SERVICE_WINDOWS.filter((w) => w.variant === variant);
}

function weekdayType(dow) {
  return dow === 0 || dow === 6 ? 'weekend' : 'weekday';
}

// The currently active window, checking both today's windows and yesterday's
// overnight windows that spill past midnight.
export function activeWindow(nowMin, dow) {
  const todayType = weekdayType(dow);
  for (const w of SERVICE_WINDOWS) {
    if (w.days === todayType && nowMin >= w.start && nowMin < w.end) return w;
  }
  const yestType = weekdayType((dow + 6) % 7);
  const rel = nowMin + 1440;
  for (const w of SERVICE_WINDOWS) {
    if (w.days === yestType && rel >= w.start && rel < w.end) return w;
  }
  return null;
}

export function stopInfo(stopId, nowMin, dow) {
  const win = activeWindow(nowMin, dow);
  const servedNow = !!(win && VARIANT_SEQUENCE[win.variant] && VARIANT_SEQUENCE[win.variant].includes(stopId));
  const servingVariants = variantsServing(stopId);
  const nextStops = win && servedNow
    ? VARIANT_SEQUENCE[win.variant].slice(VARIANT_SEQUENCE[win.variant].indexOf(stopId) + 1)
    : [];
  const dayRank = (d) => (d === 'weekday' ? 0 : 1);
  const allWindows = servingVariants.flatMap(windowsFor).sort((a, b) => dayRank(a.days) - dayRank(b.days) || a.start - b.start);
  return { win, servedNow, servingVariants, nextStops, allWindows };
}

export { fmtClock, freqLabel };

// One-off recurring notes shown below the stop picker (early-morning loops,
// summer/holiday variants, event-day changes, etc). Leave empty until real
// notes exist — don't invent placeholder ones.
export const EARLY_LOOP = { title: '', text: '' };
export const SPECIAL_SERVICE_NOTICES = [];

export const SCHEDULE_CHECKED = 'not yet set';
export const LIVE_TRACKER_URL = '';
