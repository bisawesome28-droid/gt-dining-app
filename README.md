# Campus Now (Georgia Tech)

An installable web app (PWA) showing live hours for Georgia Tech dining halls, cafés, libraries, and the shuttle — forked from Heights Now, the same app built for Boston College.

No build step, no dependencies. It's plain HTML/CSS/JS.

**This is a scaffold.** The app engine (`app.js`, `hours.js`, `styles.css`, `sw.js`, `index.html`, `manifest.webmanifest`) is complete and working. `data.js`, `shuttle.js`, and `libraries.js` are empty templates — they need Georgia Tech's real, currently-published hours before this is a usable app. See `CLAUDE.md` for the full pattern to follow when filling them in.

## Run it locally

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Get it onto your phone, without the App Store

A PWA needs to be served over HTTPS to install properly (plain `file://` won't let iOS/Android add it as a real home-screen app).

- **GitHub Pages** — push this repo to GitHub, enable Pages on the branch, and it'll get a free `https://<you>.github.io/...` URL.
- **Netlify / Vercel** — drag-and-drop this folder onto netlify.com/drop, or `vercel deploy`.

Then, on your phone:

- **iPhone (Safari):** open the link → Share icon → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app**.

## Updating the hours

- Dining halls/cafés/campus services: `data.js`
- Shuttle: `shuttle.js`
- Libraries: `libraries.js`

Each file has a worked example in comments and explains its own data shape. `CLAUDE.md` has the full walkthrough, including the patterns learned from building the BC version.
