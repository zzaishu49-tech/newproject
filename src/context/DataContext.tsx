import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, Stage, CommentTask, GlobalComment, File, Task, Meeting, BrochureProject, BrochurePage, PageComment, Lead, STAGE_NAMES, DownloadHistory, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vyanqukylmlysdtrgpip.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // Ensure this is set in .env
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface DataContextType {
  projects: Project[];
  stages: Stage[];
  commentTasks: CommentTask[];
  globalComments: GlobalComment[];
  users: User[];
  files: File[];
  tasks: Task[];
  meetings: Meeting[];
  brochureProjects: BrochureProject[];
  brochurePages: BrochurePage[];
  pageComments: PageComment[];
  leads: Lead[];
  downloadHistory: DownloadHistory[];
  createProject: (project: Omit<Project, 'id' | 'created_at'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addCommentTask: (data: Omit<CommentTask, 'id' | 'timestamp'>) => void;
  addGlobalComment: (data: { project_id: string; text: string; added_by: string; author_role: string }) => void;
  updateCommentTaskStatus: (taskId: string, status: 'open' | 'in-progress' | 'done') => void;
  updateStageApproval: (stageId: string, status: 'approved' | 'rejected', comment?: string) => void;
  uploadFile: (fileData: Omit<File, 'id' | 'timestamp'>) => void;
  uploadFileFromInput: (stageId: string, file: globalThis.File, uploaderName: string) => void;
  updateStageProgress: (stageId: string, progress: number) => void;
  scheduleMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => void;
  updateTaskStatus: (taskId: string, status: 'open' | 'in-progress' | 'done') => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createBrochureProject: (clientId: string, clientName: string) => string;
  updateBrochureProject: (id: string, updates: Partial<BrochureProject>) => void;
  saveBrochurePage: (pageData: Omit<BrochurePage, 'id' | 'created_at' | 'updated_at'>) => void;
  getBrochurePages: (projectId: string) => BrochurePage[];
  addPageComment: (comment: Omit<PageComment, 'id' | 'timestamp'>) => void;
  getPageComments: (pageId: string) => PageComment[];
  markCommentDone: (commentId: string) => void;
  downloadFile: (fileId: string) => void;
  downloadMultipleFiles: (fileIds: string[]) => void;
  getDownloadHistory: () => DownloadHistory[];
  updateFileMetadata: (fileId: string, metadata: Partial<File>) => void;
  createLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  approveBrochurePage: (pageId: string, status: 'approved' | 'rejected', comment?: string) => void;
  getBrochureProjectsForReview: () => BrochureProject[];
  lockBrochurePage: (pageId: string) => void;
  unlockBrochurePage: (pageId: string) => void;
  createUserAccount: (params: { email: string; password: string; full_name: string; role: 'employee' | 'client' }) => Promise<{ id: string } | null>;
  refreshUsers: () => Promise<void>;
  loadProjects: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Enhanced mock data with Indian names
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Website for Xee Design',
    description: 'Complete website redesign and development for Xee Design agency with modern UI/UX, responsive design, and CMS integration',
    client_id: '3',
    client_name: 'Priya Sharma',
    deadline: '2025-03-15',
    progress_percentage: 65,
    assigned_employees: ['2', '4'],
    created_at: '2025-01-01',
    status: 'active',
    priority: 'high'
  },
  {
    id: '2',
    title: 'E-commerce Mobile App',
    description: 'Native mobile application for online shopping with payment gateway integration and inventory management',
    client_id: '5',
    client_name: 'Rajesh Kumar',
    deadline: '2025-04-30',
    progress_percentage: 30,
    assigned_employees: ['2'],
    created_at: '2025-01-10',
    status: 'active',
    priority: 'medium'
  }
];

