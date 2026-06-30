# Sea Island RV Resort — Master Plan

An interactive 3D master plan and live business model for a proposed ~25-acre RV
resort on Sea Island Parkway near Beaufort, South Carolina — the wooded infill
tract between the Walmart and Airport Circle (291 Sea Island Pkwy + adjacent
acreage, 29907).

Built in the same style as **Carolina Ring**: real satellite imagery draped over the
parcel, a 3D site plan you can fly around, click-any-asset ROI cards, and an
interactive pro forma with scenario sliders.

## Run

No build step. Serve the folder with any static server:

```
cd rv-park
python3 -m http.server 5311
```

Then open <http://localhost:5311>. (VS Code: the `rv-park` launch config does the same.)

Needs an internet connection on first load — it pulls Esri World Imagery map tiles
at runtime and stitches them into the ground texture.

## What you can do

- **Fly the site** — orbit/zoom, or use the camera presets (Aerial, Entrance, Resort core, Premium row, Glamping, Fishing pond).
- **Toggle layouts** — switch between *Optimized* (roomier, ~77 sites) and *Max density* (~91 sites). Site count and the pro forma update live.
- **Click any pad or amenity** — see its type, cost, nightly rate, revenue contribution, and payback.
- **Pro Forma dashboard** — drag occupancy, nightly rate, opex, capex/site, cap rate, and financing; KPIs (NOI, value, yield-on-cost, payback, cash-on-cash) recompute instantly. Conservative / Base / Upside presets included.
- **Developer Brief** — a printable program table + financial rollup.

## Data & accuracy

- **Imagery:** Esri World Imagery (© Esri, Maxar, Earthstar Geographics).
- **Location:** centered on the wooded lot between the Walmart and Airport Circle on Lady's Island (~32.4062, −80.6306), with Sea Island Parkway (US-21) and tidal marsh to the south, the airport to the north, and the Walmart commercial corner to the west. **The boundary is digitized by hand and is approximate (~25 ac assemblage)** — drop a Beaufort County GIS/APN or listing link to snap it to exact geometry. `1 scene unit = 1 meter`.
- **Survey overlay:** save a site survey/plat photo as `data/survey-plat.jpg` and the "Survey" toggle drapes it over the ground. The toggle is hidden if the file is absent.
- **Financials:** an AACE Class-5 concept estimate in 2026 USD, pre-tax. Researched base case (coastal-SC comps); see the footnote in the Developer Brief on zoning (Beaufort County special-use / campground permitting), the FEMA flood zone, and wetland buffers along the marsh. Land is an assemblage assumption ($1.1M for 291 Sea Island + ~18 surrounding acres). Concept plan — not for construction.

## Files

- `index.html` — UI shell + styles
- `js/app.js` — Three.js scene, layouts, interactions
- `js/data.js` — site, parcel, pad layouts, amenities, financials
- `js/proforma.js` — interactive pro forma engine + chart
- `data/` — drop the survey photo here as `survey-plat.jpg` to light up the "Survey" overlay toggle
