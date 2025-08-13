import React, { useEffect, useState } from 'react';
import { Plus, FileText, Edit, Grid3X3, List, Trash2, CalendarDays, NotepadTextDashed, FilePlus2, FilePenLine, Copy, LayoutDashboard, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import client from '@/api/axiosInstance';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ResumeSummary } from "@/types";
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMainStore } from '@/store/useMainStore';
import { formatDateDisplay, formatTemplateName, getCsrfToken, slugify } from '@/utils/helper';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

// Import snapshot images
import andromedaImg from "@/assets/snapshots/galaxy/andromeda.jpg";
import cigarImg from "@/assets/snapshots/galaxy/cigar.jpg";
import cometImg from "@/assets/snapshots/galaxy/comet.jpg";
import milkyWayImg from "@/assets/snapshots/galaxy/milky-way.jpg";
import apolloImg from "@/assets/snapshots/greek/apollo.jpg";
import artemisImg from "@/assets/snapshots/greek/artemis.jpg";
import athenaImg from "@/assets/snapshots/greek/athena.jpg";
import heraImg from "@/assets/snapshots/greek/hera.jpg";
import hermesImg from "@/assets/snapshots/greek/hermes.jpg";
import zeusImg from "@/assets/snapshots/greek/zeus.jpg";

const STORAGE_KEY = 'resumes';

