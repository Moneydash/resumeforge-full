import { describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import ColorPanel from "@/components/ColorPanel";
import { PALETTE, type ColorTheme } from "@/utils/color-theme";

const noop = () => {};
const render = (over: Partial<ComponentProps<typeof ColorPanel>> = {}) =>
  renderToString(<ColorPanel template="andromeda" theme={undefined} onChange={noop} isDarkMode={false} {...over} />);

describe("ColorPanel", () => {
  it("andromeda: only a Primary section labelled Header", () => {
    const html = render({ template: "andromeda" });
    expect(html).toContain("Primary");
    expect(html).toContain("Header");
    expect(html).not.toContain("Secondary");
  });

  it("athena: Primary section labelled Sidebar, no secondary", () => {
    const html = render({ template: "athena" });
    expect(html).toContain("Sidebar");
    expect(html).not.toContain("Secondary");
  });

  it("zeus: Primary (Header) and Secondary (Accents)", () => {
    const html = render({ template: "zeus" });
    expect(html).toContain("Primary");
    expect(html).toContain("Secondary");
    expect(html).toContain("Accents");
  });

  it("artemis: Secondary is the Sidebar", () => {
    const html = render({ template: "artemis" });
    expect(html).toContain("Secondary");
    expect(html).toContain("Sidebar");
  });

  it("offers Default, all 8 palette swatches and Custom for the primary", () => {
    const html = render({ template: "andromeda" });
    expect(html).toContain('aria-label="Default"');
    PALETTE.forEach((c) => expect(html).toContain(`aria-label="${c.name}"`));
    expect(html).toContain('aria-label="Custom"');
  });

  it("marks Default active when nothing is set, and exactly the picked swatch when one is", () => {
    expect(render().match(/aria-label="Default"[^>]*aria-pressed="true"/)).not.toBeNull();
    const theme: ColorTheme = { template: "andromeda", primary: { type: "solid", color: "#2563eb" } };
    const html = render({ theme });
    expect(html.match(/aria-label="Blue"[^>]*aria-pressed="true"/)).not.toBeNull();
    expect(html.match(/aria-label="Navy"[^>]*aria-pressed="true"/)).toBeNull();
    expect(html.match(/aria-label="Default"[^>]*aria-pressed="true"/)).toBeNull();
  });

  it("shows Solid and Gradient modes; direction and stop controls only for a gradient", () => {
    const solid = render();
    expect(solid).toContain("Solid");
    expect(solid).toContain("Gradient");
    expect(solid).not.toContain('aria-label="Horizontal"');
    const theme: ColorTheme = { template: "andromeda", primary: { type: "gradient", from: "#1e3a8a", to: "#be123c", direction: "diagonal" } };
    const grad = render({ theme });
    ["Horizontal", "Diagonal", "Vertical"].forEach((d) => expect(grad).toContain(`aria-label="${d}"`));
    expect(grad).toContain("Start");
    expect(grad).toContain("End");
    expect(grad.match(/aria-label="Diagonal"[^>]*aria-pressed="true"/)).not.toBeNull();
  });

  it("enables Reset all colors only when a choice is saved for this template", () => {
    // shadcn buttons always carry a "disabled:" utility class, so match the attribute itself
    const resetDisabled = (html: string) => /<button[^>]*\sdisabled=""[^>]*>(?:<[^>]*>)*Reset all colors/.test(html);
    expect(render()).toContain("Reset all colors");
    expect(resetDisabled(render())).toBe(true);
    const theme: ColorTheme = { template: "andromeda", primary: { type: "solid", color: "#2563eb" } };
    expect(resetDisabled(render({ theme }))).toBe(false);
    const other: ColorTheme = { template: "zeus", primary: { type: "solid", color: "#2563eb" } };
    expect(resetDisabled(render({ theme: other }))).toBe(true); // a theme saved for another template does not count
  });
});
