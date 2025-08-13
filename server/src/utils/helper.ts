import { v4 as uuidv4 } from 'uuid';

export const formatDescription = (txt: string) => {
  if (!txt) {
    return '';
  }

  // Decode HTML entities
  let decoded = txt
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  // Remove <p> tags inside <li>
  decoded = decoded.replace(/<li>\s*<p>/g, '<li>');
  decoded = decoded.replace(/<\/p>\s*<\/li>/g, '</li>');

  return decoded;
};

export function generateId(): string {
  return uuidv4();
}