import React, { useState, useRef, useMemo } from 'react';
import { Play, FileText, Plus, Loader2, Film, Folder, FolderPlus, ArrowLeft, MoreVertical, Pencil, Trash2, Home, ChevronRight, Check, X, Globe, Link } from 'lucide-react';
import { VideoMeta, Folder as FolderType, Theme } from '../types';

const ImportModal = ({ onClose, onImport, theme }: {
  onClose: () => void;
  onImport: (videoUrl: string, subtitleUrl: string, name: string) => Promise<void>;
  theme: Theme;
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl || !name) return;
    setLoading(true);
    await onImport(videoUrl, subtitleUrl, name);
    setLoading(false);
    onClose();
  };

  const bg = theme === 'dark' ? 'bg-[#161b26]' : 'bg-white';
  const text = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const inputBg = theme === 'dark' ? 'bg-[#0b0e14] border-gray-700' : 'bg-gray-50 border-gray-300';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`${bg} w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className={`text-xl font-bold ${text} flex items-center gap-2`}>
            <Globe className="text-blue-500" size={20} />
            云端资源导入
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">剧集名称</label>
            <div className="relative">
              <Film className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                required
                className={`w-full ${inputBg} border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 transition ${text}`}
                placeholder="例如: 老友记 S01E03"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">视频 URL (MP4/MKV)</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                required
                type="url"
                className={`w-full ${inputBg} border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 transition ${text}`}
                placeholder="https://..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">字幕 URL (SRT)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="url"
                className={`w-full ${inputBg} border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 transition ${text}`}
                placeholder="https://... (可选)"
                value={subtitleUrl}
                onChange={e => setSubtitleUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "开始导入"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type LibraryProps = {
  videos: VideoMeta[];
  folders: FolderType[];
  onSelect: (video: VideoMeta) => void;
  onImportDemo: () => void;
  onImportFile: (file: File, folderId?: string) => void;
  onImportCloud: (videoUrl: string, subtitleUrl: string, name: string) => Promise<void>;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveItem: (itemId: string, type: 'video' | 'folder', newParentId?: string) => void;
  isProcessing: boolean;
  progress: number;
  theme: Theme;
};

export const Library: React.FC<LibraryProps> = ({ 
  videos, 
  folders,
  onSelect, 
  onImportDemo, 
  onImportFile,
  onImportCloud,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveItem,
  isProcessing,
  progress,
  theme
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isDragOverFolder, setIsDragOverFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolders = useMemo(() => folders.filter(f => f.parentId === currentFolderId), [folders, currentFolderId]);
  const currentVideos = useMemo(() => videos.filter(v => v.parentId === currentFolderId), [videos, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    const path = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, folders]);

  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
  const folderBg = theme === 'dark' ? 'bg-[#1c2230] hover:bg-[#252b3b]' : 'bg-blue-50 hover:bg-blue-100';
  const subText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const handleStartCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName('');
  };

  const handleConfirmCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), currentFolderId);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'video' | 'folder') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.id === targetFolderId) return; 
      onMoveItem(data.id, data.type, targetFolderId);
    } catch (err) {
      console.error("Drop failed", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => onImportFile(file, currentFolderId));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto flex flex-col`}>
      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={onImportCloud}
          theme={theme}
        />
      )}

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${textMain} mb-2`}>我的剧库</h1>
            <p className={subText}>管理你的剧集资源</p>
          </div>
          <div className="flex gap-3">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple
                accept=".mp4,.mkv,.webm,.srt"
             />
             <button 
                onClick={onImportDemo}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border ${theme === 'dark' ? 'border-gray-700 bg-green-900/10 hover:bg-green-900/20 text-green-400' : 'border-green-200 bg-green-50 hover:bg-green-100 text-green-600'}`}
             >
                <Film size={18} />
                加载样例
             </button>
             <button 
                onClick={() => setShowImportModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border ${theme === 'dark' ? 'border-gray-700 bg-blue-900/10 hover:bg-blue-900/20 text-blue-400' : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
             >
                <Globe size={18} />
                云端导入
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors border ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'} ${textMain}`}
             >
                <Plus size={18} />
                本地导入
             </button>
          </div>
        </div>

        <div className={`flex items-center gap-2 text-sm ${subText}`}>
          <button 
            onClick={() => setCurrentFolderId(undefined)}
            className={`flex items-center gap-1 hover:text-blue-500 transition ${!currentFolderId ? 'text-blue-500 font-bold' : ''}`}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const data = JSON.parse(e.dataTransfer.getData('text/plain'));
              onMoveItem(data.id, data.type, undefined);
            }}
          >
            <Home size={14} />
            根目录
          </button>
          {breadcrumbs.map((folder, idx) => (
            <React.Fragment key={folder.id}>
              <ChevronRight size={14} />
              <button 
                onClick={() => setCurrentFolderId(folder.id)}
                className={`hover:text-blue-500 transition ${idx === breadcrumbs.length - 1 ? 'text-blue-500 font-bold' : ''}`}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                  onMoveItem(data.id, data.type, folder.id);
                }}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {isProcessing && (
        <div className={`mb-8 ${cardBg} border rounded-xl p-6 flex items-center gap-4 animate-pulse`}>
           <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
           <div className="flex-1">
             <h3 className={`font-bold ${textMain} mb-1`}>正在处理视频...</h3>
             <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
           </div>
           <span className="font-mono text-blue-500 font-bold">{progress}%</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isCreatingFolder && (
          <div className={`p-4 rounded-2xl border-2 border-dashed border-blue-500/50 ${folderBg} flex flex-col items-center gap-3 transition-all`}>
             <Folder className="w-12 h-12 text-blue-500 fill-current opacity-90" />
             <div className="flex items-center gap-1 w-full">
               <input 
                  autoFocus
                  className={`flex-1 text-center bg-transparent border-b border-blue-500 focus:outline-none text-sm ${textMain}`}
                  value={newFolderName}
                  placeholder="文件夹名称..."
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCreateFolder();
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
               />
               <div className="flex flex-col gap-1">
                 <button onClick={handleConfirmCreateFolder} className="text-blue-500 hover:text-blue-400"><Check size={14}/></button>
                 <button onClick={() => setIsCreatingFolder(false)} className="text-gray-500 hover:text-gray-400"><X size={14}/></button>
               </div>
             </div>
          </div>
        )}

        {currentFolders.map((folder) => (
          <div 
            key={folder.id}
            draggable
            onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            onDoubleClick={() => setCurrentFolderId(folder.id)}
            className={`group relative p-4 rounded-2xl border ${
              isDragOverFolder === folder.id ? 'border-blue-500 ring-2 ring-blue-500/20' : theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            } ${folderBg} cursor-pointer transition-all select-none`}
          >
            <div className="flex flex-col items-center justify-center gap-3 py-4">
               <Folder className={`w-12 h-12 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-400'} fill-current opacity-90`} />
               {editingId === folder.id ? (
                 <input 
                    autoFocus
                    className={`w-full text-center bg-transparent border-b border-blue-500 focus:outline-none ${textMain}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => {
                      if (editName.trim()) onRenameFolder(folder.id, editName);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editName.trim()) onRenameFolder(folder.id, editName);
                        setEditingId(null);
                      }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                 />
               ) : (
                 <span className={`font-medium ${textMain} truncate w-full text-center px-2`}>{folder.name}</span>
               )}
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   setEditingId(folder.id);
                   setEditName(folder.name);
                 }}
                 className="p-1.5 rounded-lg bg-black/20 hover:bg-blue-600 text-white backdrop-blur-sm"
               >
                 <Pencil size={12} />
               </button>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   if(confirm('确定要删除这个文件夹及其所有内容吗？')) onDeleteFolder(folder.id);
                 }}
                 className="p-1.5 rounded-lg bg-black/20 hover:bg-red-600 text-white backdrop-blur-sm"
               >
                 <Trash2 size={12} />
               </button>
            </div>
          </div>
        ))}

        {currentVideos.map((video) => (
          <div 
            key={video.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, video.id, 'video')}
            onClick={() => onSelect(video)}
            className={`group ${cardBg} rounded-2xl overflow-hidden border hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-xl`}
          >
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="text-gray-700">
                    <Film size={32} />
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="fill-white text-white ml-1" size={20} />
                </div>
              </div>
            </div>

            <div className="p-3">
              <h3 className={`font-bold text-sm ${textMain} truncate mb-1`}>{video.name}</h3>
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText size={10} /> { (video.id.startsWith('demo') || video.path.includes('.srt') || !!video.subtitleUrl) ? 'SRT' : 'NO SUB' }
                </span>
                <span className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                   {video.season || 'Video'} {video.episode}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {currentFolders.length === 0 && currentVideos.length === 0 && !isProcessing && !isCreatingFolder && (
           <div className={`col-span-full border-2 border-dashed ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'} rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-4`}>
             <div className="w-16 h-16 rounded-full bg-gray-100/10 flex items-center justify-center">
                <Folder className="w-8 h-8 opacity-40" />
             </div>
             <div>
               <h3 className={`text-lg font-medium ${textMain}`}>此文件夹为空</h3>
               <p className="text-sm opacity-70">导入本地视频或云端资源</p>
             </div>
             <div className="flex gap-4">
                <button onClick={handleStartCreateFolder} className="text-blue-500 hover:text-blue-400 font-medium text-sm">新建文件夹</button>
                <button onClick={() => setShowImportModal(true)} className="text-blue-500 hover:text-blue-400 font-medium text-sm">云端导入</button>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};