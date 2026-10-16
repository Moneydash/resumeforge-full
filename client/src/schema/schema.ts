import * as yup from 'yup';
import { stringToArray } from '@/utils/helper';
import { MAX_TITLE_LENGTH } from '@/utils/section-titles';

const schema = yup.object({
  personal: yup.object({
    name: yup.string().required('Name is required'),
    headline: yup.string().optional(),
    contact_number: yup.string().required(),
    email: yup.string().email('Invalid email').required('Email is required'),
    website: yup.object({
      name: yup.string(),
      link: yup.string().url('Invalid URL'),
    }).optional(),
    location: yup.string().required("Location is required!"),
  }).required('Personal information is required'),
  socials: yup.array().of(yup.object({
    name: yup.string().required("Name is required!"),
    link: yup.string().required("Link is required!"),
    slug: yup.string().required("Slug is required!"),
  })).optional(),
  summary: yup.string().optional(),
  experience: yup.array().of(yup.object({
    title: yup.string().required('Title is required'),
    company: yup.string().required('Company is required'),
    startDate: yup.string().required('Start date is required'),
    endDate: yup.string(),
    description: yup.string(),
  })).optional(),
  education: yup.array().of(yup.object({
    degree: yup.string().required('Degree is required'),
    institution: yup.string().required('Institution is required'),
    startDate: yup.string().required('Start date is required'),
    endDate: yup.string().optional(),
  })).required("Education is required!"),
  skills: yup.array().of(yup.object({
    name: yup.string().required('Skill name is required'),
    keywords: yup.mixed().transform(stringToArray).optional(),
  })),
  languages: yup.mixed().transform(stringToArray).optional(),
  awards: yup.array().of(yup.object({
    title: yup.string().required('Title is required'),
    date: yup.string().required('Date is required'),
    description: yup.string(),
  })).optional(),
  certifications: yup.array().of(yup.object({
    name: yup.string().required('Name is required'),
    issuingOrganization: yup.string().required('Organization is required'),
    date: yup.string().required('Date is required'),
  })).optional(),
  interests: yup.mixed().transform(stringToArray).optional(),
  projects: yup.array().of(yup.object({
    title: yup.string().required('Title is required'),
    description: yup.string(),
    technologies: yup.mixed().transform(stringToArray),
  })).optional(),
  references: yup.array().of(yup.object({
    name: yup.string().required('Name is required'),
    title: yup.string().required('Title is required'),
    company: yup.string().required('Company is required'),
    email: yup.string().email('Invalid email').optional(),
    phone: yup.string().optional().matches(/^[0-9\-\+]+$/, { message: 'Invalid phone number', excludeEmptyString: true }),
  })),
  customSections: yup.array().of(yup.object({
    id: yup.string().required(),
    title: yup.string().trim().required('Section name is required').max(MAX_TITLE_LENGTH, `Keep it under ${MAX_TITLE_LENGTH} characters`),
    entries: yup.array().of(yup.object({
      title: yup.string().required('Title is required'),
      description: yup.string(),
      startDate: yup.string().required('Start date is required'),
      hasEndDate: yup.boolean().required(),
      stillOngoing: yup.boolean().required(),
      endDate: yup.string().when(['hasEndDate', 'stillOngoing'], {
        is: (hasEndDate: boolean, stillOngoing: boolean) => hasEndDate && !stillOngoing,
        then: (field) => field
          .required('End date is required')
          // "YYYY-MM" strings compare correctly as text
          .test('after-start', 'End date cannot be before the start date', function (value) {
            return !value || !this.parent.startDate || value >= this.parent.startDate;
          }),
      }),
    })).required(),
  })).optional(),
}).required();

export default schema;