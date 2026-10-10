// Small (about 280px wide, top of the page) previews for the in-editor template picker.
// The full-size snapshots on the Templates pages are several hundred KB each; these are about 20 KB.
import andromeda from "@/assets/template-thumbs/andromeda.jpg";
import cigar from "@/assets/template-thumbs/cigar.jpg";
import comet from "@/assets/template-thumbs/comet.jpg";
import milkyWay from "@/assets/template-thumbs/milky_way.jpg";
import apollo from "@/assets/template-thumbs/apollo.jpg";
import artemis from "@/assets/template-thumbs/artemis.jpg";
import athena from "@/assets/template-thumbs/athena.jpg";
import hera from "@/assets/template-thumbs/hera.jpg";
import hermes from "@/assets/template-thumbs/hermes.jpg";
import zeus from "@/assets/template-thumbs/zeus.jpg";
import aether from "@/assets/template-thumbs/aether.jpg";
import aqua from "@/assets/template-thumbs/aqua.jpg";
import ignis from "@/assets/template-thumbs/ignis.jpg";
import terra from "@/assets/template-thumbs/terra.jpg";
import ventus from "@/assets/template-thumbs/ventus.jpg";

export const TEMPLATE_THUMBS: Record<string, string> = {
  andromeda, cigar, comet, milky_way: milkyWay, apollo, artemis, athena, hera, hermes, zeus,
  aether, aqua, ignis, terra, ventus,
};
