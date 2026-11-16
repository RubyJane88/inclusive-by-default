# Demo site

A static site that shows the three demos and the code to copy. It is
built from this repo, so it cannot drift from the code.

| File | What it does |
|---|---|
| `capture.py` | Runs each demo's tests and records the real output in `outputs.json`. |
| `outputs.json` | The recorded output, with the date and tool versions. |
| `template.html` | The page. Placeholders pull in recorded output and repo files. |
| `build.py` | Fills the template and copies `app/` and axe-core into `_site/`. Standard library only. |
| `assets/` | Stylesheet, script and icon. |

## Commands

Run these from `python/`:

```
make site-capture   # after any change to app/, the framework or the tests
make site           # build ../_site
make site-serve     # build, then preview at http://localhost:8080
```

Commit `outputs.json` after `make site-capture`. Netlify does not run
the tests; it only runs `python3 site/build.py`.

## Publishing on Netlify

`netlify.toml` at the repo root holds the settings. In Netlify, choose
"Add new site", then "Import an existing project", pick this GitHub
repo, and deploy. Every merge to `main` republishes the site.

## What is live and what is recorded

- The broken, fixed and hollow pages are live. Visitors can use them by
  keyboard or with a screen reader.
- The "Run axe" buttons run axe-core in the visitor's browser.
- The pytest output is recorded, and the page says when and with which
  versions.
