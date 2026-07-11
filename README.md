# CMS – CTW

Local admin prototype (Menu Management / Content Management / drag-and-drop Page Editor) that now runs as a real local web app instead of a static mockup — every save writes straight back into `index.html`.

## Run it

```bash
node server.js
```

Then open **http://localhost:3000** in your browser. No `npm install` needed — the server uses only Node's built-in modules.

## How saving works

- All app state (pages, translations, status, activity log, and each page's editor sections) lives inside `index.html`, between the markers:
  ```
  /* DATA:START ... */
  ...
  /* DATA:END */
  ```
- Every time you change something in the UI — create/edit/delete a page, toggle Publish/Draft, drag to reorder, or add/edit/delete a section in the Page Editor — the browser calls `POST /api/save`, and the server rewrites that block **in place** inside `index.html` on disk.
- Because the file itself is the database, closing the server and reopening `index.html` directly (or restarting the server) shows exactly what you last saved. No separate database or JSON file to keep in sync.
- Don't hand-edit the code between the `DATA:START` / `DATA:END` markers — it gets regenerated on every save. Everything else in the file (styling, layout, editor logic) is yours to keep customizing.

## What changed from the original static mockup

- Each **Content Management** page now owns its own `sections` array (previously the Page Editor used one shared, non-persistent list regardless of which page you opened).
- Opening the Page Editor loads that page's saved sections; every add/edit/delete/save writes them back to that page and triggers a save.
- Added a small "กำลังบันทึก... / บันทึกแล้ว" indicator in the top bar.
- Menu/Content page create, edit, delete, status toggle, and drag-reorder all now persist too.

## Notes

- If you see "ออฟไลน์ — บันทึกไม่สำเร็จ" in the save indicator, it means the page isn't being served by `node server.js` (e.g. you opened `index.html` directly by double-clicking it) — start the server and reload from `http://localhost:3000`.
- To deploy this "online" beyond your own machine, this same `server.js` can run on any Node host — just be aware writes go to that host's copy of `index.html`, so treat the deployed file as the single source of truth (or swap the save handler for a real database once you're ready to go multi-user).
