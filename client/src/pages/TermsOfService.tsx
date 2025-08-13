import { Button } from '@/components/ui/button';
import { MoveLeft } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-6 rounded-t-lg">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-blue-100">Last updated: August 13, 2025</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-8">
          {/* Introduction */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Important Notice</h2>
            <p className="text-blue-800">
              Please read these Terms of Service ("Terms", "Terms of Service") carefully before using our website and services.
              These Terms constitute a legally binding agreement between you and our website. {/* Note: Originally "our company" not "our website" */}
            </p>
          </div>

          {/* Terms Sections */}
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing, browsing, or using this website and its associated services (collectively, the "Service"),
                you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our
                Privacy Policy. If you do not agree to these Terms, you must not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                2. Definitions
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2 text-gray-700">
                  <li><strong>"Service"</strong> refers to our website, applications, and related services</li>
                  <li><strong>"User" or "you"</strong> refers to any individual or entity using the Service</li>
                  <li><strong>"Content"</strong> includes all text, data, information, software, graphics, or other materials</li>
                  <li><strong>"Account"</strong> refers to your registered user profile on our Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                3. Eligibility and Registration
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                To use certain features of the Service, you must be at least 18 years old or have reached the age of majority
                in your jurisdiction. By using the Service, you represent and warrant that you meet these age requirements.
              </p>
              <p className="text-gray-700 leading-relaxed">
                When creating an account, you must provide accurate, current, and complete information. You are responsible for
                maintaining the confidentiality of your account credentials and for all activities under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                4. Acceptable Use Policy
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:
                </p>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <ul className="space-y-1 text-red-800 text-sm">
                    <li>• Violate any applicable laws or regulations</li>
                    <li>• Infringe upon intellectual property rights of others</li>
                    <li>• Upload or transmit harmful, malicious, or illegal content</li>
                    <li>• Engage in spam, harassment, or abusive behavior</li>
                    <li>• Attempt to gain unauthorized access to the Service or other users' accounts</li>
                    <li>• Use automated tools to access the Service without permission</li>
                    <li>• Interfere with or disrupt the Service's functionality</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                5. User Content and Data
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                You retain ownership of any content you submit, post, or display through the Service ("User Content").
                By submitting User Content, you grant us a worldwide, royalty-free, non-exclusive license to use,
                reproduce, modify, and distribute your content in connection with operating the Service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You are solely responsible for your User Content and warrant that it does not violate any third-party
                rights or applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                6. Privacy and Data Protection
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Your privacy is important to us. Our collection, use, and protection of your personal information is
                governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service,
                you consent to the collection and use of your information as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                7. Intellectual Property Rights
              </h2>
              <p className="text-gray-700 leading-relaxed">
                The Service and all its content, features, functionality, software, and design are owned by us or our
                licensors and are protected by copyright, trademark, patent, and other intellectual property laws.
                You may not reproduce, distribute, modify, or create derivative works without our express written consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                8. Payment and Billing (If Applicable)
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  If the Service includes paid features or subscriptions:
                </p>
                <ul className="space-y-1 text-gray-700 ml-4">
                  <li>• All fees are non-refundable unless otherwise stated</li>
                  <li>• You authorize us to charge your payment method for applicable fees</li>
                  <li>• Subscription fees will be billed on a recurring basis</li>
                  <li>• We may change pricing with 30 days' notice to active subscribers</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                9. Service Availability and Modifications
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We strive to maintain Service availability but do not guarantee uninterrupted access. We reserve the right to
                modify, suspend, or discontinue any part of the Service at any time, with or without notice. We may also
                impose usage limits or restrict access to certain features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                10. Account Termination
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  We may terminate or suspend your account and access to the Service immediately, without prior notice,
                  for any reason, including breach of these Terms.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  You may terminate your account at any time by contacting us or using the account closure feature.
                  Upon termination, your right to use the Service will cease immediately.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                11. Disclaimers and Warranties
              </h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-yellow-800 font-medium mb-2">DISCLAIMER OF WARRANTIES</p>
                <p className="text-yellow-800 text-sm">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE EXPRESSLY DISCLAIM ALL WARRANTIES
                  OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                12. Limitation of Liability
              </h2>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <p className="text-red-800 font-medium mb-2">LIMITATION OF LIABILITY</p>
                <p className="text-red-800 text-sm">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                  SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY
                  OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                13. Indemnification
              </h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to defend, indemnify, and hold us harmless from and against any claims, damages, obligations,
                losses, liabilities, costs, or debts arising from: (a) your use of the Service; (b) your violation of these
                Terms; (c) your violation of any third-party rights; or (d) any content you submit or transmit through the Service.
              </p>
            </section>

            {/* will enhance the phrase on section 14. Dispute Resolution */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                14. Dispute Resolution
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Any disputes arising out of or relating to these Terms shall be resolved through binding arbitration in
                accordance with the rules. The arbitration shall take place in your jurisdiction.
                You waive any right to a jury trial or to participate in a class-action lawsuit.
              </p>
            </section>

            {/* will enhance the phrase on section 15. Governing Law */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                15. Governing Law
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of your jurisdiction,
                without regard to its conflict of law provisions. Any legal action or proceeding arising under these
                Terms shall be brought exclusively in the courts of your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                16. Severability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions
                shall remain in full force and effect. The invalid provision shall be replaced with a valid provision that
                most closely matches the intent of the original provision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                17. Changes to Terms
              </h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. Material changes
                  will be notified to users through the Service or via email at least 30 days prior to the effective date.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Your continued use of the Service after any modifications constitutes acceptance of the updated Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                18. Contact Information
              </h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  If you have any questions, concerns, or requests regarding these Terms of Service, please contact us:
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> crraquid@gmail.com</p>
                  <p><strong>Address:</strong> BGC Taguig, Philippines</p>
                  {/* <p><strong>Phone:</strong> +639123456789</p> */}
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t pt-6 mt-8">
            <p className="text-center text-gray-500 text-sm">
              2025 ResumeForge. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      {/* Back to Login Button */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow transition-all duration-200"
        >
          <MoveLeft className='w-5 h-5' /> Back to Login
        </Button>
      </div>
    </div>
  );
};

export default TermsOfService;