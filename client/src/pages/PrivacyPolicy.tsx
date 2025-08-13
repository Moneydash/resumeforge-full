import { Button } from '@/components/ui/button';
import { MoveLeft } from 'lucide-react';
import React from 'react';

import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white px-8 py-6 rounded-t-lg">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-green-100">Last updated: August 13, 2025</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-8">
          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded">
            <h2 className="text-lg font-semibold text-green-900 mb-3">Your Privacy Matters</h2>
            <p className="text-green-800">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this policy carefully.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">1. Information We Collect</h2>
            <ul className="list-disc ml-8 text-gray-700 space-y-1">
              <li><strong>Personal Information:</strong> Name, email address, and other identifiers you provide when registering or using our Service.</li>
              <li><strong>Usage Data:</strong> Information about how you use our Service, such as IP address, browser type, and device information.</li>
              <li><strong>Cookies & Tracking:</strong> We use cookies and similar tracking technologies to enhance your experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">2. How We Use Your Information</h2>
            <ul className="list-disc ml-8 text-gray-700 space-y-1">
              <li>To provide and maintain our Service</li>
              <li>To improve, personalize, and expand our Service</li>
              <li>To communicate with you, including for support and updates</li>
              <li>To monitor usage and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">3. How We Share Your Information</h2>
            <ul className="list-disc ml-8 text-gray-700 space-y-1">
              <li>With service providers who help us operate our Service</li>
              <li>With legal authorities if required by law</li>
              <li>With your consent or at your direction</li>
              <li>We do <strong>not</strong> sell your personal information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement reasonable measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">5. Your Rights & Choices</h2>
            <ul className="list-disc ml-8 text-gray-700 space-y-1">
              <li>Access, update, or delete your personal information</li>
              <li>Opt out of certain communications</li>
              <li>Control cookies through your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">6. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">7. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">8. Contact Us</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                If you have any questions or concerns about this Privacy Policy, please contact us:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> crraquid@gmail.com</p>
                <p><strong>Address:</strong> BGC Taguig, Philippines</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t pt-6 mt-8">
            <p className="text-center text-gray-500 text-sm">
              © 2025 ResumeForge. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Back to Login Button */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow transition-all duration-200"
        >
          <MoveLeft className='w-5 h-5' />Back to Login
        </Button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
