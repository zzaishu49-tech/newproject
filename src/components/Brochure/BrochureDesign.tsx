import React, { useState, useEffect, useCallback } from 'react';
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { BrochurePage, BrochureProject } from '../../types';
import { BrochurePageEditor } from './BrochurePageEditor';
import { PageComments } from './PageComments';
import { ClientFeedbackReport } from '../Reports/ClientFeedbackReport';
import { 
  Plus, 
  Send, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface BrochureDesignProps {
  initialBrochureProject?: BrochureProject;
  onBack?: () => void;
}

export function BrochureDesign({ initialBrochureProject, onBack }: BrochureDesignProps = {}) {
  const { user } = useAuth();
  const { 
    brochureProjects, 
    projects,
    createBrochureProject, 
    updateBrochureProject,
    saveBrochurePage,
    getBrochurePages
  } = useData();

  const [currentProject, setCurrentProject] = useState<BrochureProject | null>(initialBrochureProject || null);
  const [currentPage, setCurrentPage] = useState(1);
  // Live editor only (no preview mode)
  const [pageData, setPageData] = useState<BrochurePage['content']>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFeedbackReport, setShowFeedbackReport] = useState(false);

  // Check if current user can edit this project
  const canEdit = useMemo(() => {
    if (!user || !currentProject) return false;
    // All roles can edit brochure projects
    if (user.role === 'manager') return true;
    if (user.role === 'client' && currentProject.client_id === user.id) return true;
    if (user.role === 'employee') {
      const relatedProject = projects.find(p => p.client_id === currentProject.client_id);
      return relatedProject && relatedProject.assigned_employees.includes(user.id);
    }
    return false;
  }, [user, currentProject, projects]);

  // Get client's brochure projects
  const accessibleProjects = useMemo(() => {
    // If initialBrochureProject is provided, only show that project
    if (initialBrochureProject) {
      return [initialBrochureProject];
    }
    
    if (user?.role === 'manager') {
      // Manager can see all brochure projects
      return brochureProjects;
    } else if (user?.role === 'employee') {
      // Employee can see projects they're assigned to
      const assignedProjects = projects
        .filter(p => p.assigned_employees.includes(user.id))
        .map(p => p.client_id);
      return brochureProjects.filter(bp => assignedProjects.includes(bp.client_id));
    } else if (user?.role === 'client') {
      // Client can only see their own projects
      return brochureProjects.filter(project => project.client_id === user.id);
    }
    return [];
  }, [brochureProjects, projects, user, initialBrochureProject]);

  // Auto-save functionality with debounce
  const debouncedSave = useCallback(
    debounce((projectId: string, pageNumber: number, content: BrochurePage['content']) => {
      setIsSaving(true);
      saveBrochurePage({
        project_id: projectId,
        page_number: pageNumber,
        content
      });
      setLastSaved(new Date());
      setIsSaving(false);
    }, 2000),
    [saveBrochurePage]
  );

  // Load page data when project or page changes
  useEffect(() => {
    if (currentProject) {
      const pages = getBrochurePages(currentProject.id);
      const page = pages.find(p => p.page_number === currentPage);
      if (page) {
        setPageData(page.content);
      } else {
        setPageData({});
      }
    }
  }, [currentProject, currentPage, getBrochurePages]);

  // Auto-save when page data changes
  useEffect(() => {
    if (currentProject && pageData && Object.keys(pageData).length > 0) {
      debouncedSave(currentProject.id, currentPage, pageData);
    }
  }, [pageData, currentProject, currentPage, debouncedSave]);

  // Get total pages dynamically
  const getTotalPages = () => {
    if (!currentProject) return 1;
    const pages = getBrochurePages(currentProject.id);
    return pages.length > 0 ? Math.max(...pages.map(p => p.page_number)) : 1;
  };

  const totalPages = getTotalPages();

  const handleCreateProject = () => {
    if (!user) return;
    
    // For managers and employees, create project for the first available client
    let clientId = user.id;
    let clientName = user.name;
    
    if (user.role === 'manager' || user.role === 'employee') {
      // Find the first client or create for the current user
      const firstClient = users.find(u => u.role === 'client');
      if (firstClient) {
        clientId = firstClient.id;
        clientName = firstClient.name;
      }
    }
    
    const projectId = createBrochureProject(clientId, clientName);
    const newProject = brochureProjects.find(p => p.id === projectId);
    if (newProject) {
      setCurrentProject(newProject);
      setCurrentPage(1);
    }
  };

  const handleSubmitProject = () => {
    if (!currentProject) return;
    // Just save the project - no status change needed
    updateBrochureProject(currentProject.id, { updated_at: new Date().toISOString() });
    setCurrentProject(prev => prev ? { ...prev, updated_at: new Date().toISOString() } : null);
  };

  const calculateProgress = () => {
    if (!currentProject) return 0;
    const pages = getBrochurePages(currentProject.id);
    const totalRequiredFields = totalPages * 2; // 2 fields per page on average
    let filledFields = 0;

    pages.forEach(page => {
      const content = page.content;
      if (page.page_number === 1) {
        if (content.project_name) filledFields++;
        if (content.description) filledFields++;
        if (content.company_name) filledFields++;
      } else if (page.page_number === 2) {
        if (content.about_us) filledFields++;
        if (content.email) filledFields++;
      } else {
        if (content.heading) filledFields++;
        if (content.body_content) filledFields++;
      }
    });

    return Math.round((filledFields / totalRequiredFields) * 100);
  };

  const addNewPage = () => {
    const newPageNumber = totalPages + 1;
    
    // Create the new page in the data context
    if (currentProject) {
      saveBrochurePage({
        project_id: currentProject.id,
        page_number: newPageNumber,
        content: {},
        approval_status: 'pending',
        is_locked: false
      });
    }
    
    setCurrentPage(newPageNumber);
    setPageData({});
  };

  const getPageTitle = (pageNumber: number) => {
    switch (pageNumber) {
      case 1: return 'Project Details';
      case 2: return 'Company Information';
      default: return `Content Page ${pageNumber - 2}`;
    }
  };

  const getCurrentPage = () => {
    if (!currentProject) return null;
    const pages = getBrochurePages(currentProject.id);
    return pages.find(p => p.page_number === currentPage);
  };

  const handleLockToggle = () => {
    const page = getCurrentPage();
    if (!page) return;
    
    if (page.is_locked) {
      unlockBrochurePage(page.id);
    } else {
      lockBrochurePage(page.id);
    }
  };

  const isPageEditable = () => {
    if (user?.role === 'manager' || user?.role === 'employee') return true; // Managers and employees can always edit
    const page = getCurrentPage();
    return !page?.is_locked; // Others can only edit if page is not locked
  };
  if (!currentProject) {
  // If initialBrochureProject is provided, go directly to the design interface
  if (initialBrochureProject && !currentProject) {
    setCurrentProject(initialBrochureProject);
    return null; // Will re-render with currentProject set
  }
  
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Brochure Design</h2>
          <p className="text-gray-600">
            {user?.role === 'client' 
              ? 'Create and manage your brochure design projects'
              : user?.role === 'manager'
              ? 'Manage all brochure design projects'
              : 'Work on assigned brochure design projects'
            }
          </p>
        </div>

        {accessibleProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user?.role === 'client' ? 'No brochure projects yet' : 'No accessible brochure projects'}
            </h3>
            <p className="text-gray-600 mb-6">
              {user?.role === 'client' 
                ? 'Create your first brochure design project to get started'
                : user?.role === 'manager' || user?.role === 'employee'
                ? 'No brochure projects have been created yet'
                : 'Create a new brochure project to get started'
              }
            </p>
            {(user?.role === 'client' || user?.role === 'manager' || user?.role === 'employee') && (
              <button
                onClick={handleCreateProject}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Brochure Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.role === 'client' ? 'Your Brochure Projects' : 
                 user?.role === 'manager' ? 'All Brochure Projects' : 'Assigned Brochure Projects'}
              </h3>
              {(user?.role === 'client' || user?.role === 'manager' || user?.role === 'employee') && (
                <button
                  onClick={handleCreateProject}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessibleProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {user?.role === 'client' ? 'Brochure Project' : 
                       user?.role === 'manager' ? `${project.client_name}'s Brochure` :
                       `Brochure for ${project.client_name}`}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      project.status === 'ready_for_design' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'in_design' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  {user?.role === 'manager' && (
                    <p className="text-sm text-gray-600">
                      Client: {project.client_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Brochure Design</h2>
            <p className="text-gray-600">Page {currentPage} - {getPageTitle(currentPage)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  setCurrentProject(null);
                }
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← {onBack ? 'Back to Project' : 'Back to Projects'}
            </button>
            {canEdit && (
              <button
                onClick={addNewPage}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Page</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Project Progress</span>
            <span>{calculateProgress()}% Complete ({totalPages} {totalPages === 1 ? 'page' : 'pages'})</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-red-600 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              currentProject.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              currentProject.status === 'ready_for_design' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {currentProject.status === 'draft' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <span>{currentProject.status.replace('_', ' ')}</span>
            </span>
            {isSaving && <span className="text-sm text-gray-500">Saving...</span>}
            {lastSaved && !isSaving && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {currentProject.status === 'draft' && canEdit && user?.role === 'client' && (
            <button
              onClick={handleSubmitProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Project</span>
            </button>
          )}
          
          {canEdit && (user?.role === 'manager' || user?.role === 'employee') && (
            <button
              onClick={handleSubmitProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Project</span>
            </button>
          )}
          
          {currentProject.status !== 'draft' && (
            <button
              onClick={() => setShowFeedbackReport(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Feedback Report</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Lock Status Banner */}
          {!isPageEditable() && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">🔒</span>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">Page Locked for Editing</h4>
                  <p className="text-sm text-yellow-700">
                    This page has been locked. You cannot make changes until it's unlocked.
                    {getCurrentPage()?.locked_by_name && (
                      <span className="block mt-1">
                        Locked by: {getCurrentPage()?.locked_by_name} on {getCurrentPage()?.locked_at ? new Date(getCurrentPage()!.locked_at!).toLocaleDateString() : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <BrochurePageEditor
            projectId={currentProject.id}
            pageNumber={currentPage}
            pageData={pageData}
            onDataChange={setPageData}
            isEditable={isPageEditable() && canEdit}
          />

          {/* Page Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comments Sidebar */}
        <div className="lg:col-span-1">
          {/* Lock/Unlock Controls for Managers and Employees */}
          {(user?.role === 'manager' || user?.role === 'employee') && getCurrentPage() && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">{getCurrentPage()?.is_locked ? '🔒' : '🔓'}</span>
                Page Access Control
              </h4>
              
              {getCurrentPage()?.is_locked ? (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Page is locked</strong>
                      {getCurrentPage()?.locked_by_name && (
                        <span className="block mt-1">
                          Locked by: {getCurrentPage()?.locked_by_name}
                        </span>
                      )}
                      {getCurrentPage()?.locked_at && (
                        <span className="block text-xs text-yellow-600">
                          {new Date(getCurrentPage()!.locked_at!).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleLockToggle}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🔓</span>
                    <span>Unlock Page</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Page is unlocked</strong><br />
                      Client can edit this page
                    </p>
                  </div>
                  <button
                    onClick={handleLockToggle}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🔒</span>
                    <span>Lock Page</span>
                  </button>
                </div>
              )}
              
              <div className="mt-3 text-xs text-gray-500">
                Locking prevents client from editing this page until unlocked.
              </div>
            </div>
          )}

          <PageComments 
            pageId={`${currentProject.id}-${currentPage}`}
            projectId={currentProject.id}
            pageNumber={currentPage}
          />
        </div>
      </div>
      
      {/* Feedback Report Modal */}
      {showFeedbackReport && currentProject && (
        <ClientFeedbackReport
          project={currentProject}
          onClose={() => setShowFeedbackReport(false)}
        />
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}