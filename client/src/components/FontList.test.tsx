import { describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { FontList } from "@/components/FontList";
import { FONTS } from "@/utils/fonts";

const render = (over: Partial<ComponentProps<typeof FontList>> = {}) =>
  renderToString(
    <FontList activeId="lexend-deca" defaultId="lexend-deca" canReset={false} isDarkMode={false} onPick={() => {}} onReset={() => {}} {...over} />,
  );

describe("FontList", () => {
  it("lists every registry entry", () => {
    const html = render();
    FONTS.forEach((f) => expect(html).toContain(f.name));
  });

  it("groups the entries as Sans, Serif and Pairings", () => {
    const html = render();
    expect(html.indexOf('>Sans<')).toBeLessThan(html.indexOf('>Serif<'));
    expect(html.indexOf('>Serif<')).toBeLessThan(html.indexOf('>Pairings<'));
  });

  it("marks exactly one entry active", () => {
    const html = render({ activeId: 'inter' });
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it("badges only the template default", () => {
    const html = render({ defaultId: 'geist' });
    expect(html.match(/Template default/g)).toHaveLength(1);
  });

  it("shows the pairing's heading and body fonts", () => {
    const html = render();
    expect(html).toContain('Cinzel headings');
    expect(html).toContain('DM Serif Text body');
  });

  it("offers reset only when there is a saved choice", () => {
    expect(render({ canReset: false })).not.toContain('Reset to template default');
    expect(render({ canReset: true })).toContain('Reset to template default');
  });
});
