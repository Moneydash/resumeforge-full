import client from "@/api/axiosInstance";
import TemplateCard from "@/components/TemplateCard";
import templates from "@/utils/templates-type";
import Cookies from "js-cookie";
import { ArrowLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useLocation } from "react-router-dom";

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("All");

  const themes = ["All", "Galaxy Collection", "Greek Gods Collection"];

  // Helper to get query params
  const getQueryParam = (key: string) => {
    const params = new URLSearchParams(location.search);
    return params.get(key);
  };

  // Prefer resumeId from URL, else from localStorage
  const resumeId = localStorage.getItem('id') || getQueryParam('resumeId') || "";

  const filteredTemplates = templates.filter(template => {
    const matchesTheme = selectedTheme === "All" ||
      (selectedTheme === "Galaxy Collection" && template.theme === "galaxy") ||
      (selectedTheme === "Greek Gods Collection" && template.theme === "greek");
    return matchesTheme;
  });

  const fetchResumeData = async () => {
    const resume_id = resumeId; // resume id
    if (resume_id) {
      const userId = Cookies.get('user.id');
      const request = await client.get(`/resume/fetch-data/${resume_id}/${userId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
    }
  }

  useEffect(() => {
    if (!resumeId) {
      navigate('/dashboard');
    }
    fetchResumeData();
  }, [resumeId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);

    // Check if template is available
    if (!template?.available) {
      toast.error(`"${template?.name}" template is not available yet. Coming soon!`);
      return;
    }

    const toastRedirect = toast.loading(`Redirecting to "${template?.name}" template!`);
    localStorage.setItem('id', resumeId);
    setTimeout(() => {
      toast.dismiss(toastRedirect);
      localStorage.setItem("template", templateId);
      navigate(`/preview?template=${templateId}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Enhanced Hero Section */}
      {resumeId ? (
        <header className="relative bg-white shadow-2xl overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-amber-600/10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50"></div>
          </div>
          <div className="relative max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-blue-800 font-medium mb-6">
                <span className="text-2xl mr-2">✨</span>
                Two Legendary Collections
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
                Professional Resume Templates
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                Choose from our <strong>Galaxy Collection</strong> of modern classics or our new <strong>Greek Gods Collection</strong>
                inspired by legendary power and wisdom. Each template is crafted to help you make an unforgettable impression.
              </p>
            </div>
          </div>
        </header>
      ) : (
        <div className="flex flex-col items-center justify-center mt-5">
          <button
            onClick={() => { navigate('/dashboard') }}
            className="inline-flex items-center gap-2 px-6 py-3 font-medium text-blue-500 hover:cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      )}


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Enhanced Filters */}
        <div className="mb-16 space-y-8">
          {/* Theme Filter */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Choose Your Collection</h3>
            <div className="inline-flex bg-white rounded-2xl p-2 shadow-lg gap-2.5">
              {themes.map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${selectedTheme === theme
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collection Headers */}
        {selectedTheme === "All" && (
          <div className="space-y-20">
            {/* Galaxy Collection */}
            <section className="relative">
              <div className="text-center mb-16">
                <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl mb-6 shadow-lg border border-blue-100">
                  <span className="text-3xl mr-4">🌌</span>
                  <span className="font-bold text-blue-900 text-lg">Galaxy Collection</span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
                  Timeless Professional Designs
                </h2>
                <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
                  Our original collection of stellar templates, perfect for traditional industries and classic professional presentations.
                  Each design combines timeless elegance with modern functionality.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {templates.filter(t => t.theme === 'galaxy').map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isHovered={hoveredTemplate === template.id}
                    onHover={setHoveredTemplate}
                    onSelect={handleTemplateSelect}
                  />
                ))}
              </div>
            </section>

            {/* Greek Gods Collection */}
            <section className="relative">
              <div className="text-center mb-16">
                <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl mb-6 shadow-lg border border-amber-100">
                  <span className="text-3xl mr-4">⚡</span>
                  <span className="font-bold text-amber-900 text-lg">Greek Gods Collection</span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-900 to-orange-900 bg-clip-text text-transparent mb-6">
                  Legendary Power & Wisdom
                </h2>
                <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
                  Channel the power of the gods with these commanding templates designed for modern leaders and ambitious professionals.
                  Each template embodies the strength and wisdom of ancient mythology.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {templates.filter(t => t.theme === 'greek').map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isHovered={hoveredTemplate === template.id}
                    onHover={setHoveredTemplate}
                    onSelect={handleTemplateSelect}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Filtered Results */}
        {selectedTheme !== "All" && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {selectedTheme === "Galaxy Collection" ? "🌌 Galaxy Collection" : "⚡ Greek Gods Collection"}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {selectedTheme === "Galaxy Collection"
                  ? "Timeless professional designs perfect for traditional industries and classic presentations."
                  : "Commanding templates designed for modern leaders and ambitious professionals."
                }
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isHovered={hoveredTemplate === template.id}
                  onHover={setHoveredTemplate}
                  onSelect={handleTemplateSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Bottom CTA */}
        <div className="mt-24 relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 rounded-3xl p-1">
          <div className="relative bg-white rounded-3xl p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-amber-50 rounded-3xl"></div>
            <div className="relative">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-bold text-lg mb-6">
                <span className="text-2xl mr-3">🚀</span>
                Ready to Launch Your Career?
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
                Join the Growing Community Turning Resumes Into Dream Careers
              </h2>
              <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                Whether you choose the timeless elegance of our Galaxy Collection or the commanding presence of our Greek Gods Collection,
                you'll have everything you need to stand out from the competition.
              </p>

              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-700">ATS Optimized</span>
                </div>
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

export default Templates;