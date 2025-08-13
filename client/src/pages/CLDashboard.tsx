import React, { useEffect, useState } from 'react';
import {
  Plus,
  FileText,
  Edit,
  Grid3X3,
  List,
  Trash2,
  CalendarDays,
  NotepadTextDashed,
  FilePlus2,
  FilePenLine,
  Copy,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ThemeToggle from '@/components/ThemeToggle';

// Import snapshot images for cover letter templates
import aetherImg from "@/assets/cl-snapshots/elements/aether.jpg";
import aquaImg from "@/assets/cl-snapshots/elements/aqua.jpg";
import ignisImg from "@/assets/cl-snapshots/elements/ignis.jpg";
import terraImg from "@/assets/cl-snapshots/elements/terra.jpg";
import ventusImg from "@/assets/cl-snapshots/elements/ventus.jpg";
import { useMainStore } from '@/store/useMainStore';
import Cookies from 'js-cookie';
import { formatDateDisplay, formatTemplateName, getCsrfToken, slugify } from '@/utils/helper';
import client from '@/api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Map template ids to images
const getSnapshotImage = (templateId: string) => {
  const imageMap: Record<string, string> = {
    aether: aetherImg,
    aqua: aquaImg,
    ignis: ignisImg,
    terra: terraImg,
    ventus: ventusImg,
  };
  return imageMap[templateId] || '';
};

const STORAGE_KEY = 'cover-letters';

const CLDashboard: React.FC = () => {
  // UI states
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Placeholder states for cover letters
  const [coverLetters, setCoverLetters] = useState<any[]>([]); // Replace 'any' with proper type
  const [coverLetterName, setCoverLetterName] = useState('');
  const [coverLetterSlug, setCoverLetterSlug] = useState('');
  const [coverLetterToDelete, setCoverLetterToDelete] = useState<string | null>(null);

  // zustand states
  const userId = useMainStore(state => state.userId);
  const setUserId = useMainStore(state => state.setUserId);
  const editIndex = useMainStore(state => state.editIndex);
  const setEditIndex = useMainStore(state => state.setEditIndex);

  // --- Empty function stubs for now ---
  const openDeleteDialog = (id: string) => {
    setCoverLetterToDelete(id);
    setDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setCoverLetterToDelete(null);
    setDeleteDialogOpen(false);
  };
  const confirmDeleteCoverLetter = () => {
    if (coverLetterToDelete) {
      handleDeleteCoverLetter(coverLetterToDelete);
      closeDeleteDialog();
    }
  };
  const handleCoverLetterSubmit = async () => {
    if (editIndex) {
      client.put(`/cover-letter/rename-cl/${coverLetterToDelete}/${userId}`, {
        name: coverLetterName,
        slug: coverLetterSlug
      })
        .then(res => {
          toast.success(res.data?.message);
          fetchCoverLetters();
        })
        .catch(error => {
          console.error("Failed to update your cover letter info: ", error);
          throw error;
        })
        .finally(() => {
          setEditIndex(false);
          setCreateDialogOpen(false);
          setCoverLetterName('');
          setCoverLetterSlug('');
        });
    } else {
      client.post(`/cover-letter/create-init/${userId}`, {
        name: coverLetterName,
        slug: coverLetterSlug,
      }).then(res => {
        toast.success(res.data?.message);
      }).catch((error) => {
        console.error('Failed to create cover letter: ', error);
        throw error;
      })
        .finally(() => {
          setCreateDialogOpen(false);
          fetchCoverLetters();
          setCoverLetterName('');
          setCoverLetterSlug('');
        });
    }
  };
  const handleRename = (coverLetter: any) => {
    setCoverLetterName(coverLetter.cover_letter_name);
    setCoverLetterSlug(coverLetter.cover_letter_slug_name);
    setCoverLetterToDelete(coverLetter.id);
    setEditIndex(true);
    setCreateDialogOpen(true);
  };
  const handleEditCoverLetter = (coverLetter: any) => {
    if (!coverLetter.template) {
      localStorage.removeItem('cover-letters');
      toast.loading('Redirecting to templates...');
      localStorage.setItem('cl-id', coverLetter.id);
      setTimeout(() => {
        toast.dismiss();
        navigate(`/cl-templates?coverLetterId=${coverLetter.id}`);
      }, 1500);
    } else {
      toast.loading("Redirecting to Cover Letter Preview");
      localStorage.removeItem('cover-letters');
      localStorage.setItem('cl-id', coverLetter.id);
      localStorage.setItem('cl-template', coverLetter.template);
      localStorage.setItem('cl-slug', coverLetter.cover_letter_slug);
      setTimeout(() => {
        navigate(`/cl-preview?template=${coverLetter.template}&clId=${coverLetter.id}`);
      });
    }
  };
  const handleDeleteCoverLetter = (id: string) => {
    client.delete(`/cover-letter/delete/${id}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchCoverLetters();
      })
      .catch((error) => {
        console.error('Failed to delete cover letter: ', error);
        throw error;
      });
  };
  const handleClone = (id: string) => {
    client.post(`/cover-letter/clone/${id}/${userId}`)
      .then(res => {
        toast.success(res.data?.message);
        fetchCoverLetters();
      })
      .catch(error => {
        console.error("Failed to clone the Cover Letter: ", error);
        throw error;
      });
  };
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = slugify(value);
    setCoverLetterSlug(slug);
  };

  const fetchCoverLetters = async () => {
    try {
      const response = await client.get(`/cover-letter/fetch-cover-letters/${userId}`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data?.cover_letters));
      setCoverLetters(response.data?.cover_letters);
    } catch (error) {
      console.error('Failed to fetch cover letters: ', error);
      throw error;
    }
  };

  useEffect(() => {
    toast.dismiss(); // dismiss all toast upon render
    setUserId(Cookies.get('user.id') || '');
    localStorage.clear();
  }, []);

  useEffect(() => {
    getCsrfToken();
    if (userId) {
      fetchCoverLetters();
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setCoverLetterToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cover Letter?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this cover letter? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button onClick={closeDeleteDialog} className="dark:text-white">Cancel</Button>
            <Button onClick={confirmDeleteCoverLetter} variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setCoverLetterName('');
          setCoverLetterSlug('');
          setEditIndex(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cover Letter</DialogTitle>
            <DialogDescription>Enter a name and slug for your new cover letter.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Input placeholder="Cover Letter Name" value={coverLetterName} onChange={e => setCoverLetterName(e.target.value)} />
            <Input placeholder="Cover Letter Slug" value={coverLetterSlug} onChange={handleSlugChange} />
            <small className="text-xs text-gray-500 ml-1 dark:text-gray-400" style={{ marginTop: '-10px' }}>
              This will be the file name saved on your computer.
            </small>
          </div>
          <DialogFooter>
            <Button onClick={handleCoverLetterSubmit} className="flex items-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white">
              {editIndex ? 'Rename Cover Letter' : 'Create Cover Letter'} {editIndex ? <Edit className="w-4 h-4" /> : <FilePlus2 className="w-4 h-4" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            <img src='/icon.png' className='w-15 h-15 bg-transparent' />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Cover Letters</h1>
              <p className="text-gray-600 mt-1 dark:text-gray-400">{coverLetters.length} {coverLetters.length === 1 ? 'cover letter' : 'cover letters'} created</p>
            </div>
          </div>
          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-1">
            <ThemeToggle styleClass="ml-2 shadow-md border border-gray-200 p-2 rounded-full dark:border-gray-600 dark:bg-gray-800 dark:text-white mr-2" />
            <div className="flex items-center bg-white rounded-xl p-1 gap-1 shadow-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'}`}> <Grid3X3 className="w-3 h-3" /> </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'}`}> <List className="w-3 h-3" /> </button>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"> <Plus className="w-5 h-5" /> Create New Cover Letter </Button>
            <Button onClick={() => {
              toast.loading("Redirecting to Resume Dashboard");
              setTimeout(() => {
                navigate('/dashboard');
              }, 1500)
            }} className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-blue-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-blue-600 transition-all duration-200"> <LayoutDashboard className="w-5 h-5" /> Resume Dashboard </Button>
          </div>
          {/* Mobile Hamburger Menu */}
          <div className="lg:hidden relative">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow hover:shadow-lg transition-all duration-200">
              {mobileMenuOpen ? (<X className="w-6 h-6 text-gray-900 dark:text-white" />) : (<Menu className="w-6 h-6 text-gray-900 dark:text-white" />)}
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Theme</span>
                    <ThemeToggle styleClass="shadow-md border border-gray-200 p-2 rounded-full dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">View Mode</span>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-1 gap-1">
                      <button onClick={() => { setViewMode('grid'); setMobileMenuOpen(false); }} className={`flex-1 p-2 rounded-md transition-all duration-200 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600'}`}> <Grid3X3 className="w-4 h-4 mx-auto" /> </button>
                      <button onClick={() => { setViewMode('list'); setMobileMenuOpen(false); }} className={`flex-1 p-2 rounded-md transition-all duration-200 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600'}`}> <List className="w-4 h-4 mx-auto" /> </button>
                    </div>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-600" />
                  <div className="space-y-2">
                    <Button onClick={() => { setCreateDialogOpen(true); setMobileMenuOpen(false); }} className="w-full justify-start gap-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600"> <Plus className="w-4 h-4" /> Create New Cover Letter </Button>
                    <Button onClick={() => {
                      toast.loading("Redirecting to Resume Dashboard");
                      setTimeout(() => {
                        navigate("/dashboard");
                      }, 1500);
                    }} className="w-full justify-start gap-3 bg-blue-700 border border-gray-600 text-white hover:bg-blue-600"> <LayoutDashboard className="w-4 h-4" /> Resume Dashboard </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Content */}
        {coverLetters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-blue-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No cover letters yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Get started by creating your first cover letter. Choose from our professional templates and build an impressive cover letter in minutes.
            </p>
            <button onClick={() => setCreateDialogOpen(true)} className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Plus className="w-5 h-5" />
              Create Your First Cover Letter
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {coverLetters.map((coverLetter) => (
              <div key={coverLetter.id} className={viewMode === 'grid' ? "group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500 transition-all duration-300 relative p-6" : "group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500 transition-all duration-300 p-6 flex items-center justify-between"}>
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    {/* Background Image Section for template-based cover letters */}
                    {coverLetter.template && getSnapshotImage(coverLetter.template) ? (
                      <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                        <div
                          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                          style={{
                            backgroundImage: `url('${getSnapshotImage(coverLetter.template)}')`,
                          }}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.2) 100%)`,
                              backdropFilter: 'blur(0.3px)',
                            }}
                          />
                        </div>
                        <div className="absolute top-3 right-3 flex flex-row gap-x-1 z-10">
                          <button onClick={() => handleClone(coverLetter.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Clone'> <Copy className="w-4 h-4" /> </button>
                          <button onClick={() => handleRename(coverLetter)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Rename'> <Edit className="w-4 h-4" /> </button>
                          <button onClick={() => openDeleteDialog(coverLetter.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Delete'> <Trash2 className="w-4 h-4" /> </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                        <div
                          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                          style={{
                            background: '#bababa',
                          }}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.2) 100%)`,
                              backdropFilter: 'blur(0.3px)',
                            }}
                          />
                        </div>
                        <div className="absolute top-3 right-3 flex flex-row gap-x-1 z-10">
                          <button onClick={() => handleClone(coverLetter.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Clone'> <Copy className="w-4 h-4" /> </button>
                          <button onClick={() => handleRename(coverLetter)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Rename'> <Edit className="w-4 h-4" /> </button>
                          <button onClick={() => openDeleteDialog(coverLetter.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-200 shadow-sm" title='Delete'> <Trash2 className="w-4 h-4" /> </button>
                        </div>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors dark:text-white">
                        {coverLetter.cover_letter_name || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 dark:text-gray-400">
                        <NotepadTextDashed className="w-4 h-4" />
                        {coverLetter.template ? formatTemplateName(coverLetter.template) : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-4 h-4" />
                        {formatDateDisplay(coverLetter.updated_at)}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleEditCoverLetter(coverLetter)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
                    >
                      <FilePenLine className="w-4 h-4" />
                      Edit Cover Letter
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
                          {coverLetter.cover_letter_name || 'Untitled'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 mb-2 dark:text-gray-400">
                          <NotepadTextDashed className="w-4 h-4" />
                          Template: {coverLetter.template ? formatTemplateName(coverLetter.template) : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 dark:text-gray-400">
                          <CalendarDays className="w-4 h-4" />
                          Last modified {formatDateDisplay(coverLetter.updated_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDeleteDialog(coverLetter.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title='Delete'
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleClone(coverLetter.id)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title='Clone'
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRename(coverLetter)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title='Rename'
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <Button
                        onClick={() => handleEditCoverLetter(coverLetter)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200"
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

export default CLDashboard;
