import type { ResumeFormData } from "@/types/interface.resume-form-data";

/** A resume with every section populated and nothing hidden. */
export const makeSampleResume = (experienceCount: number): ResumeFormData => ({
  personal: {
    name: "Ada Lovelace",
    headline: "Software Engineer",
    contact_number: "09123456789",
    email: "ada@example.com",
    website: { name: "Portfolio", link: "https://example.com" },
    location: "London",
  },
  socials: [
    { name: "GitHub", link: "https://github.com/ada", slug: "github" },
    { name: "LinkedIn", link: "https://linkedin.com/in/ada", slug: "linkedin" },
  ],
  summary: "Engineer who builds analytical engines.",
  experience: Array.from({ length: experienceCount }, (_, i) => ({
    title: `Role ${i + 1}`,
    company: `Company ${i + 1}`,
    startDate: "2020-01",
    endDate: "2021-01",
    description: `Did thing ${i + 1}.`,
  })),
  education: [{ degree: "BSc Mathematics", institution: "University", startDate: "2015-01", endDate: "2019-01" }],
  skills: [{ name: "Languages", keywords: ["TypeScript", "Rust"] }],
  languages: ["English", "French"],
  awards: [{ title: "Award One", date: "2022-01", description: "For work." }],
  certifications: [{ name: "Cert One", issuingOrganization: "Org", date: "2022-02" }],
  interests: ["Chess", "Music"],
  projects: [{ title: "Project One", description: "A project.", technologies: ["React", "Node"] }],
  references: [{ name: "Ref Person", title: "Manager", company: "Company 1", email: "ref@example.com", phone: "0999" }],
});