const mockStages: Stage[] = [
  {
    id: '1',
    project_id: '1',
    name: 'Planning',
    notes: 'Project requirements gathering, wireframes, and technical specifications completed',
    progress_percentage: 100,
    approval_status: 'approved',
    files: [],
    comments: [],
    order: 0
  },
  {
    id: '2',
    project_id: '1',
    name: 'Design',
    notes: 'UI/UX design mockups and prototypes ready for client review',
    progress_percentage: 90,
    approval_status: 'pending',
    files: [],
    comments: [],
    order: 1
  },
  {
    id: '3',
    project_id: '1',
    name: 'Development',
    notes: 'Frontend development in progress, backend API integration started',
    progress_percentage: 45,
    approval_status: 'pending',
    files: [],
    comments: [],
    order: 2
  }
];

const mockCommentTasks: CommentTask[] = [
  {
    id: '1',
    stage_id: '2',
    project_id: '1',
    text: 'Please update the color scheme to match our brand guidelines. The current blue is too dark.',
    added_by: '3',
    author_name: 'Priya Sharma',
    author_role: 'client',
    status: 'open',
    assigned_to: '2',
    timestamp: '2025-01-15T10:30:00Z'
  },
  {
    id: '2',
    stage_id: '3',
    project_id: '1',
    text: 'Need to implement responsive design for mobile devices',
    added_by: '1',
    author_name: 'Arjun Singh',
    author_role: 'manager',
    status: 'in-progress',
    assigned_to: '2',
    deadline: '2025-02-01',
    timestamp: '2025-01-12T14:20:00Z'
  },
  {
    id: '3',
    stage_id: '3',
    project_id: '1',
    text: 'Database optimization completed, performance improved by 40%',
    added_by: '2',
    author_name: 'Rakesh Gupta',
    author_role: 'employee',
    status: 'done',
    timestamp: '2025-01-14T16:45:00Z'
  }
];

