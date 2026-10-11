// Verified against the code and the policy: the upload is held in memory only (multer.memoryStorage, stateless
// route, local pdfjs-dist scanning), and the privacy policy says "We do not sell your personal information".
// It also allows sharing with service providers, legal authorities and with consent, so do NOT say "never shared".
export const PRIVACY_COPY = {
  note: 'Your PDF is read in memory to build this report and is not stored. We do not sell your personal information.',
  link: 'Read the Privacy Policy',
} as const;
