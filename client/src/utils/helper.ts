import client from "@/api/axiosInstance";
import type { CLTemplateType, TemplateType } from "@/types";
import React from "react";

// Function to format dates from YYYY-MM to Month YYYY format
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Present';

  try {
    // Handle YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      const [year, month] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Handle YYYY format (just the year)
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }

    // Return as is if it's already formatted or in a different format
    return dateString;
  } catch (error) {
    // Return original string if there's an error in parsing
    return dateString;
  }
};

export const parseMonthYear = (dateString: string): string => {
  if (!dateString) return '';

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString; // for invalid dates

  let month = d.toLocaleDateString('default', { month: 'long' });
  let year = d.getFullYear();

  dateString = `${month} ${year}`

  // If not matched, return original string
  return dateString;
};

export const stringToArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  return [];
};

export const pdfPayload = (data: object, htmlContent: string, template: TemplateType | CLTemplateType) => {
  const fullHtml = `
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resume</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `

  const payload = {
    html: fullHtml,
    data: data,
    template: template
  }

  return payload;
};

export const pdfPayloadv2 = (data: object, htmlContent: string, template: TemplateType | CLTemplateType) => {
  const payload = {
    html: htmlContent,
    data: data,
    template: template
  }

  return payload;
};

export const getCsrfToken = async () => {
  try {
    const response = await client.get('/csrf-token');
    client.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

// for dashboard date card display
export const formatDateDisplay = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatText = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  return lines.map((line, index) =>
    React.createElement(
      React.Fragment,
      { key: index },
      line,
      index < lines.length - 1 ? React.createElement('br') : null
    )
  );
};

export const formatTemplateName = (template: string) => {
  return template.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const slugify = (value: string) => {
  return value
    .replace(/[^a-zA-Z0-9_]+(?=[a-zA-Z0-9])/g, '-')
    .toLowerCase();
};