# Hello Desk

Open `index.html` directly in a browser. This static page has no build step, dependencies, or runtime network requests. Your name, language, theme, and waves stay in this browser's local storage.

The Cloudflare Worker module is generated from the same root `index.html` used by GitHub Pages. Regenerate it with `node scripts/build-worker.mjs`. No hosting changes are performed by this command.

Run the no-browser smoke check:

```sh
node tests/smoke.mjs
```

Run the full browser suite (requires local Chrome at `/usr/bin/google-chrome` and Node with global WebSocket):

```sh
node tests/suite.mjs
```

The suite saves desktop and mobile screenshots in `test-results/`.
