import React from "react";
import type { SectionId } from "@/utils/section-layout";

export type SectionMap = Partial<Record<SectionId, React.ReactNode>>;

export const renderSections = (ids: SectionId[], sections: SectionMap): React.ReactNode[] =>
  ids.map((id) => <React.Fragment key={id}>{sections[id]}</React.Fragment>);
