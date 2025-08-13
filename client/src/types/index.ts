/**
 * Interfaces and types related to resume functionality.
 *
 * This file contains a collection of small or minimal interfaces that are
 * all part of the resume domain. Instead of spreading them across multiple
 * files, they are grouped here for easier maintenance and better context.
 *
 * Use this file when working with resume creation, display, editing,
 * and related data models.
 */

/**
 * @file index.ts
 * @description
 *   This file defines all TypeScript interfaces and types used in the resume module.
 *   Includes reusable, minimal interfaces grouped by their shared purpose.
 */

import type { CLFormData } from "./interface.cl-form-data";
import type { ResumeFormData } from "./interface.resume-form-data";

export interface TemplateProps {
  data: ResumeFormData;
};

export interface Template {
  id: string;
  name: string;
  description: string;
  preview?: string;
  features: string[];
  category: string;
  color: string;
  theme: 'galaxy' | 'greek' | 'elements';
  icon?: string;
  available: boolean;
}

// not an interface but related to templates
export type TemplateType = 'cigar'
  | 'andromeda'
  | 'comet'
  | 'milky_way'
  | 'zeus'
  | 'athena'
  | 'apollo'
  | 'artemis'
  | 'hermes'
  | 'hera';

export interface ResumeSummary {
  id: string;
  resume_name: string;
  resume_slug_name: string;
  template: string;
  updated_at: string;
};

export interface CLTemplateProps {
  data: CLFormData;
};

export type CLTemplateType = 'aether'
  | 'terra'
  | 'aqua'
  | 'ignis'
  | 'ventus'