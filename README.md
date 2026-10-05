# Service Work Tracker

A small personal web app for tracking service work days (עבודת שירות). It runs entirely in the browser, works on phones like an installed app, and needs no account, server or database.

- One large **“I worked today”** button (one record per date, duplicates are impossible), with an optional note
- **Progress**: completed work days, remaining days with and without shortening (קיצור), and estimated completion dates that skip your weekly days off
- **History** (filter by month and year, edit or delete with confirmation) and a monthly **calendar**
- **Settings**: name, language, required work days, shortening, weekly days off, PDF and JSON backup, delete all data
- Three languages: **العربية**, **עברית** (both right-to-left) and **English**
- **PDF export** in the current language, which can be **imported back** into the app
- Installable on Android and iPhone (Add to Home Screen) and works offline

## Your data stays on this device

All records are saved in the browser's `localStorage` on this device only. Nothing is uploaded, and there is no analytics. Imported PDF and JSON files are read locally.

> **Warning:** clearing the browser's site data, using private browsing, or uninstalling the browser deletes your records. Data is not shared between browsers or devices.
>
> **Export a JSON backup regularly** (Settings → Backup → Export backup) and keep the file somewhere safe. To move to a new phone, import that file there.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check and build the static site into dist/
npm run preview  # serve the production build locally
```

`npm run typecheck` runs only the TypeScript checks.

## Deploy to GitHub Pages

The repository includes `.github/workflows/deploy.yml`, which builds and publishes the site on every push to `main`.

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow manually from the **Actions** tab.
4. The site will be available at `https://<your-user>.github.io/<repository-name>/`.

**Base path:** `vite.config.ts` uses a relative base (`base: './'`), and navigation uses `#/…` links. The same build therefore works under any repository name, a user site (`<user>.github.io`) or a custom domain, without changes. If you prefer an absolute base, set `base: '/<repository-name>/'` in `vite.config.ts` (or `'/'` for a user site or custom domain).

## Install on a phone

Open the site in the phone's browser, then:

- **Android (Chrome):** menu ⋮ → *Add to Home screen* / *Install app*
- **iPhone (Safari):** Share → *Add to Home Screen*

The app then opens in its own window and also works offline. Its data is the browser's local data, so keep exporting backups.

## How the numbers are calculated

- **Completed work days** = the number of saved work-day records. Nothing else adds to it.
- **Remaining without shortening** = `max(requiredNetDays − completed, 0)`
- **Remaining with shortening** = `max(requiredNetDays − shorteningDays − completed, 0)`
- **Estimated completion date**: counting starts the day after today. Today counts only once it is saved, so the estimate stays conservative. Every following day is counted as a work day, except your weekly days off.
- **Weekly days off** are never recorded and never count as work. New work can't be registered on them. Existing records on those dates are always kept.
- Until *Required work days* is set, the dashboard shows a short setup hint instead of the calculations.

Weekdays are stored as numbers using JavaScript's `Date.getDay()` convention: `0` Sunday, `1` Monday, `2` Tuesday, `3` Wednesday, `4` Thursday, `5` Friday, `6` Saturday. Calendar weeks start on Sunday.

## File formats

**JSON backup** (`schemaVersion` 2). Backups with version 1, made before the service fields existed, can still be imported.

```json
{
  "schemaVersion": 2,
  "exportedAt": "2026-10-05T09:00:00.000Z",
  "settings": { "name": "…", "language": "he", "requiredNetDays": 180, "shorteningDays": 20, "weeklyDaysOff": [5, 6] },
  "records": [{ "date": "2026-09-01", "worked": true, "note": "", "createdAt": "…", "updatedAt": "…" }]
}
```

Importing always shows a preview first. It only adds dates that aren't saved yet, and never changes or deletes existing records. Restoring the name, language and service settings from a backup is optional.

**PDF:** the visual pages are drawn by the browser's own text engine, so Arabic and Hebrew render correctly, and embedded as images. The last part of the PDF contains a plain-text *Import data* section that the app reads back with PDF.js:

```
SERVICE_WORK_TRACKER_V1
NAME: <name>
RECORD: 2026-09-01|worked|<note>
END_SERVICE_WORK_TRACKER
```

Names and notes in this section are percent-encoded (like URLs). Every line is then plain ASCII and survives PDF text extraction in any language. Only PDFs created by this app can be imported. The PDF is a personal work log, not an official document.

## Project structure

```
src/
  App.tsx                app shell: screens, dialogs, toasts
  components/            screens (Home, History, Calendar, Settings) and dialogs
  hooks/                 app data (localStorage), today's date, hash routing
  i18n/                  translations (ar / he / en) and date formatting
  lib/                   dates, records, settings, service calculations, storage, backup
  lib/pdf/               PDF export (canvas + pdf-lib) and import (PDF.js)
public/                  icons
.github/workflows/       GitHub Pages deployment
```
