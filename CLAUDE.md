# Campus Now — Georgia Tech

This is a fork of **Heights Now**, a personal PWA originally built for a Boston College student showing dining hall/café/library/shuttle hours. Same owner, now adapting it for a friend at Georgia Tech. The app "engine" (rendering, styling, service worker, iOS-install fixes) is done and battle-tested. What's missing is Georgia Tech's actual data.

Read this whole file before making changes — it captures a lot of hard-won fixes that are easy to accidentally undo.

## Current state

- `app.js`, `hours.js`, `styles.css`, `sw.js`, `index.html`, `manifest.webmanifest` — **complete**, copied from the working BC app with all BC-specific text/colors genericized. Georgia Tech's public colors (Navy `#003057`, Gold `#B3A369`) are already wired into `styles.css`'s `:root` and the maroon-family hex codes scattered through `app.js`'s inline styles.
- `data.js` (dining halls/cafés/campus services), `shuttle.js` (shuttle stops/schedule), `libraries.js` (library hours) — **empty templates**. Each file has a commented-out worked example showing the exact data shape. These need Georgia Tech's real, currently-published hours before the app is actually usable.
- `icons/icon-192.png` / `icon-512.png` — a plain placeholder (navy square, letter "C"), **not a real logo**. Replace before this goes on anyone's home screen.
- `APP_NAME` constant near the top of `app.js` is currently `'Campus Now'` — change it (and `index.html`'s `<title>`/`apple-mobile-web-app-title`, and `manifest.webmanifest`'s `name`/`short_name`) if a different app name is wanted.

## What to do first

Ask for (or go find) Georgia Tech's actual currently-posted hours for:
1. Dining halls and cafés (GT Dining's hours page, or a PDF/screenshot of it)
2. The Stinger shuttle schedule/stops (GT Parking & Transportation's page)
3. Library hours (Georgia Tech Library's hours page — check whether it's a fixed weekly schedule or a dated calendar like BC's was; see `libraries.js`'s comment for which model to use)

Then fill in `data.js` / `shuttle.js` / `libraries.js` following the patterns below and their own example comments. Do this one file at a time and test locally (`python3 -m http.server 8080`) before moving to the next.

## The most important rule: never fabricate hours

The single rule that mattered most building the BC version: **if the source document doesn't say it, don't show it as a fact.**

- Missing data ≠ closed. If a meal/day isn't on the source, leave the period array empty (closed is the honest reading) *unless* there's reason to think it's just missing from the document (e.g. every other Thursday has dinner listed but this one doesn't) — in that case use the location's `note` field to say so explicitly, don't silently mark it closed.
- An unposted close time ≠ midnight. If a source says "opens 9am" with no close time, that is genuinely unknown, not "open until midnight." `libraries.js`'s `null`-as-end-time sentinel exists specifically for this — dining's `hours.js` model doesn't have an equivalent yet because BC's dining data never had this problem, but if GT's dining data does, that pattern is exactly what to reuse.
- Don't invent shuttle stop coordinates, route geometry, or a live GPS position. If GT's shuttle tracker (whatever provider it uses) doesn't have a documented, key-free, CORS-accessible public API, the honest move is what BC's shuttle tab does: publish the real posted schedule, add a manual stop picker, and link out to GT's own live tracker instead of pretending to show live positions.
- If you're inferring something (e.g. "this location is probably closed on this holiday because every other one is"), say so as a note, don't present it as a fact from the source.

## Architecture (don't fight these patterns)

**Single full-rebuild render.** `render()` in `app.js` sets `root.innerHTML` from scratch on every state change — there's no virtual DOM, no diffing. This is simple but creates real traps that are already worked around; don't remove the workarounds:

- **Scroll position**: `render()` captures `.body-scroll.scrollTop` before rebuilding and restores it after, but only when the `viewKey` (`tab:detailId`) matches the previous render — otherwise a fresh screen correctly starts at the top. If you add a new tab/screen, make sure it's covered by `viewKey`.
- **Row expand/collapse animation**: `syncRowPeriodHeights()` uses a one-shot `state.justToggledId`, consumed by the very next render, to animate only the row that was just tapped — every other open row snaps straight to its settled height. This is because a full-DOM-rebuild has no memory of a previous element's mid-transition state. Don't try to animate via CSS transitions directly on class toggle; it won't survive the rebuild.
- **Search input**: debounced 120ms via `searchDebounce` so typing doesn't feel laggy from a full rebuild on every keystroke.

**iOS standalone-mode height bug.** `syncAppHeight()` at the bottom of `app.js` writes `--app-height` from `Math.max(window.innerHeight, screen.height)`. This exists because on an iOS home-screen-installed PWA, `window.innerHeight` silently under-reports the true screen height by the safe-area-inset-top amount, which otherwise shows up as a gap above the bottom tab bar. Don't switch this back to `100%`/`100dvh` for the outer layout — it was tried and it's wrong on real devices, only looks fine in a browser preview.

**Service worker cache-busting.** `sw.js` is network-first (always tries the network, falls back to cache only offline). `CACHE`'s version string must be bumped on **every single deploy** — that's the only thing that forces an already-installed copy of the app to fetch fresh files instead of serving stale ones from its cache. Forgetting this is the single most common way a change silently doesn't show up for someone who already installed the app.

**iOS tap-highlight flicker.** `-webkit-tap-highlight-color: transparent` on `*` plus `appearance: none` on buttons/inputs in `styles.css` — without this every tap flashes grey on iOS. Don't remove it.

**iOS icon transparency.** iOS renders transparent regions of a home-screen icon as solid black, not see-through. Any real logo must be flattened onto a fully opaque background (no alpha channel) before being dropped into `icons/`. The current placeholder icon is already RGB/opaque for this reason — keep new icons that way.

## Data model patterns

**Recurring weekly schedule** (`data.js`, `shuttle.js`'s `SERVICE_WINDOWS`): built from small period-builder helpers (`T`, `P`, `L` in `data.js`) into a 7-slot array indexed `Sun=0..Sat=6`. Good for anything that follows the same pattern every week. This is what BC's dining halls, café, and shuttle all used.

**Dated calendar** (`libraries.js`): built for BC's library hours, which are a dated calendar (specific per-date windows) rather than a recurring weekly pattern, and where some checked days are genuinely incomplete. Has its own `open`/`closed`/`unknown` status logic distinct from `hours.js`'s weekly model, plus a `null`-end-time sentinel for "no posted close." **Only use this model if GT's library hours actually need it** — if GT's library hours are a normal fixed weekly schedule with no exceptions, it's simpler to just add libraries into `data.js`'s `LOCATIONS` as a `group: 'hall'`-style entry and skip `libraries.js`'s complexity entirely. Check the real source before choosing.

## Deploy workflow

1. Edit locally, test with `python3 -m http.server 8080` + a browser (ideally an iPhone-sized viewport/emulation — a lot of the bugs above only show up on real iOS Safari/standalone mode).
2. Bump `CACHE` in `sw.js`.
3. Commit and push to this repo's `main` branch (or whatever branch GitHub Pages/your host deploys from).
4. Verify the live URL actually updated — GitHub's raw/Pages CDN can lag a few minutes behind a push.

## Colors

Georgia Tech's public brand colors are already wired in as a starting point:
- Navy Blue `#003057` (was BC's maroon `#56020a` — used for the banner gradient, accent text/borders, and detail-screen background)
- Tech Gold `#B3A369` (was BC's gold `#d9bd7a` — used for the wordmark, selected-day-chip background, and active-tab-label color)

Adjust to taste — these were a reasonable default swap, not verified against any official GT brand guide.
