// [School] Libraries — TEMPLATE, no real hours yet.
//
// Why this isn't modeled like dining hours: libraries often don't follow a
// recurring weekly pattern the way a dining hall does — many schools post a
// dated calendar instead, and some days on it are genuinely incomplete (an
// opening time with no posted close, or vice versa). An incomplete day must
// show as unknown, never silently as closed — that's why this has its own
// status logic instead of reusing hours.js's weekly-pattern model, which has
// no concept of "we don't know."
//
// If the school's library actually does run a fixed weekly schedule with no
// exceptions, you can skip this dated-calendar model entirely and add
// libraries straight into data.js's LOCATIONS as group 'hall'-style entries
// instead — don't force the dated model where it isn't needed.
//
// Each library's KNOWN open windows, by calendar date. `e` is minutes past
// midnight that date, and can be:
//   - a normal number (closes that day)
//   - a number > 1440 (source explicitly states it runs into the next
//     calendar date, e.g. "9:00 a.m.–2:00 a.m. next day")
//   - null (source only posted an opening event with no close time — do NOT
//     default this to end-of-day; that would fabricate a midnight close the
//     source never actually posted)
// Any time on a checked date not covered by that date's own window, or a
// spillover from the previous date's window, falls to that library's
// `gapStatus` ('closed' if the posted hours are genuinely complete for every
// checked day, 'unknown' if there are real gaps in what's posted).

const CHECKED_RANGE = { start: '', end: '' };

// EXAMPLE (delete once real windows are added):
// const EXAMPLE_WINDOWS = { '2026-01-01': [[540, 1320]] }; // 9:00am–10:00pm

export const LIBRARIES = [];

export const LIBRARIES_CHECKED = 'not yet set';
export const LIBRARIES_HUB_URL = '';

function prevDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// status.kind: 'open' | 'closed' | 'unknown'. `closesAt` is minutes-past-midnight
// TODAY when known — null both when the source posted no close time at all,
// and when the close is stated but falls on the next calendar date (in which
// case `spillsToNextDay` is true instead of fabricating a same-day time).
export function libraryStatusFor(lib, dateStr, nowMin) {
  const todayWindows = lib.windows[dateStr] || [];
  for (const [s, e] of todayWindows) {
    const effectiveEnd = e === null ? 1440 : Math.min(e, 1440);
    if (nowMin >= s && nowMin < effectiveEnd) {
      const spills = e !== null && e > 1440;
      return { kind: 'open', closesAt: e !== null && e <= 1440 ? e : null, spillsToNextDay: spills, nextDayCloseAt: spills ? e - 1440 : null };
    }
  }
  const yestWindows = lib.windows[prevDateStr(dateStr)] || [];
  for (const [, e] of yestWindows) {
    if (e !== null && e > 1440 && nowMin < e - 1440) {
      return { kind: 'open', closesAt: e - 1440, spillsToNextDay: false };
    }
  }
  const inCheckedRange = dateStr >= CHECKED_RANGE.start && dateStr <= CHECKED_RANGE.end;
  return { kind: inCheckedRange ? lib.gapStatus : 'unknown' };
}
