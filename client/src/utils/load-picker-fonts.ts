import { FONTS } from "@/utils/fonts";

// The font list previews every font in its own typeface; load them only once it is first shown.
let fontsRequested = false;

export const ensurePickerFontsLoaded = () => {
  if (fontsRequested || typeof document === "undefined") return;
  fontsRequested = true;
  new Set(FONTS.flatMap((f) => f.googleHrefs)).forEach((href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });
};
