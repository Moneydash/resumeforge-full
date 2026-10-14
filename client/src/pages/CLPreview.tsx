import React, { useEffect, useRef, useState } from 'react';
import CLForm from '../components/CLForm';
import { useTheme } from '../contexts/ThemeContext';
import type { CLFormData } from '@/types/interface.cl-form-data';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import {
  User,
  Building2,
  MessageSquare,
  FileIcon,
  Loader2,
  GripVertical
} from 'lucide-react';
import type { CLTemplateType } from '@/types';
import { renderToString } from 'react-dom/server';
import { getCsrfToken, pdfPayloadv2 } from '@/utils/helper';
import CLTemplateComponent from '@/components/CoverLetterTemplateComponent';
import { formRequest } from '@/api/request';
import { saveAs } from 'file-saver';
import client from '@/api/axiosInstance';
import Cookies from 'js-cookie';
import { useMainStore } from '@/store/useMainStore';
import DesignPanel, { DESIGN_PANEL_WIDTH, type DesignTab } from '@/components/DesignPanel';
import EditorTopBar from '@/components/editor-chrome/EditorTopBar';
import Loader from '@/components/SuspenseLoader';
import SectionRail from '@/components/editor-chrome/SectionRail';
import type { SavedFont } from '@/utils/fonts';
import { editorStatus, type LiveStatus } from '@/components/editor-chrome/status';
import MaintenanceScreen from '@/components/maintenance/MaintenanceScreen';
import MaintenanceBanner from '@/components/maintenance/MaintenanceBanner';
import DraftRecoveryDialog from '@/components/maintenance/DraftRecoveryDialog';
import { useMaintenance, useOnMaintenanceEnd } from '@/maintenance/hooks';
import { isMaintenanceActive } from '@/maintenance/store';
import { chooseSaveSource, clearDraft, clearStorageKeepingDrafts, readDraft, saveDraft, shouldOfferDraft } from '@/maintenance/draft';
import { claimSaveLock, TAB_ID } from '@/maintenance/lock';

