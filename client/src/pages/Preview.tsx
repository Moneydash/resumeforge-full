// Resume Preview
import React, { useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import ResumeForm from '../components/ResumeForm';
import { useTheme } from '../contexts/ThemeContext';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import type { TemplateType } from '@/types';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formRequest } from '@/api/request';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import {
  User,
  FileText,
  Share2,
  Briefcase,
  GraduationCap,
  Code,
  Languages,
  Heart,
  FolderOpen,
  Trophy,
  Award,
  Users,
  FileIcon,
  Eye,
  Loader2,
  LayoutDashboard,
  GripVertical,
  MoveLeft
} from 'lucide-react';
import { renderToString } from 'react-dom/server';

import ResumePreview from '@/components/TemplateComponent';
import { getCsrfToken, pdfPayload } from '@/utils/helper';
import client from '@/api/axiosInstance';
import Cookies from 'js-cookie';
import { useMainStore } from '@/store/useMainStore';

const Preview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // resize sidebar state
  const sidebarDefault = 550;
  const [sidebarWidth, setSidebarWidth] = useState<number>(sidebarDefault); // Set default width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarMin = 280;
  const sidebarMax = 650;
  const resumeId = localStorage.getItem('id');

  // zustand store
  const userId = useMainStore((state) => state.userId);
  const setUserId = useMainStore((state) => state.setUserId);

  // get the selected template and validate it
  const templateParam = localStorage.getItem("template") || 'cigar';
  const validTemplates: TemplateType[] = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];
  const template: TemplateType | undefined = templateParam && validTemplates.includes(templateParam as TemplateType)
    ? templateParam as TemplateType
    : undefined;

  // Properly typed initial state matching ResumeFormData interface
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<ResumeFormData>({
    personal: {
      name: '',
      headline: '',
      email: '',
      website: { name: '', link: '' },
      location: '',
      contact_number: ''
    },
    summary: '',
    socials: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    awards: [],
    certifications: [],
    interests: [],
    projects: [],
    references: []
  });

  const personalRef = useRef<HTMLDivElement>(null!);
  const summaryRef = useRef<HTMLDivElement>(null!);
  const socialsRef = useRef<HTMLDivElement>(null!);
  const experienceRef = useRef<HTMLDivElement>(null!);
  const educationRef = useRef<HTMLDivElement>(null!);
  const skillsRef = useRef<HTMLDivElement>(null!);
  const languagesRef = useRef<HTMLDivElement>(null!);
  const interestsRef = useRef<HTMLDivElement>(null!);
  const projectsRef = useRef<HTMLDivElement>(null!);
  const awardsRef = useRef<HTMLDivElement>(null!);
  const certificationsRef = useRef<HTMLDivElement>(null!);
  const referencesRef = useRef<HTMLDivElement>(null!);

  // Create a ref for the form container
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Sidebar navigation items
  const sidebarItems: Array<{
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    ref: React.RefObject<HTMLDivElement>;
  }> = [
      { icon: User, label: 'Personal Details', ref: personalRef },
      { icon: FileText, label: 'Summary', ref: summaryRef },
      { icon: Share2, label: 'Social Links', ref: socialsRef },
      { icon: Briefcase, label: 'Experience', ref: experienceRef },
      { icon: GraduationCap, label: 'Education', ref: educationRef },
      { icon: Code, label: 'Skills', ref: skillsRef },
      { icon: Languages, label: 'Languages', ref: languagesRef },
      { icon: Heart, label: 'Interests', ref: interestsRef },
      { icon: FolderOpen, label: 'Projects', ref: projectsRef },
      { icon: Trophy, label: 'Awards', ref: awardsRef },
      { icon: Award, label: 'Certifications', ref: certificationsRef },
      { icon: Users, label: 'References', ref: referencesRef },
    ];

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection during resize
  };

  const fetchResumeData = async () => {
    setResumeLoading(true);
    const resume_id = localStorage.getItem('id'); // resume id
    if (resume_id) {
      const request = await client.get(`/resume/fetch-data/${resume_id}/${userId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
      if (request.data?.resume_data) {
        try {
          const parsedData = JSON.parse(request.data.resume_data);
          setResumeData(parsedData);
          handleFormSubmit(parsedData); // Use parsedData directly!
        } catch (e) {
          // fallback if not JSON
          setResumeData(request.data.resume_data);
          handleFormSubmit(request.data.resume_data); // Use the fallback data directly!
        }
      }
    }
    setResumeLoading(false);
  };

  // set the first effect to get the user id
  useEffect(() => {
    toast.dismiss();
    setUserId(Cookies.get('user.id') || '');
  }, []);

  useEffect(() => {
    getCsrfToken();
    if (userId && resumeId) {
      fetchResumeData();
    } else {
      navigate('/dashboard');
    }
  }, [userId]);

  // Fixed resize effect with better event handling
  useEffect(() => {
    if (!isResizing) return;

    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      let clientX = (e as MouseEvent).clientX;
      if ('touches' in e && (e as TouchEvent).touches.length) {
        clientX = (e as TouchEvent).touches[0].clientX;
      }

      // Sidebar starts after 48px fixed nav sidebar
      const newWidth = Math.min(
        sidebarMax,
        Math.max(sidebarMin, clientX - 48) // 48px = fixed nav sidebar width
      );
      setSidebarWidth(newWidth);
    };

    const stop = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = ''; // Re-enable text selection
    };

    // Add event listeners to document to ensure they work even when mouse leaves the element
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchend', stop);

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchend', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarMax, sidebarMin]);

  // Fixed scroll to section function
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current && formContainerRef.current) {
      // Calculate the position relative to the form container
      const formContainer = formContainerRef.current;
      const targetElement = ref.current;

      // Get the offset of the target element relative to the form container
      const targetOffset = targetElement.offsetTop - formContainer.offsetTop;

      // Scroll within the form container instead of the entire page
      formContainer.scrollTo({
        top: targetOffset - 20, // Add some padding
        behavior: 'smooth'
      });
    }
  };

  const saveResumeData = async (data: ResumeFormData) => {
    try {
      await client.post('/resume/save-data', {
        resumeData: data,
        id: localStorage.getItem('id') || null,
        template: template,
        userId: Cookies.get('user.id'),
      });
    } catch (error) {
      console.error('Failed saving resume data: ', error);
      throw error;
    }
  };

  const saveResumeExports = async () => {
    try {
      await client.post(`/resume/save-exports/${resumeId}/${userId}`, {
        template: template,
      });
    } catch (error) {
      console.error('Failed saving resume exports: ', error);
      throw error;
    }
  }

  const handleFormSubmit = async (data: ResumeFormData) => {
    setLoading(true);
    try {
      setResumeData(data);
      await saveResumeData(data);
      const htmlContent = renderToString(<ResumePreview data={data} template={template} />);
      const payload = pdfPayload(data, htmlContent, template || 'andromeda');

      const requestData = await formRequest("POST", `/resume/generate`, payload);
      const blob = new Blob([requestData?.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error: ", error);
    } finally {
      setLoading(false);
    }
  }

  // Generate a proper PDF with selectable text and clickable links
  const handleExportPDF = async (data: ResumeFormData) => {
    setLoadingExport(true);
    const toastExport = toast.loading("Exporting your resume into PDF");
    try {
      await saveResumeExports();
      const htmlContent = renderToString(<ResumePreview data={data} template={template} />)
      const payload = pdfPayload(data, htmlContent, template || 'andromeda')

      const requestData = await formRequest("POST", `/resume/generate`, payload);
      // Convert the binary PDF data to a blob and trigger download
      const blob = new Blob([requestData?.data], { type: 'application/pdf' });
      const fileName = localStorage.getItem('slug') || `${data.personal.name.toLowerCase().replace(/\s+/g, '-')}-resume`;
      const file = `${fileName}.pdf`;
      saveAs(blob, file);
      toast.dismiss(toastExport);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error("Error: ", error);
    } finally {
      setLoadingExport(false);
    }
  };

  const redirectTemplates = () => {
    const toastId = toast.loading("Redirecting to Templates page...");
    setTimeout(() => {
      toast.dismiss(toastId);
      navigate("/templates");
    }, 1600);
  };

  const redirectResumes = () => {
    const toastId = toast.loading("Redirecting to Resume Dashboards...");
    setTimeout(() => {
      toast.dismiss(toastId);
      localStorage.clear();
      navigate("/dashboard");
    }, 1600);
  }

  return (
    resumeLoading ? (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Loading your resume...</span>
        </div>
      </div>
    ) : (
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-cambria flex flex-col">
        {/* Fixed Navigation Sidebar */}
        <div className="fixed left-0 top-0 h-full w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-50 flex flex-col">
          <div className="flex-1 flex flex-col justify-center py-4">
            <div className="flex flex-col items-center space-y-2">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="group relative">
                    <button
                      type="button"
                      onClick={() => scrollToSection(item.ref)}
                      className="p-2 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors duration-200"
                    >
                      <Icon size={16} />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area - Adjusted for fixed sidebar */}
        <div className="flex-1 pl-12 flex flex-col lg:flex-row overflow-hidden">
          {/* Form Sidebar */}
          <div
            className={`
              ${isDarkMode
                ? 'bg-gray-800/95 backdrop-blur-xl border-gray-700/50'
                : 'bg-white/95 backdrop-blur-xl border-gray-200/50'
              }
              h-1/2 lg:h-full
              border-r
              shadow-xl
              flex flex-col
              overflow-hidden
              relative
            `}
            style={{
              width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '100%',
              minWidth: window.innerWidth >= 1024 ? `${sidebarMin}px` : 'auto',
              maxWidth: window.innerWidth >= 1024 ? `${sidebarMax}px` : 'none',
              transition: isResizing ? 'none' : 'width 0.15s cubic-bezier(.4,2,.6,1)',
            }}
          >
            {/* Header - Fixed */}
            <div className={`
              flex-shrink-0 p-6 bg-inherit 
              border-b border-gray-200/50 dark:border-gray-700/50
              backdrop-blur-xl
              z-10
            `}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${isDarkMode
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }
                  `}>
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h1 className={`
                    text-2xl font-bold bg-gradient-to-r 
                    ${isDarkMode
                      ? 'from-white to-gray-300'
                      : 'from-gray-900 to-gray-600'
                    } 
                    bg-clip-text text-transparent
                  `}>
                    ResumeForge
                  </h1>
                </div>

                <div className={`
                  px-3 py-1.5 rounded-full text-xs font-medium
                  ${isDarkMode
                    ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50'
                    : 'bg-gray-100/50 text-gray-600 border border-gray-200/50'
                  }
                  backdrop-blur-sm
                `}>
                  <ThemeToggle />
                </div>
              </div>

              <div className={`
                inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                ${isDarkMode
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                }
              `}>
                Template: {(template || 'andromeda').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div
              ref={formContainerRef}
              className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth no-scrollbar"
              style={{ scrollBehavior: 'smooth' }}
            >
              <ResumeForm
                onSubmit={handleFormSubmit}
                loading={loading}
                template={template}
                sectionRefs={{
                  personalRef,
                  summaryRef,
                  socialsRef,
                  experienceRef,
                  educationRef,
                  skillsRef,
                  languagesRef,
                  interestsRef,
                  projectsRef,
                  awardsRef,
                  certificationsRef,
                  referencesRef,
                }}
              />
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className={`
                  hidden lg:flex absolute top-0 right-0 h-full w-4 items-center justify-center cursor-ew-resize z-30
                  transition-colors duration-200
                  ${isResizing ? 'bg-blue-200/60' : 'bg-transparent hover:bg-blue-100/60'}
                `}
              style={{
                touchAction: 'none',
              }}
              aria-label="Resize sidebar"
              role="separator"
            >
              <GripVertical size={22} className="text-black dark:text-white" />
            </div>
          </div>

          {/* Preview Area - Now properly calculated */}
          <div
            className="h-1/2 lg:h-full flex flex-col overflow-hidden"
            style={{
              width: window.innerWidth >= 1024 ? `calc(100% - ${sidebarWidth}px)` : '100%',
            }}
          >
            {/* Preview Header - Fixed */}
            <div className={`
              flex-shrink-0 p-6
              ${isDarkMode
                ? 'bg-gray-900/95 backdrop-blur-xl border-gray-700/50'
                : 'bg-white/95 backdrop-blur-xl border-gray-200/50'
              }
              border-b shadow-lg
              z-10
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Eye className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                  <h2 className={`
                    text-xl font-semibold bg-gradient-to-r 
                    ${isDarkMode
                      ? 'from-white to-gray-300'
                      : 'from-gray-900 to-gray-600'
                    } 
                    bg-clip-text text-transparent
                  `}>
                    Resume Preview
                  </h2>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={redirectTemplates}
                    className={`
                      ${isDarkMode
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                      }
                      transition-all duration-200 hover:scale-105
                    `}
                  >
                    <MoveLeft className="w-4 h-4 mr-2" />
                    Templates
                  </Button>

                  <Button
                    variant="outline"
                    onClick={redirectResumes}
                    className={`
                      ${isDarkMode
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                      }
                      transition-all duration-200 hover:scale-105
                    `}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>

                  <Button
                    id="exportButton"
                    onClick={() => handleExportPDF(resumeData)}
                    disabled={loadingExport || !pdfUrl}
                    className={`
                      ${isDarkMode
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      }
                      text-white font-medium
                      transition-all duration-200 hover:scale-105
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                      shadow-lg hover:shadow-xl
                    `}
                  >
                    {loadingExport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileIcon className="w-4 h-4 mr-2" />
                        Export PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {loading ? (
                <div className={`
                  h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                  ${isDarkMode
                    ? 'border-gray-700 bg-gray-800/50 text-gray-400'
                    : 'border-gray-300 bg-gray-50/50 text-gray-500'
                  }
                  transition-all duration-200
                `}>
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-lg font-medium mb-2">Generating your PDF preview...</p>
                  <p className="text-sm text-center max-w-md">
                    Please wait while we generate your resume preview.
                  </p>
                </div>
              ) : pdfUrl ? (
                <div className={`
                  h-full rounded-xl overflow-hidden shadow-2xl
                  ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                  hover:shadow-3xl transition-shadow duration-300
                `}>
                  <iframe
                    src={`${pdfUrl}#sidebar=0&zoom=100&toolbar=0`}
                    className="w-full h-full border-none rounded-xl"
                    title="Resume Preview"
                  />
                </div>
              ) : (
                <div className={`
                  h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                  ${isDarkMode
                    ? 'border-gray-700 bg-gray-800/50 text-gray-400'
                    : 'border-gray-300 bg-gray-50/50 text-gray-500'
                  }
                  transition-all duration-200
                `}>
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mb-4
                    ${isDarkMode
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gray-200 text-gray-400'
                    }
                  `}>
                    <FileIcon className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium mb-2">No PDF generated yet</p>
                  <p className="text-sm text-center max-w-md">
                    Please complete and submit the form to generate your resume preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default Preview;