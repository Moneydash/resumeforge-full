export interface ResumeFormData {
  personal: {
    name: string;
    headline?: string;
    contact_number: string;
    email: string;
    website: {
      name: string;
      link: string;
    };
    location?: string;
  };
  socials: Array<{
    name: string;
    link: string;
    slug: string;
  }>;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
    hidden?: boolean;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    startDate: string;
    endDate?: string;
    hidden?: boolean;
  }>;
  skills: Array<{
    name: string;
    keywords: string[];
    hidden?: boolean;
  }>;
  languages?: string[];
  awards: Array<{
    title: string;
    date: string;
    description?: string;
    hidden?: boolean;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    date: string;
    hidden?: boolean;
  }>;
  interests?: string[];
  projects: Array<{
    title: string;
    description?: string;
    technologies: string[];
    hidden?: boolean;
  }>;
  references: Array<{
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    hidden?: boolean;
  }>;
}