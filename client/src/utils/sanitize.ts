import DOMPurify from 'dompurify';

/**
 * Sanitizes a string to prevent XSS attacks
 * Removes dangerous HTML tags and attributes
 */
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty || typeof dirty !== 'string') return '';
  
  // Configure DOMPurify to be more strict
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true
  };
  
  return DOMPurify.sanitize(dirty, config);
};

/**
 * Sanitizes plain text input by escaping HTML entities
 */
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes URL to prevent javascript: and data: protocols
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  // Remove whitespace and convert to lowercase for checking
  const cleanUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (cleanUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  // Ensure URL starts with http://, https://, or is a relative path
  if (!cleanUrl.startsWith('http://') && 
      !cleanUrl.startsWith('https://') && 
      !cleanUrl.startsWith('/') &&
      !cleanUrl.startsWith('#') &&
      !cleanUrl.startsWith('mailto:')) {
    return 'https://' + url.trim();
  }
  
  return url.trim();
};

/**
 * Sanitizes email addresses
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  // Basic email validation and sanitization
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const trimmedEmail = email.trim().toLowerCase();
  
  return emailRegex.test(trimmedEmail) ? trimmedEmail : '';
};

/**
 * Sanitizes phone numbers by removing non-numeric characters
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Keep only numbers, spaces, hyphens, parentheses, and plus sign
  return phone.replace(/[^0-9\s\-()+ ]/g, '').trim();
};

/**
 * Deep sanitizes an object by recursively sanitizing all string values
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize the key as well to prevent prototype pollution
        const sanitizedKey = sanitizeText(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Sanitizes resume data specifically
 */
export const sanitizeResumeData = (data: any): any => {
  if (!data) return {};
  
  const sanitized = { ...data };
  
  // Sanitize personal information
  if (sanitized.personal) {
    sanitized.personal = {
      ...sanitized.personal,
      name: sanitizeText(sanitized.personal.name || ''),
      email: sanitizeEmail(sanitized.personal.email || ''),
      phone: sanitizePhone(sanitized.personal.phone || ''),
      location: sanitizeText(sanitized.personal.location || ''),
      website: sanitizeUrl(sanitized.personal.website || ''),
      linkedin: sanitizeUrl(sanitized.personal.linkedin || ''),
      github: sanitizeUrl(sanitized.personal.github || ''),
      summary: sanitizeText(sanitized.personal.summary || '')
    };
  }
  
  // Sanitize experience
  if (sanitized.experience && Array.isArray(sanitized.experience)) {
    sanitized.experience = sanitized.experience.map((exp: any) => ({
      ...exp,
      company: sanitizeText(exp.company || ''),
      position: sanitizeText(exp.position || ''),
      location: sanitizeText(exp.location || ''),
      startDate: sanitizeText(exp.startDate || ''),
      endDate: sanitizeText(exp.endDate || ''),
      description: sanitizeText(exp.description || ''),
      achievements: Array.isArray(exp.achievements) 
        ? exp.achievements.map((a: string) => sanitizeText(a))
        : []
    }));
  }
  
  // Sanitize education
  if (sanitized.education && Array.isArray(sanitized.education)) {
    sanitized.education = sanitized.education.map((edu: any) => ({
      ...edu,
      institution: sanitizeText(edu.institution || ''),
      degree: sanitizeText(edu.degree || ''),
      field: sanitizeText(edu.field || ''),
      location: sanitizeText(edu.location || ''),
      startDate: sanitizeText(edu.startDate || ''),
      endDate: sanitizeText(edu.endDate || ''),
      gpa: sanitizeText(edu.gpa || ''),
      achievements: Array.isArray(edu.achievements)
        ? edu.achievements.map((a: string) => sanitizeText(a))
        : []
    }));
  }
  
  // Sanitize skills
  if (sanitized.skills && Array.isArray(sanitized.skills)) {
    sanitized.skills = sanitized.skills.map((skill: any) => ({
      ...skill,
      category: sanitizeText(skill.category || ''),
      items: Array.isArray(skill.items)
        ? skill.items.map((item: string) => sanitizeText(item))
        : []
    }));
  }
  
  // Sanitize projects
  if (sanitized.projects && Array.isArray(sanitized.projects)) {
    sanitized.projects = sanitized.projects.map((project: any) => ({
      ...project,
      name: sanitizeText(project.name || ''),
      description: sanitizeText(project.description || ''),
      technologies: Array.isArray(project.technologies)
        ? project.technologies.map((tech: string) => sanitizeText(tech))
        : [],
      link: sanitizeUrl(project.link || ''),
      github: sanitizeUrl(project.github || '')
    }));
  }
  
  // Sanitize certifications
  if (sanitized.certifications && Array.isArray(sanitized.certifications)) {
    sanitized.certifications = sanitized.certifications.map((cert: any) => ({
      ...cert,
      name: sanitizeText(cert.name || ''),
      issuer: sanitizeText(cert.issuer || ''),
      date: sanitizeText(cert.date || ''),
      expiry: sanitizeText(cert.expiry || ''),
      credentialId: sanitizeText(cert.credentialId || ''),
      link: sanitizeUrl(cert.link || '')
    }));
  }
  
  // Sanitize languages
  if (sanitized.languages && Array.isArray(sanitized.languages)) {
    sanitized.languages = sanitized.languages.map((lang: any) => ({
      ...lang,
      language: sanitizeText(lang.language || ''),
      proficiency: sanitizeText(lang.proficiency || '')
    }));
  }
  
  // Sanitize any other custom fields
  for (const key in sanitized) {
    if (!['personal', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'].includes(key)) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  
  return sanitized;
};

/**
 * Validates and sanitizes the entire payload before sending to backend
 */
export const sanitizePayload = (payload: any): any => {
  if (!payload) return {};
  
  const sanitized: any = {};
  
  // Sanitize HTML content if present
  if (payload.html) {
    // For HTML content, we use a lighter sanitization since it's already rendered
    sanitized.html = sanitizeHtml(payload.html);
  }
  
  // Sanitize resume data
  if (payload.data) {
    sanitized.data = sanitizeResumeData(payload.data);
  }
  
  // Sanitize template name
  if (payload.template) {
    // Only allow alphanumeric characters and hyphens for template names
    sanitized.template = payload.template.replace(/[^a-zA-Z0-9-]/g, '');
  }
  
  // Remove any unexpected fields to prevent injection attacks
  const allowedFields = ['html', 'data', 'template'];
  for (const key in payload) {
    if (!allowedFields.includes(key)) {
      console.warn(`Removing unexpected field from payload: ${key}`);
    }
  }
  
  return sanitized;
};

/**
 * Validates payload size to prevent DoS attacks
 */
export const validatePayloadSize = (payload: any): boolean => {
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB limit
  const payloadString = JSON.stringify(payload);
  const sizeInBytes = new Blob([payloadString]).size;
  
  if (sizeInBytes > maxSizeInBytes) {
    console.error(`Payload size (${sizeInBytes} bytes) exceeds maximum allowed size (${maxSizeInBytes} bytes)`);
    return false;
  }
  
  return true;
};