const mockFiles: File[] = [
  {
    id: '1',
    stage_id: '1',
    project_id: '1',
    filename: 'project-requirements.pdf',
    file_url: '#',
    uploaded_by: '1',
    uploader_name: 'Arjun Singh',
    timestamp: '2025-01-02T09:00:00Z',
    size: 2048576,
    file_type: 'pdf',
    category: 'requirements',
    description: 'Initial project requirements and specifications',
    download_count: 5,
    last_downloaded: '2025-01-15T14:30:00Z',
    last_downloaded_by: '2',
    is_archived: false,
    tags: ['requirements', 'initial', 'specifications']
  },
  {
    id: '2',
    stage_id: '2',
    project_id: '1',
    filename: 'design-mockups.fig',
    file_url: '#',
    uploaded_by: '2',
    uploader_name: 'Rakesh Gupta',
    timestamp: '2025-01-08T11:15:00Z',
    size: 5242880,
    file_type: 'fig',
    category: 'assets',
    description: 'Figma design mockups for homepage and key pages',
    download_count: 3,
    last_downloaded: '2025-01-14T16:20:00Z',
    last_downloaded_by: '3',
    is_archived: false,
    tags: ['design', 'mockups', 'figma']
  }
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [stages, setStages] = useState<Stage[]>(mockStages);
  const [commentTasks, setCommentTasks] = useState<CommentTask[]>(mockCommentTasks);
  const [globalComments, setGlobalComments] = useState<GlobalComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<File[]>(mockFiles);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [brochureProjects, setBrochureProjects] = useState<BrochureProject[]>([]);
  const [brochurePages, setBrochurePages] = useState<BrochurePage[]>([]);
  const [pageComments, setPageComments] = useState<PageComment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([]);

  const createUserAccount = async (params: { email: string; password: string; full_name: string; role: 'employee' | 'client' }) => {
    if (!supabase) {
      alert('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return null;
    }
    const { email, password, full_name, role } = params;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      alert(error?.message || 'Failed to create user');
      return null;
    }
    const userId = data.user.id;
    const { error: upsertErr } = await supabase.from('profiles').upsert({ id: userId, full_name, role, email }, { onConflict: 'id' });
    if (upsertErr) {
      console.error('Error upserting profile:', upsertErr);
      alert(upsertErr.message);
      return null;
    }
    setUsers(prev => [...prev, { id: userId, name: full_name, email, role } as User]);
    await refreshUsers();
    return { id: userId };
  };

  const refreshUsers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, email');
    if (error) {
      console.error('Error refreshing users:', error);
    } else if (data) {
      const mapped: User[] = data.map(p => ({ id: p.id, name: p.full_name || p.email || 'User', email: p.email || '', role: p.role }));
      setUsers(mapped);
    }
  };

  const loadProjects = async () => {
    if (!supabase) {
      console.error('Supabase not initialized');
      setProjects(mockProjects);
      return;
    }
    try {
      console.log('Loading projects from Supabase...');
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:profiles!projects_client_id_fkey(full_name)
        `);
      if (error) {
        console.error('Supabase error loading projects:', error);
        setProjects(mockProjects);
      } else if (data) {
        console.log('Projects loaded successfully:', data.length);
        const mappedProjects: Project[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          client_id: p.client_id,
          client_name: p.client?.full_name || 'Unknown Client',
          deadline: p.deadline,
          progress_percentage: p.progress_percentage,
          assigned_employees: p.assigned_employees || [],
          created_at: p.created_at,
          status: p.status,
          priority: p.priority
        }));
        setProjects(mappedProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects(mockProjects);
    }
  };

  const loadTasks = async () => {
    if (!supabase) {
      console.error('Supabase not initialized');
      return;
    }
    try {
      console.log('Loading tasks from Supabase...');
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        console.error('Supabase error loading tasks:', error);
      } else if (data) {
        console.log('Raw tasks data from Supabase:', data);
        const mappedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          project_id: t.project_id,
          title: t.title,
          description: t.description,
          assigned_to: t.assigned_to,
          created_by: t.created_by,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          created_at: t.created_at,
          updated_at: t.updated_at
        }));
        console.log('Mapped tasks:', mappedTasks);
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  useEffect(() => {
    refreshUsers();
    loadProjects();
    loadTasks();
    if (!supabase) return;

    const projectsSubscription = supabase
      .channel('projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadProjects())
      .subscribe();

    const profilesSubscription = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshUsers())
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(profilesSubscription);
      supabase.removeChannel(tasksSubscription);
    };
  }, []);

  useEffect(() => {
    const existingProjectIds = new Set(stages.map(s => s.project_id));
    const newProjects = projects.filter(p => !existingProjectIds.has(p.id));
    if (newProjects.length > 0) {
      const newStages: Stage[] = [];
      newProjects.forEach(project => {
        STAGE_NAMES.forEach((stageName, index) => {
          newStages.push({
            id: uuidv4(),
            project_id: project.id,
            name: stageName,
            notes: '',
            progress_percentage: 0,
            approval_status: 'pending',
            files: [],
            comments: [],
            order: index
          });
        });
      });
      setStages(prev => [...prev, ...newStages]);
    }
  }, [projects]);

  const downloadFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !user) return;
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, download_count: f.download_count + 1, last_downloaded: new Date().toISOString(), last_downloaded_by: user.id } : f
    ));
    const historyEntry: DownloadHistory = {
      id: uuidv4(),
      file_id: fileId,
      downloaded_by: user.id,
      downloader_name: user.name,
      download_date: new Date().toISOString(),
      file_name: file.filename,
      file_size: file.size
    };
    setDownloadHistory(prev => [...prev, historyEntry]);
    const link = document.createElement('a');
    link.href = file.file_url;
    link.download = file.filename;
    link.click();
  };

  const downloadMultipleFiles = (fileIds: string[]) => {
    if (!user) return;
    const filesToDownload = files.filter(f => fileIds.includes(f.id));
    filesToDownload.forEach(file => setTimeout(() => downloadFile(file.id), 100));
  };

  const getDownloadHistory = (): DownloadHistory[] => {
    return downloadHistory
      .filter(entry => {
        const file = files.find(f => f.id === entry.file_id);
        if (!file) return false;
        if (user?.role === 'manager') return true;
        if (user?.role === 'employee') {
          const project = projects.find(p => p.id === file.project_id);
          return project?.assigned_employees.includes(user.id);
        }
        return false;
      })
      .sort((a, b) => new Date(b.download_date).getTime() - new Date(a.download_date).getTime());
  };

  const updateFileMetadata = (fileId: string, metadata: Partial<File>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...metadata } : f));
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'created_at'>) => {
    if (!supabase) {
      const newProject: Project = { ...projectData, id: uuidv4(), created_at: new Date().toISOString() };
      setProjects(prev => [...prev, newProject]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...projectData })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const stageInserts = STAGE_NAMES.map((stageName, index) => ({
          project_id: data.id,
          name: stageName,
          notes: '',
          progress_percentage: 0,
          approval_status: 'pending',
          order: index
        }));
        await supabase.from('stages').insert(stageInserts);
        await loadProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!supabase) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }
    try {
      const { error } = await supabase.from('projects').update(updates).eq('id', id);
      if (error) throw error;
      await loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const addCommentTask = async (data: Omit<CommentTask, 'id' | 'timestamp'>) => {
    const newCommentTask: CommentTask = { ...data, id: uuidv4(), timestamp: new Date().toISOString() };
    setCommentTasks(prev => [...prev, newCommentTask]);
    if (supabase) await supabase.from('comment_tasks').insert(newCommentTask).catch(console.error);
  };

  const addGlobalComment = async (data: { project_id: string; text: string; added_by: string; author_role: string }) => {
    if (!data.text || data.text.trim() === '') {
      console.error('Comment text cannot be empty:', data);
      throw new Error('Comment text is required');
    }
    console.log('Adding global comment with data:', data);
    if (!user || !user.id) {
      console.error('No authenticated user found');
      throw new Error('User authentication required');
    }
    const project = projects.find(p => p.id === data.project_id);
    if (!project) {
      console.error('Project not found:', data.project_id);
      throw new Error('Invalid project ID');
    }
    if (user.role !== 'manager' && user.id !== project.client_id && !project.assigned_employees.includes(user.id)) {
      console.error('User lacks permission for project:', { userId: user.id, projectId: data.project_id });
      throw new Error('Permission denied');
    }

    // Validate or create profile for added_by
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('id', data.added_by).single();
    if (profileError || !profile) {
      console.warn('Profile not found for added_by, creating minimal profile:', data.added_by);
      const { error: createError } = await supabase.from('profiles').insert({ id: data.added_by, full_name: 'Unknown User', role: 'unknown' }, { onConflict: 'id' });
      if (createError) {
        console.error('Failed to create profile:', createError);
        throw new Error('Failed to create missing user profile');
      }
      await refreshUsers(); // Sync local state
    }

    const newGlobalComment: GlobalComment = {
      id: uuidv4(),
      project_id: data.project_id,
      text: data.text,
      added_by: data.added_by,
      timestamp: new Date().toISOString(),
      author_role: data.author_role
    };
    setGlobalComments(prev => [...prev, newGlobalComment]);
    if (supabase) {
      const { error } = await supabase.from('global_comments').insert({
        project_id: data.project_id,
        text: data.text,
        added_by: data.added_by,
        timestamp: newGlobalComment.timestamp,
        author_role: data.author_role
      });
      if (error) {
        console.error('Error adding global comment:', error);
        throw error;
      }
    }
  };

  const updateCommentTaskStatus = async (taskId: string, status: 'open' | 'in-progress' | 'done') => {
    setCommentTasks(prev => prev.map(task => task.id === taskId ? { ...task, status } : task));
    if (supabase) await supabase.from('comment_tasks').update({ status }).eq('id', taskId).catch(console.error);
  };

  const updateStageApproval = async (stageId: string, status: 'approved' | 'rejected', comment?: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, approval_status: status } : s));
    if (supabase) await supabase.from('stages').update({ approval_status: status }).eq('id', stageId).catch(console.error);
    if (comment) {
      const stage = stages.find(s => s.id === stageId);
      if (stage) await addCommentTask({
        stage_id: stageId,
        project_id: stage.project_id,
        text: comment,
        added_by: 'client',
        author_name: 'Client',
        author_role: 'client',
        status: 'open'
      });
    }
  };

  const uploadFile = async (fileData: Omit<File, 'id' | 'timestamp'>) => {
    const newFile: File = { ...fileData, id: uuidv4(), timestamp: new Date().toISOString() };
    setFiles(prev => [...prev, newFile]);
    if (supabase) await supabase.from('files').insert(newFile).catch(console.error);
  };

  const uploadFileFromInput = (stageId: string, file: globalThis.File, uploaderName: string) => {
    const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const newFile: File = {
      id: uuidv4(),
      stage_id: stageId,
      project_id: stages.find(s => s.id === stageId)?.project_id || '',
      filename: file.name,
      file_url: URL.createObjectURL(file),
      uploaded_by: user?.id || '',
      uploader_name: uploaderName,
      timestamp: new Date().toISOString(),
      size: file.size,
      file_type: fileType,
      category: 'other',
      description: '',
      download_count: 0,
      is_archived: false,
      tags: []
    };
    setFiles(prev => [...prev, newFile]);
  };

  const updateStageProgress = async (stageId: string, progress: number) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, progress_percentage: progress } : s));
    if (supabase) await supabase.from('stages').update({ progress_percentage: progress }).eq('id', stageId).catch(console.error);
  };

  const scheduleMeeting = async (meetingData: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = { ...meetingData, id: uuidv4() };
    setMeetings(prev => [...prev, newMeeting]);
    if (supabase) await supabase.from('meetings').insert(newMeeting).catch(console.error);
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    if (!supabase) {
      const newTask: Task = { ...taskData, id: uuidv4(), created_at: new Date().toISOString(), priority: taskData.priority || 'medium' };
      setTasks(prev => [...prev, newTask]);
      return;
    }
    try {
      const taskToInsert = {
        project_id: taskData.project_id,
        title: taskData.title,
        description: taskData.description,
        assigned_to: taskData.assigned_to,
        status: taskData.status || 'open',
        priority: taskData.priority || 'medium',
        deadline: taskData.deadline || null
      };
      const { data, error } = await supabase.from('tasks').insert(taskToInsert).select().single();
      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'open' | 'in-progress' | 'done') => {
    if (!supabase) {
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status } : task));
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!supabase) {
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, ...updates } : task));
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!supabase) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      return;
    }
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const createBrochureProject = (clientId: string, clientName: string): string => {
    const newProject: BrochureProject = {
      id: uuidv4(),
      client_id: clientId,
      client_name: clientName,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pages: []
    };
    setBrochureProjects(prev => [...prev, newProject]);
    if (supabase) supabase.from('brochure_projects').insert(newProject).catch(console.error);
    return newProject.id;
  };

  const updateBrochureProject = async (id: string, updates: Partial<BrochureProject>) => {
    setBrochureProjects(prev => prev.map(project => project.id === id ? { ...project, ...updates, updated_at: new Date().toISOString() } : project));
    if (supabase) await supabase.from('brochure_projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).catch(console.error);
  };

  const saveBrochurePage = async (pageData: Omit<BrochurePage, 'id' | 'created_at' | 'updated_at'>) => {
    const existingPageIndex = brochurePages.findIndex(page => page.project_id === pageData.project_id && page.page_number === pageData.page_number);
    if (existingPageIndex >= 0) {
      setBrochurePages(prev => prev.map((page, index) => index === existingPageIndex ? { ...page, content: pageData.content, updated_at: new Date().toISOString() } : page));
      if (supabase) await supabase.from('brochure_pages').update({ content: pageData.content, updated_at: new Date().toISOString() }).eq('id', brochurePages[existingPageIndex].id).catch(console.error);
    } else {
      const newPage: BrochurePage = {
        ...pageData,
        approval_status: pageData.approval_status ?? 'pending',
        is_locked: pageData.is_locked ?? false,
        id: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setBrochurePages(prev => [...prev, newPage]);
      if (supabase) await supabase.from('brochure_pages').insert(newPage).catch(console.error);
    }
  };

  const getBrochurePages = (projectId: string): BrochurePage[] => {
    return brochurePages.filter(page => page.project_id === projectId).sort((a, b) => a.page_number - b.page_number);
  };

  const addPageComment = async (commentData: Omit<PageComment, 'id' | 'timestamp'>) => {
    const newComment: PageComment = { ...commentData, id: uuidv4(), timestamp: new Date().toISOString() };
    setPageComments(prev => [...prev, newComment]);
    if (supabase) await supabase.from('page_comments').insert(newComment).catch(console.error);
  };

  const getPageComments = (pageId: string): PageComment[] => {
    return pageComments.filter(comment => comment.page_id === pageId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const markCommentDone = async (commentId: string) => {
    setPageComments(prev => prev.map(comment => comment.id === commentId ? { ...comment, marked_done: true } : comment));
    if (supabase) await supabase.from('page_comments').update({ marked_done: true }).eq('id', commentId).catch(console.error);
  };

  const approveBrochurePage = (pageId: string, status: 'approved' | 'rejected', comment?: string) => {
    setBrochurePages(prev => prev.map(page => page.id === pageId ? { ...page, approval_status: status, updated_at: new Date().toISOString() } : page));
    const actionText = status === 'approved' ? `Page has been approved by ${user?.name || 'Manager'}${comment ? `: ${comment}` : ''}` : `Page requires changes - ${user?.name || 'Manager'}${comment ? `: ${comment}` : ''}`;
    addPageComment({
      page_id: pageId,
      text: actionText,
      added_by: user?.id || '',
      author_name: user?.name || 'Manager',
      author_role: user?.role || 'manager',
      marked_done: false,
      action_type: 'approval'
    });
  };

  const getBrochureProjectsForReview = (): BrochureProject[] => {
    return brochureProjects.filter(project => project.status === 'ready_for_design' || project.status === 'in_design');
  };

  const createLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    const newLead: Lead = { ...leadData, id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setLeads(prev => [...prev, newLead]);
    if (supabase) await supabase.from('leads').insert(newLead).catch(console.error);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...updates, updated_at: new Date().toISOString() } : lead));
    if (supabase) await supabase.from('leads').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).catch(console.error);
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
    if (supabase) await supabase.from('leads').delete().eq('id', id).catch(console.error);
  };

  const lockBrochurePage = async (pageId: string) => {
    if (!user) return;
    setBrochurePages(prev => prev.map(page => page.id === pageId ? { ...page, is_locked: true, locked_by: user.id, locked_by_name: user.name, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() } : page));
    if (supabase) await supabase.from('brochure_pages').update({ is_locked: true, locked_by: user.id, locked_by_name: user.name, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pageId).catch(console.error);
  };

  const unlockBrochurePage = async (pageId: string) => {
    setBrochurePages(prev => prev.map(page => page.id === pageId ? { ...page, is_locked: false, locked_by: undefined, locked_by_name: undefined, locked_at: undefined, updated_at: new Date().toISOString() } : page));
    if (supabase) await supabase.from('brochure_pages').update({ is_locked: false, locked_by: null, locked_by_name: null, locked_at: null, updated_at: new Date().toISOString() }).eq('id', pageId).catch(console.error);
  };

  return (
    <DataContext.Provider value={{
      projects,
      stages,
      commentTasks,
      globalComments,
      users,
      files,
      tasks,
      meetings,
      brochureProjects,
      brochurePages,
      pageComments,
      leads,
      downloadHistory,
      createProject,
      updateProject,
      addCommentTask,
      addGlobalComment,
      updateCommentTaskStatus,
      updateStageApproval,
      uploadFile,
      uploadFileFromInput,
      updateStageProgress,
      scheduleMeeting,
      createTask,
      updateTaskStatus,
      updateTask,
      deleteTask,
      createBrochureProject,
      updateBrochureProject,
      saveBrochurePage,
      getBrochurePages,
      addPageComment,
      getPageComments,
      markCommentDone,
      approveBrochurePage,
      getBrochureProjectsForReview,
      downloadFile,
      downloadMultipleFiles,
      getDownloadHistory,
      updateFileMetadata,
      createLead,
      updateLead,
      deleteLead,
      lockBrochurePage,
      unlockBrochurePage,
      createUserAccount,
      refreshUsers,
      loadProjects
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}