import React from 'react';
import LegalDocument, { type LegalSection } from '@/components/legal/LegalDocument';

const SECTIONS: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    blocks: [
      {
        kind: 'list',
        items: [
          <>
            <strong className="font-semibold text-foreground">Personal Information:</strong> Name, email address, and
            other identifiers you provide when registering or using our Service.
          </>,
          <>
            <strong className="font-semibold text-foreground">Usage Data:</strong> Information about how you use our
            Service, such as IP address, browser type, and device information.
          </>,
          <>
            <strong className="font-semibold text-foreground">Cookies &amp; Tracking:</strong> We use cookies and
            similar tracking technologies to enhance your experience.
          </>,
        ],
      },
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    blocks: [
      {
        kind: 'list',
        items: [
          'To provide and maintain our Service',
          'To improve, personalize, and expand our Service',
          'To communicate with you, including for support and updates',
          'To monitor usage and prevent fraud or abuse',
          'To comply with legal obligations',
        ],
      },
    ],
  },
  {
    id: 'how-we-share',
    title: 'How We Share Your Information',
    blocks: [
      {
        kind: 'list',
        items: [
          'With service providers who help us operate our Service',
          'With legal authorities if required by law',
          'With your consent or at your direction',
          <>
            We do <strong className="font-semibold text-foreground">not</strong> sell your personal information
          </>,
        ],
      },
    ],
  },
  {
    id: 'data-security',
    title: 'Data Security',
    blocks: [
      {
        kind: 'p',
        text: 'We implement reasonable measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Rights & Choices',
    blocks: [
      {
        kind: 'list',
        items: [
          'Access, update, or delete your personal information',
          'Opt out of certain communications',
          'Control cookies through your browser settings',
        ],
      },
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    blocks: [
      {
        kind: 'p',
        text: 'Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Privacy Policy',
    blocks: [
      {
        kind: 'p',
        text: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    blocks: [
      {
        kind: 'p',
        text: 'If you have any questions or concerns about this Privacy Policy, please contact us:',
      },
      { kind: 'contact' },
    ],
  },
];

const PrivacyPolicy: React.FC = () => (
  <LegalDocument
    title="Privacy Policy"
    updated={{ label: 'August 13, 2025', iso: '2025-08-13' }}
    intro="This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this policy carefully."
    sections={SECTIONS}
  />
);

export default PrivacyPolicy;
