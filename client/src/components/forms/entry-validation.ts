import type { UseFormTrigger } from 'react-hook-form';
import type { ResumeFormData } from '@/types/interface.resume-form-data';

type EntrySection = 'experience' | 'education' | 'skills' | 'projects' | 'awards' | 'certifications' | 'references';

// Runs validation for one entry of a repeating section (shows its errors); true when it is valid.
export const validateEntry = (trigger: UseFormTrigger<ResumeFormData>, section: EntrySection, index: number): Promise<boolean> =>
  trigger(`${section}.${index}` as `experience.${number}`);
