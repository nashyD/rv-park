# Coosaw Landing — RV Resort Master Plan

An interactive 3D master plan and live business model for a proposed ~38.56-acre
waterfront RV resort near Beaufort, South Carolina (100–174 Airport Cir, 29906).

Built in the same style as **Carolina Ring**: real satellite imagery draped over the
parcel, a 3D site plan you can fly around, click-any-asset ROI cards, and an
interactive pro forma with scenario sliders.

## Run

No build step. Serve the folder with any static server:

```
cd coosaw-rv-resort
python3 -m http.server 5311
```

Then open <http://localhost:5311>. (VS Code: the `coosaw-rv` launch config does the same.)

Needs an internet connection on first load — it pulls Esri World Imagery map tiles
at runtime and stitches them into the ground texture.

## What you can do

- **Fly the site** — orbit/zoom, or use the camera presets (Aerial, Waterfront, Clubhouse, Glamping, Dock).
- **Toggle layouts** — switch between *My Sketch* (the hand-drawn pad plan) and *Optimized* (a clean, code-aware layout). Site count and the pro forma update live.
- **Click any pad or amenity** — see its type, cost, nightly rate, revenue contribution, and payback.
- **Pro Forma dashboard** — drag occupancy, nightly rate, opex, capex/site, cap rate, and financing; KPIs (NOI, value, yield-on-cost, payback, cash-on-cash) recompute instantly. Conservative / Base / Upside presets included.
- **Developer Brief** — a printable program table + financial rollup.

## Data & accuracy

- **Imagery:** Esri World Imagery (© Esri, Maxar, Earthstar Geographics).
- **Location:** centered on the Airport Circle upland on Lady's Island (~32.4088, −80.6305), with tidal-marsh / Coosaw frontage to the north and east and the county airport to the west. **The parcel boundary is digitized by hand from the survey plat and is approximate** — drop a Beaufort County GIS/APN or listing link to snap it to exact geometry. `1 scene unit = 1 meter`.
- **Survey overlay:** to register the hand-drawn plan against the 3D model, save the survey photo as `data/survey-plat.jpg`; the "Survey" toggle then drapes it over the ground. The toggle is hidden if the file is absent.
- **Financials:** an AACE Class-5 concept estimate in 2026 USD, pre-tax. Researched base case (coastal-SC comps); see the footnote in the Developer Brief on zoning (Beaufort County special-use permitting), FEMA flood zone, and Coosaw wetland permits. Concept plan — not for construction.

## Files

- `index.html` — UI shell + styles
- `js/app.js` — Three.js scene, layouts, interactions
- `js/data.js` — site, parcel, pad layouts, amenities, financials
- `js/proforma.js` — interactive pro forma engine + chart
- `data/` — drop the survey photo here as `survey-plat.jpg` to light up the "Survey" overlay toggle
