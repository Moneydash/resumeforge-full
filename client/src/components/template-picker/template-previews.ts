// Medium previews (about 560px wide, generated from the full-size snapshots) for the template pickers.
// Resume template ids and cover letter template ids never collide, so one map serves both pages.
import andromeda from '@/assets/template-previews/andromeda.jpg';
import cigar from '@/assets/template-previews/cigar.jpg';
import comet from '@/assets/template-previews/comet.jpg';
import milkyWay from '@/assets/template-previews/milky_way.jpg';
import apollo from '@/assets/template-previews/apollo.jpg';
import artemis from '@/assets/template-previews/artemis.jpg';
import athena from '@/assets/template-previews/athena.jpg';
import hera from '@/assets/template-previews/hera.jpg';
import hermes from '@/assets/template-previews/hermes.jpg';
import zeus from '@/assets/template-previews/zeus.jpg';
import aether from '@/assets/template-previews/aether.jpg';
import aqua from '@/assets/template-previews/aqua.jpg';
import ignis from '@/assets/template-previews/ignis.jpg';
import terra from '@/assets/template-previews/terra.jpg';
import ventus from '@/assets/template-previews/ventus.jpg';

export const TEMPLATE_PREVIEWS: Record<string, string> = {
  andromeda,
  cigar,
  comet,
  milky_way: milkyWay,
  apollo,
  artemis,
  athena,
  hera,
  hermes,
  zeus,
  aether,
  aqua,
  ignis,
  terra,
  ventus,
};