const CLPreview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [clLoading, setCLLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // resize sidebar state
  const sidebarDefault = 550;
  const [sidebarWidth, setSidebarWidth] = useState<number>(sidebarDefault); // Set default width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarMin = 280;
  const sidebarMax = 650;
  const clId = localStorage.getItem('cl-id');

  // the selected template: restored from localStorage, switchable from the Design panel without leaving the page
  const validTemplates: CLTemplateType[] = ['aether', 'terra', 'aqua', 'ignis', 'ventus'];
  const [template, setTemplate] = useState<CLTemplateType | undefined>(() => {
    const stored = localStorage.getItem("cl-template") || 'aether';
    return validTemplates.includes(stored as CLTemplateType) ? (stored as CLTemplateType) : undefined;
  });

  const userId = useMainStore((state) => state.userId);
  const setUserId = useMainStore((state) => state.setUserId);

  // Properly typed initial state matching CLFormData interface
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // Update mode = the cover letter already had saved data when the page opened (not a first-time creation)
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const liveEdit = isUpdateMode && !!pdfUrl;
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const { status: maintenanceStatus } = useMaintenance(false);
  const maintenanceActive = maintenanceStatus === 'active';
  const maintenancePendingRef = useRef(false); // an edit is waiting to be saved once maintenance ends
  const draftStoredRef = useRef(false); // the paused edit made it into the shared draft on this device
  const loadRetryRef = useRef(false); // the cover letter could not be loaded because maintenance began first
  const [loadBlocked, setLoadBlocked] = useState(false);
  // set when the opened cover letter has unsaved edits on this device that differ from the saved copy
  const [draftChoice, setDraftChoice] = useState<{ draft: string; server: string } | null>(null);
  const requestIdRef = useRef(0); // ignore out-of-order responses
  const FONT_DEBOUNCE_MS = 2500; // each regeneration is a server-side PDF render, wait for the user to stop changing fonts
  const [designOpen, setDesignOpen] = useState(false);
  const [designTab, setDesignTab] = useState<DesignTab>('font');
  const [fontFamily, setFontFamily] = useState<SavedFont | undefined>(undefined);
  const fontFamilyRef = useRef<SavedFont | undefined>(undefined);
  const clDataRef = useRef<CLFormData | null>(null);
  const fontTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFormSubmitRef = useRef<(data: CLFormData) => Promise<void>>(async () => { });
  const [clData, setCLData] = useState<CLFormData>({
    sender: {
      name: '',
      email: '',
      phone: '',
      address: '',
      location: '',
      linkedin: '',
      job_title: ''
    },
    recipient: {
      name: '',
      title: '',
      company: '',
      address: ''
    },
    content: {
      introduction: '',
      body: '',
      closing: ''
    }
  });

  const senderRef = useRef<HTMLDivElement>(null!);
  const recipientRef = useRef<HTMLDivElement>(null!);
  const contentRef = useRef<HTMLDivElement>(null!);

  // Create a ref for the form container
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Sidebar navigation items
  const sidebarItems: Array<{
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    ref: React.RefObject<HTMLDivElement>;
  }> = [
      { icon: User, label: 'Sender Information', ref: senderRef },
      { icon: Building2, label: 'Recipient Details', ref: recipientRef },
      { icon: MessageSquare, label: 'Letter Content', ref: contentRef },
    ];

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection during resize
  };

  // Fetch cover letter data on component mount
  const applyCLData = (clJson: string) => {
    try {
      setIsUpdateMode(true);
      const parsedData = JSON.parse(clJson);
      fontFamilyRef.current = parsedData.fontFamily;
      setFontFamily(parsedData.fontFamily);
      setCLData(parsedData);
      handleFormSubmit(parsedData);
    } catch (e) {
      setIsUpdateMode(true);
      setCLData(clJson as unknown as CLFormData);
      handleFormSubmit(clJson as unknown as CLFormData);
    }
  };

  const fetchCLData = async () => {
    setCLLoading(true);
    const coverLetterId = localStorage.getItem('cl-id');
    let keepLoading = false;
    try {
      const request = await client.get(`/cover-letter/fetch-data/${coverLetterId}/${userId}`)
      const serverJson: string | undefined = request.data?.cover_letter_data;
      localStorage.setItem('clFormData', request.data?.cover_letter_data);
      // Edits kept on this device while maintenance blocked saving: ask before they get replaced by the saved copy
      // (also when the cover letter has no saved copy yet).
      const draft = coverLetterId ? readDraft(localStorage, 'cover-letter', coverLetterId) : null;
      if (draft && (!serverJson || shouldOfferDraft(draft.data, serverJson))) {
        setDraftChoice({ draft: draft.data, server: serverJson ?? '' });
        keepLoading = true; // the page stays on the loader until the user chooses
      } else if (serverJson) {
        applyCLData(serverJson);
      }
    } catch (error) {
      if (isMaintenanceActive()) { // maintenance started between status polls: wait it out, then load again
        loadRetryRef.current = true;
        setLoadBlocked(true);
        keepLoading = true;
      } else {
        console.error('Error fetching cover letter data:', error);
        toast.error('Failed to load cover letter data');
      }
    } finally {
      if (!keepLoading) setCLLoading(false);
    }
  };

  const resolveDraft = (keepLocal: boolean) => {
    if (!draftChoice) return;
    const chosen = keepLocal ? draftChoice.draft : draftChoice.server;
    if (chosen) localStorage.setItem('clFormData', chosen); // the form reads its fields from here
    const id = localStorage.getItem('cl-id');
    if (id) clearDraft(localStorage, 'cover-letter', id);
    setDraftChoice(null);
    if (chosen) applyCLData(chosen); // keeping the draft also saves it to the server
    setCLLoading(false);
  };

  useEffect(() => {
    toast.dismiss();
    setUserId(Cookies.get('user.id') || '');
  });

  useEffect(() => {
    getCsrfToken();
    if (clId && userId) {
      fetchCLData();
    } else {
      navigate('/cl-dashboard');
    }
  }, [clId]);

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

  // Save cover letter data. Returns whether it saved; `silent` skips the error toast (used by live edit).
  const saveCLData = async (data: CLFormData, silent = false): Promise<boolean> => {
    try {
      await client.post(`/cover-letter/save-data`, {
        clData: data,
        id: localStorage.getItem('cl-id') || null,
        userId: Cookies.get('user.id'),
        template: template,
      });
      localStorage.setItem('clFormData', JSON.stringify(data));
      const savedId = localStorage.getItem('cl-id');
      if (savedId) clearDraft(localStorage, 'cover-letter', savedId); // saved: nothing is waiting on this device any more
      setCLData(data);
      return true;
    } catch (error) {
      if (isMaintenanceActive()) return false; // not an error: handleFormSubmit keeps the edit
      console.error('Error saving cover letter data:', error);
      if (!silent) toast.error('Failed to save cover letter data');
      return false;
    }
  };

  const saveCLExports = async () => {
    try {
      await client.post(`/cover-letter/save-exports/${clId}/${userId}`, {
        template: template,
      });
    } catch (error) {
      console.error('Failed saving resume exports: ', error);
      throw error;
    }
  }

  // Handle form submission
  // Maintenance: keep the latest document in memory and on the device, and save it when maintenance ends.
  const pauseForMaintenance = (data: CLFormData) => {
    clDataRef.current = data;
    maintenancePendingRef.current = true;
    const id = localStorage.getItem('cl-id');
    draftStoredRef.current = id ? saveDraft(localStorage, 'cover-letter', id, JSON.stringify(data)) : false;
    setLiveStatus('paused');
  };

  const handleFormSubmit = async (formData: CLFormData) => {
    // the font lives outside the form; always attach the current one (undefined is dropped from the JSON)
    const data: CLFormData = { ...formData, fontFamily: fontFamilyRef.current };
    if (isMaintenanceActive()) {
      pauseForMaintenance(data);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    clDataRef.current = data;
    try {
      setCLData(data);
      const saved = await saveCLData(data, liveEdit);

      const htmlContent = renderToString(<CLTemplateComponent data={data} template={template} />);
      const payload = pdfPayloadv2(data, htmlContent, template || 'aether');

      const requestData = await formRequest("POST", `/cover-letter/generate-cl`, payload);
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
      if (liveEdit) setLiveStatus(saved ? 'saved' : 'error');
    } catch (error) {
      if (isMaintenanceActive()) { // the 503 arrived before the next status poll: not an error, keep the edit
        pauseForMaintenance(data);
        return;
      }
      console.error('Error generating cover letter:', error);
      if (liveEdit) {
        setLiveStatus('error');
      } else {
        toast.error('Failed to generate cover letter');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced font callback

  // When maintenance ends, save the kept document once (several tabs on this cover letter: only one saves).
  useOnMaintenanceEnd(() => {
    if (loadRetryRef.current) { // the cover letter could not load because maintenance began first: load it now
      loadRetryRef.current = false;
      setLoadBlocked(false);
      void fetchCLData();
      return;
    }
    if (!maintenancePendingRef.current) return;
    maintenancePendingRef.current = false;
    const id = localStorage.getItem('cl-id');
    if (!claimSaveLock(localStorage, `maintenance-save:cover-letter:${id}`, TAB_ID, Date.now())) {
      setLiveStatus('idle'); // another tab saves it
      return;
    }
    // Save the newest edit from any tab (the shared draft), not necessarily this tab's own copy.
    const source = chooseSaveSource(
      id ? readDraft(localStorage, 'cover-letter', id) : null,
      draftStoredRef.current,
      clDataRef.current ? JSON.stringify(clDataRef.current) : null,
    );
    if (source.kind === 'skip') {
      setLiveStatus('idle');
      return;
    }
    void (async () => {
      await getCsrfToken().catch(() => { }); // the server may have restarted: get a fresh token before saving
      await handleFormSubmitRef.current(JSON.parse(source.json));
    })();
  });

  const handleFontChange = (next: SavedFont | undefined) => {
    fontFamilyRef.current = next;
    setFontFamily(next);
    clearTimeout(fontTimerRef.current);
    fontTimerRef.current = setTimeout(() => {
      fontTimerRef.current = undefined;
      if (clDataRef.current) void handleFormSubmitRef.current(clDataRef.current);
    }, FONT_DEBOUNCE_MS);
  };

  // save a font change that is still waiting on the debounce (leaving the page)
  const flushPendingFont = () => {
    if (fontTimerRef.current === undefined) return;
    clearTimeout(fontTimerRef.current);
    fontTimerRef.current = undefined;
    if (clDataRef.current) void handleFormSubmitRef.current(clDataRef.current);
  };

  useEffect(() => () => flushPendingFont(), []);

  // Switch template from the Design panel. The font choice is saved per template, so it simply stops applying.
  const handleTemplateChange = (id: string) => {
    if (!validTemplates.includes(id as CLTemplateType) || id === (template ?? 'aether')) return;
    localStorage.setItem('cl-template', id);
    clearTimeout(fontTimerRef.current); // the regeneration below saves whatever is pending
    fontTimerRef.current = undefined;
    setTemplate(id as CLTemplateType);
  };

  // regenerate the preview as soon as the template changes (runs after the render that carries the new template)
  const previousTemplateRef = useRef(template);
  useEffect(() => {
    if (previousTemplateRef.current === template) return;
    previousTemplateRef.current = template;
    if (clDataRef.current) void handleFormSubmitRef.current(clDataRef.current);
  }, [template]);

  // Handle PDF export
  const handleExportPDF = async (data: CLFormData) => {
    setLoadingExport(true);
    const toastExport = toast.loading("Exporting your cover letter into PDF");
    try {
      await saveCLExports();
      const htmlContent = renderToString(<CLTemplateComponent data={data} template={template} />);
      const payload = pdfPayloadv2(data, htmlContent, template || 'aether');

      const requestData = await formRequest("POST", `/cover-letter/generate-cl`, payload);
      const blob = new Blob([requestData?.data], { type: 'application/pdf' });
      const fileName = localStorage.getItem('slug') || `${data.sender.name.toLowerCase().replace(/\s+/g, '-')}-cover-letter`;
      const file = `${fileName}.pdf`;
      saveAs(blob, file);
      toast.dismiss(toastExport);
      toast.success('PDF downloaded successfully!');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoadingExport(false);
    }
  };

  // Navigation functions
  const redirectDashboard = () => {
    flushPendingFont();
    const toastId = toast.loading("Redirecting to Cover Letter Dashboard...");
    setTimeout(() => {
      toast.dismiss(toastId);
      clearStorageKeepingDrafts(localStorage);
      navigate("/cl-dashboard");
    }, 1600);
  };

  return (
    clLoading ? (
      loadBlocked ? (
        <MaintenanceScreen />
      ) : (
        <>
          <Loader label="Loading your cover letter..." />
          <DraftRecoveryDialog
            open={draftChoice !== null}
            noun="cover letter"
            onKeepLocal={() => resolveDraft(true)}
            onUseSaved={() => resolveDraft(false)}
          />
        </>
      )
    ) : (
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <MaintenanceBanner variant="editor" />
        <EditorTopBar
          templateLabel={`Template: ${(template || 'aether').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`}
          status={editorStatus(liveEdit, liveStatus)}
          designOpen={designOpen}
          canOpenDesign={!!pdfUrl}
          onToggleDesign={() => setDesignOpen((open) => !open)}
          onDashboard={redirectDashboard}
          onExport={() => handleExportPDF({ ...clData, fontFamily: fontFamilyRef.current })}
          exporting={loadingExport}
          canExport={!!pdfUrl && !maintenanceActive}
          exportHint={maintenanceActive ? 'Export is paused during maintenance' : undefined}
        />
        {/* Fixed Navigation Sidebar */}
        <SectionRail items={sidebarItems} label="Cover letter sections" onSelect={scrollToSection} />

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
              <p className="l-eyebrow l-muted m-0">Edit cover letter</p>
            </div>

            {/* Form Content - Scrollable */}
            <div
              ref={formContainerRef}
              className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth no-scrollbar"
              style={{ scrollBehavior: 'smooth' }}
            >
              <CLForm
                onSubmit={handleFormSubmit}
                loading={loading}
                liveEdit={liveEdit}
                sectionRefs={{
                  senderRef,
                  recipientRef,
                  contentRef,
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
                  <p className="ec-state__title">Generating your cover letter preview...</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please wait while we generate your cover letter preview.
                  </p>
                </div>
              ) : pdfUrl ? (
                <div className="ec-page h-full overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#sidebar=0&zoom=100&toolbar=0`}
                    className={`w-full h-full border-none ${isResizing ? 'pointer-events-none' : ''}`} // the iframe would swallow mouseup and the drag would never end
                    title="Cover Letter Preview"
                  />
                </div>
              ) : (
                <div className="ec-state">
                  <FileIcon className="w-8 h-8 mb-2" />
                  <p className="ec-state__title">No cover letter generated yet</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please complete and submit the form to generate your cover letter preview
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
              template={template ?? 'aether'}
              fontSaved={fontFamily}
              onFontChange={handleFontChange}
              templates={{ kind: 'cover-letter', current: template ?? 'aether', onSelect: handleTemplateChange }}
            />
          )}
        </div>
      </div>
    )
  );
};

export default CLPreview;