import client from "@/api/axiosInstance";
import CLTemplateCard from "@/components/CLTemplateCard";
import clTemplates from "@/utils/cl-templates-type";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useLocation } from "react-router-dom";

const CLTemplates: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Helper to get query params
  const getQueryParam = (key: string) => {
    const params = new URLSearchParams(location.search);
    return params.get(key);
  };

  // Prefer coverLetterId from URL, else from localStorage
  const coverLetterId = localStorage.getItem('cl-id') || getQueryParam('coverLetterId') || "";

  const fetchCoverLetterData = async () => {
    const cover_letter_id = coverLetterId; // cover letter id
    if (cover_letter_id) {
      const userId = Cookies.get('user.id');
      const request = await client.get(`/cover-letter/fetch-data/${cover_letter_id}/${userId}`);
      localStorage.setItem('clFormData', request.data?.cover_letter_data);
    }
  }

  useEffect(() => {
    if (!coverLetterId) {
      navigate('/cl-dashboard');
    }
    fetchCoverLetterData();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = clTemplates.find(t => t.id === templateId);

    // Check if template is available
    if (!template?.available) {
      toast.error(`"${template?.name}" template is not available yet. Coming soon!`);
      return;
    }

    const toastRedirect = toast.loading(`Redirecting to "${template?.name}" template!`);
    localStorage.setItem('cl-id', coverLetterId);
    setTimeout(() => {
      toast.dismiss(toastRedirect);
      localStorage.setItem("cl-template", templateId);
      navigate(`/cl-preview?template=${templateId}`);
    }, 1500);
  };

  const handleCreateNew = () => {
    const aetherToast = toast.loading("Starting with our most popular template!");
    setTimeout(() => {
      toast.dismiss(aetherToast);
      localStorage.setItem("cl-template", "aether");
      navigate("/cl-preview?template=aether");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Enhanced Hero Section */}
      {coverLetterId ? (
        <header className="relative bg-white shadow-2xl overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-indigo-600/10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50"></div>
          </div>
          <div className="relative max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-blue-800 font-medium mb-6">
                <span className="text-2xl mr-2">📄</span>
                Professional Cover Letter Templates
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6">
                Stand Out with Professional Cover Letters
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                Choose from our collection of professionally designed cover letter templates that help you make the perfect first impression.
                Each template is crafted to highlight your skills and personality while maintaining the professionalism that employers expect.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-700">Easy Customization</span>
                </div>
                <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-700">Quick Generation</span>
                </div>
              </div>

              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300"
              >
                <span className="text-2xl mr-3">✨</span>
                Start with Popular Template
                <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </header>
      ) : (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Templates Grid */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Professional Cover Letter Templates</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose from our expertly crafted templates designed to showcase your qualifications and personality.
            Each template is fully customizable and optimized for both digital and print formats.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {clTemplates.map((template) => (
            <CLTemplateCard
              key={template.id}
              template={template}
              isHovered={hoveredTemplate === template.id}
              onHover={setHoveredTemplate}
              onSelect={handleTemplateSelect}
            />
          ))}
        </div>

        {/* Enhanced Bottom CTA */}
        <div className="mt-24 relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-3xl p-1">
          <div className="relative bg-white rounded-3xl p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 rounded-3xl"></div>
            <div className="relative">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-white font-bold text-lg mb-6">
                <span className="text-2xl mr-3">🚀</span>
                Ready to Make Your Application Stand Out?
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6">
                Join the Growing Community Creating Impressive Cover Letters
              </h2>
              <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                Whether you choose the minimalist elegance of our Aether template or the dynamic presence of our Ignis template,
                you'll have everything you need to make a memorable first impression.
              </p>

              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-700">Easy Customization</span>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-700">HR Approved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CLTemplates;