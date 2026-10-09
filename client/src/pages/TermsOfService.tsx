import React from 'react';
import LegalDocument, { type LegalSection } from '@/components/legal/LegalDocument';

const SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    blocks: [
      {
        kind: 'p',
        text: 'By accessing, browsing, or using this website and its associated services (collectively, the "Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Service.',
      },
    ],
  },
  {
    id: 'definitions',
    title: 'Definitions',
    blocks: [
      {
        kind: 'defs',
        items: [
          ['Service', 'refers to our website, applications, and related services'],
          ['User or you', 'refers to any individual or entity using the Service'],
          ['Content', 'includes all text, data, information, software, graphics, or other materials'],
          ['Account', 'refers to your registered user profile on our Service'],
        ],
      },
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility and Registration',
    blocks: [
      {
        kind: 'p',
        text: 'To use certain features of the Service, you must be at least 18 years old or have reached the age of majority in your jurisdiction. By using the Service, you represent and warrant that you meet these age requirements.',
      },
      {
        kind: 'p',
        text: 'When creating an account, you must provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use Policy',
    blocks: [
      { kind: 'p', text: 'You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:' },
      {
        kind: 'callout',
        icon: 'rules',
        title: 'Prohibited conduct',
        items: [
          'Violate any applicable laws or regulations',
          'Infringe upon intellectual property rights of others',
          'Upload or transmit harmful, malicious, or illegal content',
          'Engage in spam, harassment, or abusive behavior',
          "Attempt to gain unauthorized access to the Service or other users' accounts",
          'Use automated tools to access the Service without permission',
          "Interfere with or disrupt the Service's functionality",
        ],
      },
    ],
  },
  {
    id: 'user-content',
    title: 'User Content and Data',
    blocks: [
      {
        kind: 'p',
        text: 'You retain ownership of any content you submit, post, or display through the Service ("User Content"). By submitting User Content, you grant us a worldwide, royalty-free, non-exclusive license to use, reproduce, modify, and distribute your content in connection with operating the Service.',
      },
      {
        kind: 'p',
        text: 'You are solely responsible for your User Content and warrant that it does not violate any third-party rights or applicable laws.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy and Data Protection',
    blocks: [
      {
        kind: 'p',
        text: 'Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy.',
      },
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property Rights',
    blocks: [
      {
        kind: 'p',
        text: 'The Service and all its content, features, functionality, software, and design are owned by us or our licensors and are protected by copyright, trademark, patent, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our express written consent.',
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment and Billing (If Applicable)',
    blocks: [
      { kind: 'p', text: 'If the Service includes paid features or subscriptions:' },
      {
        kind: 'list',
        items: [
          'All fees are non-refundable unless otherwise stated',
          'You authorize us to charge your payment method for applicable fees',
          'Subscription fees will be billed on a recurring basis',
          "We may change pricing with 30 days' notice to active subscribers",
        ],
      },
    ],
  },
  {
    id: 'availability',
    title: 'Service Availability and Modifications',
    blocks: [
      {
        kind: 'p',
        text: 'We strive to maintain Service availability but do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We may also impose usage limits or restrict access to certain features.',
      },
    ],
  },
  {
    id: 'termination',
    title: 'Account Termination',
    blocks: [
      {
        kind: 'p',
        text: 'We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms.',
      },
      {
        kind: 'p',
        text: 'You may terminate your account at any time by contacting us or using the account closure feature. Upon termination, your right to use the Service will cease immediately.',
      },
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and Warranties',
    blocks: [
      {
        kind: 'callout',
        icon: 'warranty',
        title: 'Disclaimer of warranties',
        caps: true,
        text: 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE EXPRESSLY DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    blocks: [
      {
        kind: 'callout',
        icon: 'liability',
        title: 'Limitation of liability',
        caps: true,
        text: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.',
      },
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    blocks: [
      {
        kind: 'p',
        text: 'You agree to defend, indemnify, and hold us harmless from and against any claims, damages, obligations, losses, liabilities, costs, or debts arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you submit or transmit through the Service.',
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Dispute Resolution',
    blocks: [
      {
        kind: 'p',
        text: 'Any disputes arising out of or relating to these Terms shall be resolved through binding arbitration in accordance with the rules. The arbitration shall take place in your jurisdiction. You waive any right to a jury trial or to participate in a class-action lawsuit.',
      },
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    blocks: [
      {
        kind: 'p',
        text: 'These Terms shall be governed by and construed in accordance with the laws of your jurisdiction, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms shall be brought exclusively in the courts of your jurisdiction.',
      },
    ],
  },
  {
    id: 'severability',
    title: 'Severability',
    blocks: [
      {
        kind: 'p',
        text: 'If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect. The invalid provision shall be replaced with a valid provision that most closely matches the intent of the original provision.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    blocks: [
      {
        kind: 'p',
        text: 'We reserve the right to modify or replace these Terms at any time at our sole discretion. Material changes will be notified to users through the Service or via email at least 30 days prior to the effective date.',
      },
      {
        kind: 'p',
        text: 'Your continued use of the Service after any modifications constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    blocks: [
      {
        kind: 'p',
        text: 'If you have any questions, concerns, or requests regarding these Terms of Service, please contact us:',
      },
      { kind: 'contact' },
    ],
  },
];

const TermsOfService: React.FC = () => (
  <LegalDocument
    title="Terms of Service"
    updated={{ label: 'August 13, 2025', iso: '2025-08-13' }}
    intro={
      <>
        Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using our website and services.
        These Terms constitute a legally binding agreement between you and our website.
      </>
    }
    sections={SECTIONS}
  />
);

export default TermsOfService;