const Dashboard: React.FC = () => {
  // Get the snapshot image based on template id
  const getSnapshotImage = (templateId: string) => {
    const imageMap: Record<string, string> = {
      andromeda: andromedaImg,
      cigar: cigarImg,
      comet: cometImg,
      milky_way: milkyWayImg,
      apollo: apolloImg,
      artemis: artemisImg,
      athena: athenaImg,
      hera: heraImg,
      hermes: hermesImg,
      zeus: zeusImg,
    };
    return imageMap[templateId] || '';
  };
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);

  // resumes - zustand state
  const resumes = useDashboardStore((state) => state.resumes);
  const resumeName = useDashboardStore((state) => state.resumeName);
  const resumeSlug = useDashboardStore((state) => state.resumeSlug);
  const userId = useMainStore((state) => state.userId);
  const editIndex = useMainStore((state) => state.editIndex);

  // set - zustand set state
  const setResumes = useDashboardStore((state) => state.setResumes);
  const setResumeName = useDashboardStore((state) => state.setResumeName);
  const setResumeSlug = useDashboardStore((state) => state.setResumeSlug);
  const setUserId = useMainStore((state) => state.setUserId);
  const setEditIndex = useMainStore((state) => state.setEditIndex);

  const openDeleteDialog = (resumeId: string) => {
    setResumeToDelete(resumeId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setResumeToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDeleteResume = () => {
    if (resumeToDelete) {
      handleDeleteResume(resumeToDelete);
      closeDeleteDialog();
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await client.get(`/resume/fetch-resumes/${userId}`);
      // set All resumes on localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data?.resumes));
      setResumes(response.data?.resumes);
    } catch (error) {
      console.error('Failed to fetch all resumes: ', error);
      throw error;
    }
  };

  useEffect(() => {
    toast.dismiss(); // dismiss all toast upon loading
    setUserId(Cookies.get('user.id') || '');
    localStorage.clear();
  }, []);

  // Load resumes from localStorage
  useEffect(() => {
    getCsrfToken();
    if (userId) {
      fetchResumes();
    }
  }, [userId]);

  // Submit the resume => add new or rename
  const handleResumeSubmit = async () => {
    if (!resumeName || !resumeSlug) {
      if (editIndex) {
        toast.error('Please enter a name and slug for your resume.');
      } else {
        toast.error('Please enter a name and slug for your new resume.');
      }
      return;
    }
    try {
      const url = editIndex ? `rename/${resumeToDelete}/${userId}` : `create-init/${userId}`;
      await client.post(`/resume/${url}`, {
        name: resumeName,
        slug: resumeSlug,
      });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to add new resume: ', error);
      throw error;
    }
    fetchResumes();
  };

  const handleRename = async (resume: ResumeSummary) => {
    setResumeName(resume.resume_name);
    setResumeSlug(resume.resume_slug_name);
    setResumeToDelete(resume.id); // not for deleting, just for renaming
    setEditIndex(true);
    setCreateDialogOpen(true);
  }

  // Edit a resume (navigate to resume preview)
  const handleEditResume = (resume: ResumeSummary) => {
    if (!resume.template) {
      localStorage.removeItem('resumes');
      toast.loading('Redirecting to templates...');
      localStorage.setItem('slug', resume.resume_slug_name);
      setTimeout(() => {
        toast.dismiss();
        navigate(`/templates?resumeId=${resume.id}`);
      }, 1500);
    } else {
      toast.loading("Redirecting to Resume Preview");
      localStorage.setItem('id', resume.id);
      localStorage.setItem('template', resume.template);
      localStorage.setItem('slug', resume.resume_slug_name);
      localStorage.removeItem('resumes');
      setTimeout(() => {
        navigate(`/preview?template=${resume.template}&resumeId=${resume.id}`);
      }, 1500);
    }
  };

  // Delete resume function (empty for now)
  const handleDeleteResume = (resumeId: string) => {
    client.delete(`/resume/delete-resume/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      })
      .catch(error => {
        console.error("Failed to delete: ", error);
        throw error;
      });
  };

  const handleClone = (resumeId: string) => {
    client.post(`/resume/clone/${resumeId}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchResumes();
      }).catch(err => {
        console.error("Failed to Clone Resume: ", err);
        throw err;
      })
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = slugify(value);
    setResumeSlug(slug);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* dialog for delete resume confirmation --- start */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setResumeToDelete(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this resume? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button
              onClick={closeDeleteDialog}
              className="dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteResume}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* dialog for delete resume confirmation --- end */}

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setResumeName('');
            setResumeSlug('');
            setEditIndex(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resume</DialogTitle>
            <DialogDescription>
              Enter a name and slug for your new resume.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input
              placeholder="Resume Name"
              value={resumeName}
              onChange={e => setResumeName(e.target.value)}
            />
            <Input
              placeholder="Resume Slug"
              value={resumeSlug}
              onChange={handleSlugChange}
            />
            <small className="text-xs text-gray-500 ml-1 dark:text-gray-400" style={{ marginTop: '-10px' }}>This will be the file name saved on your computer.</small>
          </div>
          <DialogFooter>
            <Button onClick={handleResumeSubmit} className="flex items-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white">
              {editIndex ? 'Rename Resume' : 'Create Resume'} {editIndex ? <Edit className="w-4 h-4" /> : <FilePlus2 className="w-4 h-4" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            {/* <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg"> */}
            {/* <FileText className="w-8 h-8 text-white" /> */}
            <img src='/icon.png' className='w-15 h-15 bg-transparent' />
            {/* </div> */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Resumes</h1>
              <p className="text-gray-600 mt-1 dark:text-gray-400">{resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'} created</p>
            </div>
          </div>

          {/* Desktop Controls - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-1">
            <ThemeToggle styleClass="ml-2 shadow-md border border-gray-200 p-2 rounded-full dark:border-gray-600 dark:bg-gray-800 dark:text-white mr-2" />
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-xl p-1 gap-1 shadow-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'
                  }`}
              >
                <Grid3X3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'
                  }`}
              >
                <List className="w-3 h-3" />
              </button>
            </div>

            {/* Add Resume Button */}
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create New Resume
            </Button>
            {/* Cover Letter Maker Button */}
            <Button
              onClick={() => {
                toast.loading("Redirecting to Cover Letter Dashboard");
                setTimeout(() => {
                  navigate('/cl-dashboard');
                }, 1500);
              }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-green-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-green-600 transition-all duration-200"
            >
              <LayoutDashboard className="w-5 h-5" />
              Cover Letter Dashboard
            </Button>
            {/* ATS Scanner Button - commented, planning to add later */}
            {/* <Button
              onClick={() => { }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-yellow-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-yellow-600 transition-all duration-200"
            >
              <ScanText className="w-5 h-5" />
              ATS Scanner
            </Button> */}
          </div>

          {/* Mobile Hamburger Menu - Visible on small screens */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow hover:shadow-lg transition-all duration-200"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-900 dark:text-white" />
              ) : (
                <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
              )}
            </button>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                <div className="p-4 space-y-2">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Theme</span>
                    <ThemeToggle styleClass="shadow-md border border-gray-200 p-2 rounded-full dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </div>

                  {/* View Toggle */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">View Mode</span>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-1 gap-1">
                      <button
                        onClick={() => {
                          setViewMode('grid');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex-1 p-2 rounded-md transition-all duration-200 text-sm ${viewMode === 'grid'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600'
                          }`}
                      >
                        <Grid3X3 className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('list');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex-1 p-2 rounded-md transition-all duration-200 text-sm ${viewMode === 'list'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600'
                          }`}
                      >
                        <List className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-600" />

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setCreateDialogOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Resume
                    </Button>

                    <Button
                      onClick={() => {
                        toast.loading("Redirecting to Cover Letter Dashboard");
                        setTimeout(() => {
                          navigate('/cl-dashboard');
                        }, 1500);
                      }}
                      className="w-full justify-start gap-3 bg-green-700 border border-gray-600 text-white hover:bg-green-600"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Cover Letter Dashboard
                    </Button>

                    {/* <Button
                      onClick={() => {
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-3 bg-yellow-700 border border-gray-600 text-white hover:bg-yellow-600"
                    >
                      <ScanText className="w-4 h-4" />
                      ATS Scanner
                    </Button> */}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No resumes yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Get started by creating your first resume. Choose from our professional templates and build an impressive resume in minutes.
            </p>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Create Your First Resume
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2'
          }>
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500 transition-all duration-300 ${viewMode === 'grid' ? 'p-6' : 'p-6 flex items-center justify-between'
                  }`}
              >
                {viewMode === 'grid' ? (
                  // Grid View with Background Image
                  <>
                    {/* Background Image Section */}
                    {resume.template && getSnapshotImage(resume.template) && (
                      <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                        <div
                          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                          style={{
                            backgroundImage: `url('${getSnapshotImage(resume.template)}')`,
                          }}
                        >
                          {/* Subtle Overlay for Readability */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, 
                                rgba(255,255,255,0.1) 0%, 
                                rgba(255,255,255,0.05) 25%, 
                                rgba(255,255,255,0.02) 50%, 
                                rgba(255,255,255,0.1) 75%, 
                                rgba(255,255,255,0.2) 100%)`,
                              backdropFilter: 'blur(0.3px)',
                            }}
                          />

                        </div>

                        {/* Action Buttons Overlay - Outside scaling container */}
                        <div className="absolute top-3 right-3 flex flex-row gap-x-1 z-10">
                          <button
                            onClick={() => handleClone(resume.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Clone'
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRename(resume)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Rename'
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(resume.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Delete'
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Fallback for resumes without template or image */}
                    {(!resume.template || !getSnapshotImage(resume.template)) && (
                      <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                        <div
                          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                          style={{
                            background: '#bababa',
                          }}
                        >
                          {/* Subtle Overlay for Readability */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, 
                                rgba(255,255,255,0.1) 0%, 
                                rgba(255,255,255,0.05) 25%, 
                                rgba(255,255,255,0.02) 50%, 
                                rgba(255,255,255,0.1) 75%, 
                                rgba(255,255,255,0.2) 100%)`,
                              backdropFilter: 'blur(0.3px)',
                            }}
                          />

                        </div>

                        {/* Action Buttons Overlay - Outside scaling container */}
                        <div className="absolute top-3 right-3 flex flex-row gap-x-1 z-10">
                          <button
                            onClick={() => handleClone(resume.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Clone'
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRename(resume)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Rename'
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(resume.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                            title='Delete'
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors dark:text-white">
                        {resume.resume_name ? resume.resume_name : `Untitled`}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 dark:text-gray-400">
                        <NotepadTextDashed className="w-4 h-4" />
                        {resume.template ? formatTemplateName(resume.template) : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-4 h-4" />
                        {formatDateDisplay(resume.updated_at)}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleEditResume(resume)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
                    >
                      <FilePenLine className="w-4 h-4" />
                      Edit Resume
                    </Button>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors dark:text-white">
                          {resume.resume_name ? resume.resume_name : `Untitled`}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 mb-2 dark:text-gray-400">
                          <NotepadTextDashed className="w-4 h-4" />
                          Template: {resume.template ? formatTemplateName(resume.template) : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 dark:text-gray-400">
                          <CalendarDays className="w-4 h-4" />
                          Last modified {formatDateDisplay(resume.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDeleteDialog(resume.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title='Delete'
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleClone(resume.id)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title='Clone'
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRename(resume)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title='Rename'
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <Button
                        onClick={() => handleEditResume(resume)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
                      >
                        <FilePenLine className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;