import React, { useEffect, useRef, useState } from 'react';
import { ScanText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import AppShell from '@/components/app-shell/AppShell';
import IdleSteps from '@/components/ats/IdleSteps';
import PrivacyNote from '@/components/ats/PrivacyNote';
import ScanDropzone from '@/components/ats/ScanDropzone';
import ScanFileCard from '@/components/ats/ScanFileCard';
import ScanProgress from '@/components/ats/ScanProgress';
import ScanResults from '@/components/ats/ScanResults';
import { INITIAL_PACING, TICK_MS, tick } from '@/components/ats/scan-progress';
import type { PacingState } from '@/components/ats/scan-progress';
import type { ScanResult } from '@/components/ats/types';
import '@/styles/ats.css';

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ['application/pdf'];

const getScanErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; retryAfter?: number } | undefined;
    if (error.response?.status === 429) {
      const minutes = Math.ceil((data?.retryAfter ?? 1800) / 60);
      return `You've reached the scan limit. Please try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Your session has expired or is invalid. Please sign in again.';
    }
    if (data?.error) return data.error;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while scanning your resume.';
};

const ATSScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pacing, setPacing] = useState<PacingState>(INITIAL_PACING);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null); // the response, held until the steps finish
  const [result, setResult] = useState<ScanResult | null>(null); // revealed results

  const pacingRef = useRef<PacingState>(INITIAL_PACING);
  const pendingRef = useRef<ScanResult | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopTicking = () => {
    clearInterval(tickTimer.current);
    tickTimer.current = undefined;
  };

  useEffect(() => {
    toast.dismiss();
    return stopTicking; // don't leave the timer running after leaving the page
  }, []);

  const validateFile = (candidate: File): boolean => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      toast.error('Only PDF files are supported.');
      return false;
    }
    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }
    return true;
  };

  const handleFileSelected = (candidate: File | undefined) => {
    if (!candidate || !validateFile(candidate)) return;
    setFile(candidate);
    setResult(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
  };

  // The API is a single request, so the steps are paced locally: each shows for a minimum time, the last one
  // also waits for the response, and the results open only after every step has been checked off.
  const startPacing = () => {
    stopTicking();
    pacingRef.current = INITIAL_PACING;
    setPacing(INITIAL_PACING);
    tickTimer.current = setInterval(() => {
      const next = tick(pacingRef.current, TICK_MS, pendingRef.current !== null);
      pacingRef.current = next.state;
      setPacing(next.state);
      if (next.reveal) {
        stopTicking();
        setResult(pendingRef.current);
        setScanning(false);
      }
    }, TICK_MS);
  };

  // Upload the PDF and show what an ATS would read from it
  const handleScan = async () => {
    if (!file || scanning) return;

    setScanning(true);
    pendingRef.current = null;
    setPendingResult(null);
    startPacing();

    try {
      await getCsrfToken();
      const formData = new FormData();
      formData.append('resume', file);

      const response = await client.post<{ success: boolean; result: ScanResult }>('/ats/scan', formData);
      pendingRef.current = response.data.result;
      setPendingResult(response.data.result);
    } catch (error) {
      console.error('ATS scan failed:', error);
      toast.error(getScanErrorMessage(error));
      stopTicking();
      setScanning(false);
      setPacing(INITIAL_PACING);
    }
  };

  // Clear the current file and result so the user can scan another resume
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setPendingResult(null);
    pendingRef.current = null;
  };

  const phase = result ? 'results' : scanning ? 'scanning' : file ? 'selected' : 'idle';

  return (
    <AppShell>
      <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
        {phase === 'results' && result ? (
          <>
            <h1 className="sr-only">ATS scanner</h1>
            <ScanResults result={result} fileName={file?.name ?? 'Your resume'} onReset={handleReset} />
          </>
        ) : (
          <>
            <header className="mb-8">
              <h1 className="app-title m-0">ATS scanner</h1>
              <p className="l-muted m-0 mt-1 text-sm">Upload your resume and see if an ATS can read it.</p>
            </header>

            <div className="flex max-w-2xl flex-col gap-4">
              {phase === 'idle' && (
                <>
                  <ScanDropzone maxSizeMb={MAX_FILE_SIZE_MB} onFile={handleFileSelected} />
                  <IdleSteps />
                  <PrivacyNote />
                </>
              )}

              {file && phase !== 'idle' && (
                <ScanFileCard file={file} onRemove={phase === 'selected' ? handleRemoveFile : undefined} />
              )}

              {file && phase === 'scanning' && (
                <ScanProgress step={pacing.step} finished={pacing.finished} file={file} result={pendingResult} />
              )}

              {file && (phase === 'selected' || phase === 'scanning') && (
                <button
                  type="button"
                  className="l-btn l-btn--primary w-full"
                  onClick={handleScan}
                  disabled={scanning}
                  aria-busy={scanning || undefined}
                >
                  {scanning ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanText aria-hidden="true" className="size-4" />
                      Scan resume
                    </>
                  )}
                </button>
              )}

              {phase === 'selected' && <PrivacyNote />}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ATSScanner;
