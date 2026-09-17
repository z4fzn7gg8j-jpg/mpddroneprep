# Figure asset manifest

Seven figures are bundled, extracted from the official FAA **Airman
Knowledge Testing Supplement for Sport Pilot, Recreational Pilot, Remote
Pilot, and Private Pilot** (2018 edition) -- a document that explicitly
covers Unmanned Aircraft General (UAG), i.e. the Part 107 initial test.
The source PDF was provided directly by the department; it was not
downloaded from a URL as part of this work, so `sourceUrl` below points
to the FAA's general testing resources page rather than a specific link
to that exact PDF -- confirm the current direct link yourself before
publishing this manifest externally.

**Reuse basis:** this is a U.S. federal government work product (FAA,
produced for public administration of airman knowledge tests) and is
treated as public domain / free of copyright restriction under 17 U.S.C.
§105, consistent with the FAA's own practice of distributing this exact
supplement for test-preparation use. No additional license was granted
or needed beyond that.

## Required fields per figure (matches `FigureRef` in `src/lib/types.ts`)

| Field | Description |
|---|---|
| `figureId` | Stable id, matches the filename stem |
| `title` | Human-readable title, matches the FAA's own figure caption |
| `editionOrDate` | The FAA/source publication's edition or date, preserved exactly |
| `sourceUrl` | Where it was obtained |
| `isHistoricalTrainingCopy` | `true` for every figure here -- all are rendered with an on-screen "training material... not for real-world navigation" notice by `FigureViewer.tsx` |

## Entries

| figureId | Title | Used by | File |
|---|---|---|---|
| `faa-legend1-sectional-chart` | Legend 1. Sectional Aeronautical Chart | AIR-0004, AIR-0008 | `faa-legend1-sectional-chart.jpg` |
| `faa-fig8-density-altitude-chart` | Figure 8. Density Altitude Chart | WX-0004 (illustrative) | `faa-fig8-density-altitude-chart.jpg` |
| `faa-fig12-metar` | Figure 12. Aviation Routine Weather Reports (METAR) | WX-0008 | `faa-fig12-metar.jpg` |
| `faa-fig15-taf` | Figure 15. Terminal Aerodrome Forecasts (TAF) | WX-0009 | `faa-fig15-taf.jpg` |
| `faa-fig17-winds-temps-aloft` | Figure 17. Winds and Temperatures Aloft Forecast | WX-0010 | `faa-fig17-winds-temps-aloft.jpg` |
| `faa-fig20-sectional-excerpt-norfolk` | Figure 20. Sectional Chart Excerpt (Norfolk, VA area) | AIR-0011 | `faa-fig20-sectional-excerpt-norfolk.jpg` |
| `faa-fig21-sectional-excerpt-nd` | Figure 21. Sectional Chart Excerpt (north-central North Dakota) | AIR-0012 | `faa-fig21-sectional-excerpt-nd.jpg` |
| `faa-fig22-sectional-excerpt-coeur-dalene` | Figure 22. Sectional Chart Excerpt (Coeur d'Alene, ID area) | AIR-0013, AIR-0014 | `faa-fig22-sectional-excerpt-coeur-dalene.jpg` |
| `faa-fig75-sectional-excerpt-buckeye-az` | Figure 75. Sectional Chart Excerpt (Buckeye/Gila Bend, AZ area) | AIR-0015, AIR-0016 | `faa-fig75-sectional-excerpt-buckeye-az.jpg` |
| `faa-fig26-sectional-excerpt-nd` | Figure 26. Sectional Chart Excerpt (Cooperstown/Jamestown, ND area) | 4 questions | `faa-fig26-sectional-excerpt-nd.jpg` |
| `faa-fig59-sectional-excerpt-toledo` | Figure 59. Sectional Chart Excerpt (Toledo, OH area) | 1 question | `faa-fig59-sectional-excerpt-toledo.jpg` |
| `faa-fig2-load-factor-chart` | Figure 2. Load Factor Chart | 2 questions | `faa-fig2-load-factor-chart.jpg` |
| `faa-fig23-sectional-excerpt-savannah` | Figure 23. Sectional Chart Excerpt (Savannah, GA area) | 2 questions | `faa-fig23-sectional-excerpt-savannah.jpg` |
| `faa-fig25-sectional-excerpt-dallas` | Figure 25. Sectional Chart Excerpt (Dallas/Fort Worth, TX area) | 1 question | `faa-fig25-sectional-excerpt-dallas.jpg` |

Each file exists in two places, which must be kept in sync by hand if you
replace or add a figure:
- `assets/figures/` (here) -- canonical source copy alongside this manifest
- `src/assets/figures/` -- the working copy the app actually imports (see
  `src/lib/figures.ts`); Vite needs the file inside `src/` to bundle and
  inline it

**Currency caveat:** the source document is dated 2018. Sectional chart
symbology and the specific station data shown (airport identifiers,
frequencies, METAR/TAF sample data) are for test-preparation illustration
only -- confirm against the FAA's current AKTS edition before relying on
exact symbol currency.

## Process for adding another figure

1. Obtain the figure from a current, authoritative FAA source (this same
   AKTS document has 113 pages covering many more figures than the seven
   used so far -- see the table of contents; most of the rest apply to
   other certificates, not UAG).
2. Rasterize the source page (`pdftoppm -jpeg -r 150-220 -f N -l N`), or
   otherwise obtain the image; confirm reuse terms here first if the
   source isn't the same public-domain FAA document.
3. Save it under both `assets/figures/<figureId>.jpg` and
   `src/assets/figures/<figureId>.jpg`.
4. Add a row to the table above.
5. Add the import + map entry in `src/lib/figures.ts`.
6. Reference `figureId` from the relevant question's `figure` field in
   `src/data/questions.json`, and set that question's `status` to
   `published` only once steps 3-5 are done -- `questionBank.test.ts`
   will fail the build if a published question's figure still carries a
   "not yet sourced" placeholder string.
7. Never generate a sectional chart, METAR, or other figure with AI --
   spec section 5 prohibits this explicitly.
