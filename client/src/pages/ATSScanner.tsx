import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  ScanText,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from '@/components/LogoutButton';

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ['application/pdf'];

type Verdict = 'friendly' | 'partial' | 'not_friendly';
type CheckStatus = 'pass' | 'warn' | 'fail';

interface ScanCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

interface ScanResult {
  verdict: Verdict;
  score: number; // 0-100 readability score
  parseTimeMs: number;
  pagesRead: number;
  totalPages: number;
  checks: ScanCheck[];
  extractedText: string;
}

// Scan progress steps shown while a scan is running
const SCAN_STEPS = [
  'Uploading your resume...',
  'Reading the text layer...',
  'Checking sections and structure...',
  'Evaluating results...',
];

const VERDICT_META: Record<Verdict, { title: string; description: string; classes: string; barClasses: string; Icon: React.ElementType }> = {
  friendly: {
    title: 'ATS-friendly',
    description: 'All of your resume data was read quickly and completely.',
    classes: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    barClasses: 'bg-green-600 dark:bg-green-400',
    Icon: CheckCircle2,
  },
  partial: {
    title: 'Partially ATS-friendly',
    description: 'Most of your resume was read, but some data was slow or hard to read.',
    classes: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    barClasses: 'bg-yellow-600 dark:bg-yellow-400',
    Icon: AlertTriangle,
  },
  not_friendly: {
    title: 'Not ATS-friendly',
    description: 'An ATS would likely miss or misread important parts of this resume.',
    classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    barClasses: 'bg-red-600 dark:bg-red-400',
    Icon: XCircle,
  },
};

const CHECK_ICON: Record<CheckStatus, { Icon: React.ElementType; classes: string }> = {
  pass: { Icon: CheckCircle2, classes: 'text-green-600 dark:text-green-400' },
  warn: { Icon: AlertTriangle, classes: 'text-yellow-600 dark:text-yellow-400' },
  fail: { Icon: XCircle, classes: 'text-red-600 dark:text-red-400' },
};

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const ATSScanner: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearStepTimers = () => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  };

  useEffect(() => {
    toast.dismiss();
    return clearStepTimers; // don't leave timers running after leaving the page
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(e.target.files?.[0]);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
  };

  // The API is a single request, so the progress steps are paced on a timer while it runs
  const startStepProgress = () => {
    clearStepTimers();
    setScanStep(0);
    [1500, 3500, 6000].forEach((delay, index) => {
      stepTimers.current.push(setTimeout(() => setScanStep(index + 1), delay));
    });
  };

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

  // Upload the PDF and show what an ATS would read from it
  const handleScan = async () => {
    if (!file || scanning) return;

    setScanning(true);
    startStepProgress();

    try {
      await getCsrfToken();
      const formData = new FormData();
      formData.append('resume', file);

      const response = await client.post<{ success: boolean; result: ScanResult }>('/ats/scan', formData);
      setResult(response.data.result);
    } catch (error) {
      console.error('ATS scan failed:', error);
      toast.error(getScanErrorMessage(error));
    } finally {
      clearStepTimers();
      setScanning(false);
      setScanStep(0);
    }
  };

  // Clear the current file and result so the user can scan another resume
  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  const verdictMeta = result ? VERDICT_META[result.verdict] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <LogoutButton />
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="ResumeForge" className="w-15 h-15 bg-transparent" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">ATS Scanner</h1>
              <p className="text-gray-600 mt-1 dark:text-gray-400">
                Upload your resume and see if an ATS can read it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle styleClass="shadow-md border border-gray-200 p-2 rounded-full dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            <Button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </div>
        </div>

        {/* Upload card */}
        {!result && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center gap-3 py-16 px-6 rounded-xl border-2 border-dashed cursor-pointer text-center transition-colors duration-200 ${dragActive
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                  : 'border-gray-300 hover:border-yellow-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-slate-700/50'
                  }`}
              >
                <UploadCloud className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Drag & drop your resume here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click to browse &middot; PDF only, up to {MAX_FILE_SIZE_MB} MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected file */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  {!scanning && (
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Scanning progress */}
                {scanning && (
                  <div className="space-y-3">
                    {SCAN_STEPS.map((step, index) => (
                      <div
                        key={step}
                        className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${index > scanStep ? 'opacity-40' : 'opacity-100'
                          }`}
                      >
                        {index < scanStep ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : index === scanStep ? (
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600" />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg shadow transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanText className="w-5 h-5" />
                      Scan Resume
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && verdictMeta && (
          <div className="space-y-6">
            {/* Verdict */}
            <div className={`flex items-start gap-4 p-6 rounded-2xl border ${verdictMeta.classes}`}>
              <verdictMeta.Icon className="w-10 h-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-2xl font-bold">{verdictMeta.title}</h2>
                  <p className="text-2xl font-bold whitespace-nowrap">
                    {result.score}<span className="text-base font-semibold opacity-70">/100</span>
                  </p>
                </div>
                <p className="mt-1">{verdictMeta.description}</p>
                <div
                  className="mt-4 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-label="Readability score"
                  aria-valuenow={result.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={`h-full rounded-full transition-all duration-700 ${verdictMeta.barClasses}`} style={{ width: `${result.score}%` }} />
                </div>
                <p className="mt-2 text-xs opacity-70">Readability score: how completely and cleanly an ATS can read your file.</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time to read</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {(result.parseTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pages read</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {result.pagesRead} of {result.totalPages}
                  </p>
                </div>
              </div>
            </div>

            {/* Checks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Findings</h3>
              <ul className="space-y-4">
                {result.checks.map((check) => {
                  const { Icon, classes } = CHECK_ICON[check.status];
                  return (
                    <li key={check.id} className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${classes}`} />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{check.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{check.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Extracted text */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">What the ATS sees</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                This is the raw text extracted from your file. If it looks scrambled or incomplete, an ATS will see the same.
              </p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm p-4 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {result.extractedText || 'No text could be extracted from this file.'}
              </pre>
            </div>

            <Button
              onClick={handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Another Resume
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSScanner;
