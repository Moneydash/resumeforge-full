// Resume Preview
import React, { useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import ResumeForm from '../components/ResumeForm';
import { useTheme } from '../contexts/ThemeContext';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import type { TemplateType } from '@/types';
import { useNavigate } from 'react-router-dom';
import EditorTopBar from '@/components/editor-chrome/EditorTopBar';
import Loader from '@/components/SuspenseLoader';
import SectionRail from '@/components/editor-chrome/SectionRail';
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
  Loader2,
  GripVertical
} from 'lucide-react';
import { renderToString } from 'react-dom/server';

import ResumePreview from '@/components/TemplateComponent';
import { getCsrfToken, pdfPayload } from '@/utils/helper';
import client from '@/api/axiosInstance';
import Cookies from 'js-cookie';
import { useMainStore } from '@/store/useMainStore';
import DesignPanel, { DESIGN_PANEL_WIDTH, type DesignTab } from '@/components/DesignPanel';
import type { SavedFont } from '@/utils/fonts';
import { isColorTemplate, type ColorTheme } from '@/utils/color-theme';
import { convertLayout, type SectionLayout } from '@/utils/section-layout';
import type { SectionTitles } from '@/utils/section-titles';
import type { LiveStatus } from '@/components/editor-chrome/status';
import MaintenanceBanner from '@/components/maintenance/MaintenanceBanner';
import DraftRecoveryDialog from '@/components/maintenance/DraftRecoveryDialog';
import { useMaintenance, useOnMaintenanceEnd } from '@/maintenance/hooks';
import { isMaintenanceActive } from '@/maintenance/store';
import { clearDraft, clearStorageKeepingDrafts, readDraft, saveDraft, shouldOfferDraft } from '@/maintenance/draft';
import { claimSaveLock, TAB_ID } from '@/maintenance/lock';

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

  // the selected template: restored from localStorage, switchable from the Design panel without leaving the page
  const validTemplates: TemplateType[] = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];
  const [template, setTemplate] = useState<TemplateType | undefined>(() => {
    const stored = localStorage.getItem("template") || 'cigar';
    return validTemplates.includes(stored as TemplateType) ? (stored as TemplateType) : undefined;
  });

  // Properly typed initial state matching ResumeFormData interface
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // Update mode = the resume already had saved data when the page opened (not a first-time creation)
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const liveEdit = isUpdateMode && !!pdfUrl;
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const { status: maintenanceStatus } = useMaintenance();
  const maintenanceActive = maintenanceStatus === 'active';
  const maintenancePendingRef = useRef(false); // an edit is waiting to be saved once maintenance ends
  // set when the opened resume has unsaved edits on this device that differ from the saved copy
  const [draftChoice, setDraftChoice] = useState<{ draft: string; server: string } | null>(null);
  const requestIdRef = useRef(0); // ignore out-of-order responses
  const LAYOUT_DEBOUNCE_MS = 2500; // each regeneration is a server-side PDF render, wait for the user to stop dragging
  const activeTemplate: TemplateType = template ?? 'andromeda';
  const [sectionLayout, setSectionLayout] = useState<SectionLayout | undefined>(undefined);
  const [designOpen, setDesignOpen] = useState(false);
  const [designTab, setDesignTab] = useState<DesignTab>('sections');
  const sectionLayoutRef = useRef<SectionLayout | undefined>(undefined);
  const [fontFamily, setFontFamily] = useState<SavedFont | undefined>(undefined);
  const fontFamilyRef = useRef<SavedFont | undefined>(undefined);
  const [colorTheme, setColorTheme] = useState<ColorTheme | undefined>(undefined);
  const colorThemeRef = useRef<ColorTheme | undefined>(undefined);
  const [sectionTitles, setSectionTitles] = useState<SectionTitles | undefined>(undefined);
  const sectionTitlesRef = useRef<SectionTitles | undefined>(undefined);
  const resumeDataRef = useRef<ResumeFormData | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFormSubmitRef = useRef<(data: ResumeFormData) => Promise<void>>(async () => { });
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

  const applyResumeData = (resumeJson: string) => {
    try {
      setIsUpdateMode(true);
      const parsedData: ResumeFormData = JSON.parse(resumeJson);
      // the layout was arranged for another template: carry it over (column <-> single-column rules)
      const initialLayout = parsedData.sectionLayout && parsedData.sectionLayout.template !== activeTemplate
        ? convertLayout(parsedData.sectionLayout, activeTemplate, parsedData)
        : parsedData.sectionLayout;
      sectionLayoutRef.current = initialLayout;
      setSectionLayout(initialLayout);
      fontFamilyRef.current = parsedData.fontFamily;
      setFontFamily(parsedData.fontFamily);
      colorThemeRef.current = parsedData.colorTheme;
      setColorTheme(parsedData.colorTheme);
      sectionTitlesRef.current = parsedData.sectionTitles;
      setSectionTitles(parsedData.sectionTitles);
      setResumeData(parsedData);
      handleFormSubmit(parsedData); // Use parsedData directly!
    } catch (e) {
      // fallback if not JSON
      setIsUpdateMode(true);
      setResumeData(resumeJson as unknown as ResumeFormData);
      handleFormSubmit(resumeJson as unknown as ResumeFormData); // Use the fallback data directly!
    }
  };

  const fetchResumeData = async (ownerId: string) => {
    setResumeLoading(true);
    const resume_id = localStorage.getItem('id'); // resume id
    if (resume_id) {
      const request = await client.get(`/resume/fetch-data/${resume_id}/${ownerId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
      if (request.data?.resume_data) {
        // Edits kept on this device while maintenance blocked saving: ask before they get replaced by the saved copy.
        const draft = readDraft(localStorage, 'resume', resume_id);
        if (draft && shouldOfferDraft(draft.data, request.data.resume_data)) {
          setDraftChoice({ draft: draft.data, server: request.data.resume_data });
          return; // the page stays on the loader until the user chooses
        }
        applyResumeData(request.data.resume_data);
      }
    }
    setResumeLoading(false);
  };

  const resolveDraft = (keepLocal: boolean) => {
    if (!draftChoice) return;
    const chosen = keepLocal ? draftChoice.draft : draftChoice.server;
    localStorage.setItem('resumeFormData', chosen); // the form reads its fields from here
    clearDraft(localStorage, 'resume');
    setDraftChoice(null);
    applyResumeData(chosen); // keeping the draft also saves it to the server
    setResumeLoading(false);
  };

  // The store is empty after a reload, so take the user id from the cookie (what ProtectedRoute checks)
  // instead of the store: waiting on the store sent every reload back to the dashboard.
  useEffect(() => {
    toast.dismiss();
    getCsrfToken();
    const ownerId = Cookies.get('user.id') || '';
    setUserId(ownerId);
    if (ownerId && resumeId) {
      fetchResumeData(ownerId);
    } else {
      navigate('/dashboard');
    }
  }, []);

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

  // Maintenance: keep the latest document in memory and on the device, and save it when maintenance ends.
  const pauseForMaintenance = (data: ResumeFormData) => {
    resumeDataRef.current = data;
    maintenancePendingRef.current = true;
    const id = localStorage.getItem('id');
    if (id) saveDraft(localStorage, 'resume', id, JSON.stringify(data));
    setLiveStatus('paused');
  };

  const handleFormSubmit = async (formData: ResumeFormData) => {
    // the layout, section names, font and color theme live outside the form; always attach the current ones (undefined is dropped from the JSON)
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current };
    if (isMaintenanceActive()) {
      pauseForMaintenance(data);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    try {
      resumeDataRef.current = data;
      setResumeData(data);
      await saveResumeData(data);
      clearDraft(localStorage, 'resume'); // saved: nothing is waiting on this device any more
      const htmlContent = renderToString(<ResumePreview data={data} template={template} />);
      const payload = pdfPayload(data, htmlContent, template || 'andromeda');

      const requestData = await formRequest("POST", `/resume/generate`, payload);
      const blob = new Blob([requestData?.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (requestId !== requestIdRef.current) { // a newer edit superseded this one
        URL.revokeObjectURL(url);
        return;
      }
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      if (liveEdit) setLiveStatus('saved');
    } catch (error) {
      if (isMaintenanceActive()) { // the 503 arrived before the next status poll: not an error, keep the edit
        pauseForMaintenance(data);
        return;
      }
      console.error("Error: ", error);
      if (liveEdit) setLiveStatus('error');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }
  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced layout callback

  // When maintenance ends, save the kept document once (several tabs on this resume: only one saves).
  useOnMaintenanceEnd(() => {
    if (!maintenancePendingRef.current || !resumeDataRef.current) return;
    if (!claimSaveLock(localStorage, `maintenance-save:resume:${localStorage.getItem('id')}`, TAB_ID, Date.now())) return;
    maintenancePendingRef.current = false;
    void handleFormSubmitRef.current(resumeDataRef.current);
  });

  // each change is a server-side PDF render: wait for the user to stop before saving and regenerating
  const queueRegenerate = () => {
    clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => {
      layoutTimerRef.current = undefined;
      if (resumeDataRef.current) void handleFormSubmitRef.current(resumeDataRef.current);
    }, LAYOUT_DEBOUNCE_MS);
  };

  const handleLayoutChange = (next: SectionLayout | undefined) => {
    sectionLayoutRef.current = next;
    setSectionLayout(next);
    queueRegenerate();
  };

  const handleTitlesChange = (next: SectionTitles | undefined) => {
    sectionTitlesRef.current = next;
    setSectionTitles(next);
    queueRegenerate();
  };

  const handleFontChange = (next: SavedFont | undefined) => {
    fontFamilyRef.current = next;
    setFontFamily(next);
    queueRegenerate();
  };

  const handleColorChange = (next: ColorTheme | undefined) => {
    colorThemeRef.current = next;
    setColorTheme(next);
    queueRegenerate();
  };

  // Switch template from the Design panel: the section order follows the same conversion rules as when a
  // resume is opened on another template; font and color choices are saved per template and simply stop applying.
  const handleTemplateChange = (id: string) => {
    if (!validTemplates.includes(id as TemplateType) || id === activeTemplate) return;
    const next = id as TemplateType;
    localStorage.setItem('template', next);
    clearTimeout(layoutTimerRef.current); // the regeneration below saves whatever is pending
    layoutTimerRef.current = undefined;
    if (sectionLayoutRef.current) {
      const converted = convertLayout(sectionLayoutRef.current, next, resumeDataRef.current ?? resumeData);
      sectionLayoutRef.current = converted;
      setSectionLayout(converted);
    }
    setTemplate(next);
  };

  // regenerate the preview as soon as the template changes (runs after the render that carries the new template)
  const previousTemplateRef = useRef(template);
  useEffect(() => {
    if (previousTemplateRef.current === template) return;
    previousTemplateRef.current = template;
    if (resumeDataRef.current) void handleFormSubmitRef.current(resumeDataRef.current);
  }, [template]);

  // save a layout change that is still waiting on the debounce (leaving the page, exporting)
  const flushPendingLayout = () => {
    if (layoutTimerRef.current === undefined) return;
    clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = undefined;
    if (resumeDataRef.current) void handleFormSubmitRef.current(resumeDataRef.current);
  };

  useEffect(() => () => flushPendingLayout(), []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const redirectResumes = () => {
    flushPendingLayout();
    const toastId = toast.loading("Redirecting to Resume Dashboards...");
    setTimeout(() => {
      toast.dismiss(toastId);
      clearStorageKeepingDrafts(localStorage);
      navigate("/dashboard");
    }, 1600);
  }

  return (
    resumeLoading ? (
      <>
        <Loader label="Loading your resume..." />
        <DraftRecoveryDialog
          open={draftChoice !== null}
          noun="resume"
          onKeepLocal={() => resolveDraft(true)}
          onUseSaved={() => resolveDraft(false)}
        />
      </>
    ) : (
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <MaintenanceBanner variant="editor" />
        <EditorTopBar
          templateLabel={`Template: ${(template || 'andromeda').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`}
          status={liveEdit ? liveStatus : 'idle'}
          designOpen={designOpen}
          canOpenDesign={!!pdfUrl}
          onToggleDesign={() => setDesignOpen((open) => !open)}
          onDashboard={redirectResumes}
          onExport={() => handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current })}
          exporting={loadingExport}
          canExport={!!pdfUrl && !maintenanceActive}
          exportHint={maintenanceActive ? 'Export is paused during maintenance' : undefined}
        />
        {/* Fixed Navigation Sidebar */}
        <SectionRail items={sidebarItems} onSelect={scrollToSection} />

        {/* Main Content Area - Adjusted for fixed sidebar */}
        <div className="flex-1 pl-12 flex flex-col lg:flex-row overflow-hidden">
          {/* Form Sidebar */}
          <div
            className="ec-formcol h-1/2 lg:h-full flex flex-col overflow-hidden relative"
            style={{
              width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '100%',
              minWidth: window.innerWidth >= 1024 ? `${sidebarMin}px` : 'auto',
              maxWidth: window.innerWidth >= 1024 ? `${sidebarMax}px` : 'none',
              transition: isResizing ? 'none' : 'width 0.15s cubic-bezier(.4,2,.6,1)',
            }}
          >
            {/* Header - Fixed */}
            <div className="ec-colhead">
              <p className="l-eyebrow l-muted m-0">Edit resume</p>
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
                liveEdit={liveEdit}
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
              className={`ec-resize hidden lg:flex absolute top-0 right-0 h-full w-4 items-center justify-center cursor-ew-resize z-30 ${isResizing ? 'is-active' : ''}`}
              style={{
                touchAction: 'none',
              }}
              aria-label="Resize sidebar"
              role="separator"
            >
              <GripVertical size={22} className="ec-resize__grip" />
            </div>
          </div>

          {/* Preview Area - Now properly calculated */}
          <div
            className="h-1/2 lg:h-full flex flex-col overflow-hidden"
            style={{
              width: window.innerWidth >= 1024 ? `calc(100% - ${sidebarWidth}px - ${designOpen ? DESIGN_PANEL_WIDTH : 0}px)` : '100%',
            }}
          >
            {/* Preview Content - Scrollable */}
            <div className="ec-canvas flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
              {loading && !liveEdit ? (
                <div className="ec-state">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="ec-state__title">Generating your PDF preview...</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please wait while we generate your resume preview.
                  </p>
                </div>
              ) : pdfUrl ? (
                <div className="ec-page h-full overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#sidebar=0&zoom=100&toolbar=0`}
                    className={`w-full h-full border-none ${isResizing ? 'pointer-events-none' : ''}`} // the iframe would swallow mouseup and the drag would never end
                    title="Resume Preview"
                  />
                </div>
              ) : (
                <div className="ec-state">
                  <FileIcon className="w-8 h-8 mb-2" />
                  <p className="ec-state__title">No PDF generated yet</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please complete and submit the form to generate your resume preview
                  </p>
                </div>
              )}
            </div>
          </div>

          {designOpen && (
            <DesignPanel
              tab={designTab}
              onTabChange={setDesignTab}
              onClose={() => setDesignOpen(false)}
              isDarkMode={isDarkMode}
              template={activeTemplate}
              fontSaved={fontFamily}
              onFontChange={handleFontChange}
              sections={{ template: activeTemplate, data: resumeData, layout: sectionLayout, onChange: handleLayoutChange, titles: sectionTitles, onTitlesChange: handleTitlesChange }}
              color={isColorTemplate(activeTemplate) ? { template: activeTemplate, theme: colorTheme, onChange: handleColorChange } : undefined}
              templates={{ kind: 'resume', current: activeTemplate, onSelect: handleTemplateChange }}
            />
          )}
        </div>
      </div>
    )
  );
};

export default Preview;