// Explicit imports so Vite's bundler treats each figure as a module asset:
// in a normal build it gets hashed into dist/assets/, and in the
// single-file build (vite-plugin-singlefile, assetsInlineLimit raised in
// vite.config.ts) it gets inlined as a data URL directly into the bundle.
// This keeps the "one file to drag into Netlify" deployment path working
// even now that real figures are bundled.
//
// The canonical, unmodified source copies (with the manifest describing
// provenance) live in /assets/figures/ at the project root -- see
// assets/figures/MANIFEST.md. These are working copies for the app build.

import faaLegend1SectionalChart from "../assets/figures/faa-legend1-sectional-chart.jpg";
import faaFig20SectionalExcerptNorfolk from "../assets/figures/faa-fig20-sectional-excerpt-norfolk.jpg";
import faaFig21SectionalExcerptNd from "../assets/figures/faa-fig21-sectional-excerpt-nd.jpg";
import faaFig22SectionalExcerptCoeurDalene from "../assets/figures/faa-fig22-sectional-excerpt-coeur-dalene.jpg";
import faaFig25SectionalExcerptDallas from "../assets/figures/faa-fig25-sectional-excerpt-dallas.jpg";
import faaFig75SectionalExcerptBuckeyeAz from "../assets/figures/faa-fig75-sectional-excerpt-buckeye-az.jpg";
import faaFig12Metar from "../assets/figures/faa-fig12-metar.jpg";
import faaFig2LoadFactorChart from "../assets/figures/faa-fig2-load-factor-chart.jpg";
import faaFig23SectionalExcerptSavannah from "../assets/figures/faa-fig23-sectional-excerpt-savannah.jpg";
import faaFig26SectionalExcerptNd from "../assets/figures/faa-fig26-sectional-excerpt-nd.jpg";
import faaFig59SectionalExcerptToledo from "../assets/figures/faa-fig59-sectional-excerpt-toledo.jpg";
import faaFig15Taf from "../assets/figures/faa-fig15-taf.jpg";
import faaFig17WindsTempsAloft from "../assets/figures/faa-fig17-winds-temps-aloft.jpg";
import faaFig8DensityAltitudeChart from "../assets/figures/faa-fig8-density-altitude-chart.jpg";

const FIGURE_MAP: Record<string, string> = {
  "faa-legend1-sectional-chart": faaLegend1SectionalChart,
  "faa-fig20-sectional-excerpt-norfolk": faaFig20SectionalExcerptNorfolk,
  "faa-fig21-sectional-excerpt-nd": faaFig21SectionalExcerptNd,
  "faa-fig22-sectional-excerpt-coeur-dalene": faaFig22SectionalExcerptCoeurDalene,
  "faa-fig25-sectional-excerpt-dallas": faaFig25SectionalExcerptDallas,
  "faa-fig75-sectional-excerpt-buckeye-az": faaFig75SectionalExcerptBuckeyeAz,
  "faa-fig12-metar": faaFig12Metar,
  "faa-fig2-load-factor-chart": faaFig2LoadFactorChart,
  "faa-fig23-sectional-excerpt-savannah": faaFig23SectionalExcerptSavannah,
  "faa-fig26-sectional-excerpt-nd": faaFig26SectionalExcerptNd,
  "faa-fig59-sectional-excerpt-toledo": faaFig59SectionalExcerptToledo,
  "faa-fig15-taf": faaFig15Taf,
  "faa-fig17-winds-temps-aloft": faaFig17WindsTempsAloft,
  "faa-fig8-density-altitude-chart": faaFig8DensityAltitudeChart,
};

export function figureSrc(figureId: string): string {
  return FIGURE_MAP[figureId] ?? "";
}
