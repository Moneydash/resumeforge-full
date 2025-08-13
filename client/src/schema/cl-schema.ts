import * as yup from 'yup';

// cover letter schema
const clSchema = yup.object({
  // sender information
  sender: yup.object({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    phone: yup.string().required('Phone is required'),
    address: yup.string().required('Address is required'),
    location: yup.string().required('Location is required'),
    linkedin: yup.string().optional(),
    job_title: yup.string().required('Job title is required'),
  }),

  // recipient information
  recipient: yup.object({
    name: yup.string().required('Recipient name is required'),
    title: yup.string().required('Recipient title is required'),
    company: yup.string().required('Recipient company is required'),
    address: yup.string().required('Recipient address is required'),
  }),

  // cover letter content
  content: yup.object({
    introduction: yup.string().required('Introduction is required'),
    body: yup.string().required('Body is required'),
    closing: yup.string().optional(),
  })
});

export default clSchema;