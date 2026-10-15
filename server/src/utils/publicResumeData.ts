// The editor keeps hidden items (`hidden: true`) and switched-off sections (`hiddenSections`) inside
// resume_data and only skips them when drawing. The public endpoint sends raw data to anyone with the
// link, so hidden content is removed here before it leaves the server.
export function stripHiddenContent(resumeData: string | null | undefined): string | null {
  if (resumeData == null) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(resumeData);
  } catch {
    return resumeData;
  }
  if (!parsed || typeof parsed !== 'object') return resumeData;

  const hiddenSections = Array.isArray(parsed.hiddenSections) ? (parsed.hiddenSections as string[]) : [];

  for (const key of Object.keys(parsed)) {
    const value = parsed[key];
    if (hiddenSections.includes(key)) {
      if (Array.isArray(value)) parsed[key] = [];
      else delete parsed[key];
    } else if (Array.isArray(value)) {
      parsed[key] = value.filter((item) => !(item && typeof item === 'object' && (item as { hidden?: unknown }).hidden === true));
    }
  }

  return JSON.stringify(parsed);
}
