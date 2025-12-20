
import React, { useState, useEffect, useRef } from 'react';
import { FinancialInputs, SavedProject } from '../types';
import { Save, FolderOpen, Trash2, Clock, Download, Upload, FileJson, AlertCircle, Check, Edit2, X } from 'lucide-react';

interface ProjectManagerProps {
  currentInputs: FinancialInputs;
  onLoad: (inputs: FinancialInputs) => void;
}

const STORAGE_KEY = 'biofinance_projects';

const ProjectManager: React.FC<ProjectManagerProps> = ({ currentInputs, onLoad }) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showList, setShowList] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Renaming state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved projects', e);
      }
    }
  }, []);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const saveProjectsToStorage = (newProjects: SavedProject[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
    setProjects(newProjects);
  };

  const handleSave = () => {
    if (!newProjectName.trim()) return;

    const newProject: SavedProject = {
      id: Date.now().toString(),
      name: newProjectName,
      updatedAt: Date.now(),
      inputs: currentInputs
    };

    const updatedProjects = [newProject, ...projects];
    saveProjectsToStorage(updatedProjects);
    setNewProjectName('');
    setIsSaving(false);
    setShowList(true);
    setNotification({ type: 'success', message: '项目已成功保存' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个存档吗？')) {
        const updatedProjects = projects.filter(p => p.id !== id);
        saveProjectsToStorage(updatedProjects);
    }
  };

  const handleLoad = (project: SavedProject) => {
    if (window.confirm(`确定要加载项目 "${project.name}" 吗？当前未保存的更改将会丢失。`)) {
        onLoad(project.inputs);
    }
  };
  
  // --- Renaming Functions ---
  const startRenaming = (project: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditName(project.name);
  };

  const cancelRenaming = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProjectId(null);
    setEditName('');
  };

  const saveRenaming = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;

    const updatedProjects = projects.map(p => 
      p.id === id ? { ...p, name: editName.trim() } : p
    );
    saveProjectsToStorage(updatedProjects);
    setEditingProjectId(null);
    setEditName('');
    setNotification({ type: 'success', message: '项目重命名成功' });
  };

  // --- Export Functionality ---
  const handleExport = () => {
    if (projects.length === 0) {
      setNotification({ type: 'error', message: '暂无项目可导出' });
      return;
    }
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `biofinance_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setNotification({ type: 'success', message: '项目导出成功' });
  };

  // --- Import Functionality ---
  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // Basic validation: must be an array of objects with required fields
        if (!Array.isArray(importedData)) {
          throw new Error('导入文件格式不正确（需为数组）');
        }

        // Merge logic: use Map to prevent ID duplicates, keeping imported ones as priority
        const projectMap = new Map();
        projects.forEach(p => projectMap.set(p.id, p));
        importedData.forEach(p => {
            if (p.id && p.name && p.inputs) {
                projectMap.set(p.id, p);
            }
        });

        const mergedProjects = Array.from(projectMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        saveProjectsToStorage(mergedProjects);
        setNotification({ type: 'success', message: `已导入 ${importedData.length} 个项目` });
        setShowList(true);
      } catch (err) {
        setNotification({ type: 'error', message: '文件解析失败：请确保是有效的项目备份文件' });
      } finally {
        // Reset input so the same file can be uploaded again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6 relative">
      {/* Small Toast Notification */}
      {notification && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 z-50 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-600" />
          项目管理 (Project)
        </h2>
        <div className="flex gap-2">
             <button
                onClick={() => {
                    setIsSaving(!isSaving);
                    if(!isSaving) setNewProjectName('');
                }}
                className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${isSaving ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
             >
                <Save className="w-3 h-3" /> {isSaving ? '取消' : '保存当前'}
             </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <div className="flex gap-3">
          <button
              onClick={() => setShowList(!showList)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
              {showList ? '收起列表' : `查看存档 (${projects.length})`}
          </button>
          <div className="w-[1px] h-3 bg-slate-200 self-center"></div>
          {/* Swapped Icons Below */}
          <button onClick={handleExport} className="hover:text-indigo-600 transition-colors flex items-center gap-1" title="导出备份">
            <Upload className="w-3 h-3" /> 导出
          </button>
          <button onClick={handleImportTrigger} className="hover:text-indigo-600 transition-colors flex items-center gap-1" title="导入备份">
            <Download className="w-3 h-3" /> 导入
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {isSaving && (
        <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-bold text-indigo-900 mb-2">为当前分析方案命名</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：2024 Q1 悲观预测"
                    className="flex-1 text-sm px-3 py-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                    onClick={handleSave}
                    disabled={!newProjectName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    确认保存
                </button>
            </div>
        </div>
      )}

      {showList && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center gap-2">
                    <FileJson className="w-8 h-8 opacity-20" />
                    <span>暂无保存的项目</span>
                </div>
            ) : (
                projects.map(project => (
                    <div
                        key={project.id}
                        className={`group relative flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all ${editingProjectId === project.id ? 'ring-2 ring-indigo-500 bg-white shadow-md' : 'cursor-pointer'}`}
                        onClick={editingProjectId === project.id ? undefined : () => handleLoad(project)}
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            {editingProjectId === project.id ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full text-sm font-bold text-slate-800 border-b-2 border-indigo-500 outline-none bg-transparent px-1 py-0.5"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveRenaming(project.id, e as any);
                                            if (e.key === 'Escape') cancelRenaming(e as any);
                                        }}
                                        placeholder="输入新名称..."
                                    />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" /> {formatDate(project.updatedAt)}
                                    </p>
                                </>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                             {editingProjectId === project.id ? (
                                 <>
                                    <button
                                        onClick={(e) => saveRenaming(project.id, e)}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="确认"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => cancelRenaming(e)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                        title="取消"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                 </>
                             ) : (
                                 <>
                                     <div className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider hidden sm:block">
                                        Load
                                     </div>
                                     <button
                                        onClick={(e) => startRenaming(project, e)}
                                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                                        title="重命名"
                                     >
                                        <Edit2 className="w-4 h-4" />
                                     </button>
                                     <button
                                        onClick={(e) => handleDelete(project.id, e)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                                        title="删除存档"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                 </>
                             )}
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
