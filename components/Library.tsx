/// <reference lib="dom" />
import React, { useState, useRef, useMemo } from 'react';
import { Play, FileText, Plus, Loader2, Film, Folder, FolderPlus, ArrowLeft, MoreVertical, Pencil, Trash2, Home, ChevronRight, Check, X, Globe, Link as LinkIcon, Sparkles, Captions } from 'lucide-react';
import { VideoMeta, Folder as FolderType, Theme, CorpusItem } from '../types';

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
                onChange={e => setName((e.target as any).value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">视频 URL (MP4/MKV)</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                required
                type="url"
                className={`w-full ${inputBg} border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 transition ${text}`}
                placeholder="https://..."
                value={videoUrl}
                onChange={e => setVideoUrl((e.target as any).value)}
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
                onChange={e => setSubtitleUrl((e.target as any).value)}
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
  corpusItems: CorpusItem[];
  onSelect: (video: VideoMeta) => void;
  onAnalyze: (video: VideoMeta) => void;
  onDeleteVideo: (id: string) => void;
  onImportDemo: () => void;
  onImportFile: (file: File, folderId?: string) => void;
  onImportCloud: (videoUrl: string, subtitleUrl: string, name: string) => Promise<void>;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveItem: (itemId: string, type: 'video' | 'folder', newParentId?: string) => void;
  isProcessing: boolean;
  progress: number;
  isLoading: boolean;
  theme: Theme;
};

export const Library: React.FC<LibraryProps> = ({ 
  videos, 
  folders,
  corpusItems,
  onSelect, 
  onAnalyze,
  onDeleteVideo,
  onImportDemo, 
  onImportFile,
  onImportCloud,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveItem,
  isProcessing,
  progress,
  isLoading,
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

  // Pre-calculate corpus counts per video
  const corpusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    corpusItems.forEach(item => {
      counts[item.videoId] = (counts[item.videoId] || 0) + 1;
    });
    return counts;
  }, [corpusItems]);

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
    (e.dataTransfer as any).setData('text/plain', JSON.stringify({ id, type }));
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
      const data = JSON.parse((e.dataTransfer as any).getData('text/plain'));
      if (data.id === targetFolderId) return; 
      onMoveItem(data.id, data.type, targetFolderId);
    } catch (err) {
      console.error("Drop failed", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (e.target as any).files;
    if (files) {
      Array.from(files).forEach(file => onImportFile(file as any, currentFolderId));
    }
    if (fileInputRef.current) (fileInputRef.current as any).value = '';
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
                onClick={() => (fileInputRef.current as any)?.click()}
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
              const data = JSON.parse((e.dataTransfer as any).getData('text/plain'));
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
                  const data = JSON.parse((e.dataTransfer as any).getData('text/plain'));
                  onMoveItem(data.id, data.type, folder.id);
                }}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Creation Input */}
        {isCreatingFolder && (
          <div className={`p-4 rounded-2xl border-2 border-dashed border-blue-500/50 ${folderBg} flex flex-col items-center gap-3 transition-all`}>
             <Folder className="w-12 h-12 text-blue-500 fill-current opacity-90" />
             <div className="flex items-center gap-1 w-full">
               <input 
                  autoFocus
                  className={`flex-1 text-center bg-transparent border-b border-blue-500 focus:outline-none text-sm ${textMain}`}
                  value={newFolderName}
                  placeholder="文件夹名称..."
                  onChange={(e) => setNewFolderName((e.target as any).value)}
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

        {/* Processing Card - Shows when importing/converting */}
        {isProcessing && (
          <div className={`group ${cardBg} rounded-2xl overflow-hidden border border-blue-500/50 relative shadow-[0_0_15px_rgba(59,130,246,0.1)]`}>
            <div className="aspect-video bg-gray-900/50 relative flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-blue-500/5 animate-pulse" />
               
               <div className="flex flex-col items-center gap-3 z-10 p-4 text-center">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                 <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-blue-400 whitespace-nowrap">AI 正在分析语料...</span>
                    <span className="text-[10px] text-blue-500/70 font-mono mt-1">{progress}%</span>
                 </div>
               </div>
               
               {/* Progress Bar at bottom */}
               <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                  <div className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
               </div>
            </div>

            <div className="p-3 space-y-2 opacity-50">
               <div className="h-4 bg-gray-700/50 rounded w-2/3 animate-pulse" />
               <div className="h-3 bg-gray-700/30 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading Skeletons for Initial Load */}
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
           <div key={`skel-${i}`} className={`${cardBg} rounded-2xl overflow-hidden border border-transparent`}>
             <div className="aspect-video bg-gray-800/50 animate-pulse" />
             <div className="p-3 space-y-2">
               <div className="h-4 bg-gray-800/50 rounded w-3/4 animate-pulse" />
               <div className="h-3 bg-gray-800/30 rounded w-1/2 animate-pulse" />
             </div>
           </div>
        ))}

        {/* Loaded Folders */}
        {!isLoading && currentFolders.map((folder) => (
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
                    onChange={(e) => setEditName((e.target as any).value)}
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

        {/* Loaded Videos */}
        {!isLoading && currentVideos.map((video) => {
           const isLocal = video.id.startsWith('local-');
           const hasSubtitle = !!(video.subtitleUrl || video.path.endsWith('.srt') || video.id.startsWith('demo'));
           const corpusCount = corpusCounts[video.id] || 0;
           
           return (
            <div 
              key={video.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, video.id, 'video')}
              onClick={() => onSelect(video)}
              className={`group ${cardBg} rounded-2xl overflow-hidden border hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-xl relative`}
            >
              <div className="aspect-video bg-black relative flex items-center justify-center">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="text-gray-700">
                      <Film size={32} />
                  </div>
                )}
                
                {/* Overlay Action Bar */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-20 pointer-events-none">
                   {/* Source Badge (Left) */}
                   <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${theme === 'dark' ? 'bg-black/60 text-white' : 'bg-white/80 text-black'} backdrop-blur-md shadow-sm`}>
                      {isLocal ? <LinkIcon size={10} className="rotate-45" /> : <Globe size={10} />}
                      {isLocal ? '本地' : '云端'}
                   </div>

                   {/* Right Side Stack */}
                   <div className="flex flex-col items-end gap-2 pointer-events-auto">
                       {/* Status Badges (Always Visible) */}
                       <div className="flex gap-2">
                           {hasSubtitle && (
                             <div className="px-2 py-1.5 rounded-lg bg-green-600/90 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                                <Captions size={12} />
                                <span>1 字幕</span>
                             </div>
                           )}

                           {corpusCount > 0 && (
                             <div className="px-2 py-1.5 rounded-lg bg-purple-600/90 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-md animate-in zoom-in">
                                <Sparkles size={12} />
                                <span>{corpusCount} 语料</span>
                             </div>
                           )}
                       </div>

                       {/* Action Buttons (Hover Only) */}
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                           {hasSubtitle && (
                             <button
                               onClick={(e) => { e.stopPropagation(); onAnalyze(video); }}
                               className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 hover:bg-purple-600 text-white backdrop-blur-md transition-colors shadow-sm"
                               title="AI 分析"
                             >
                               <Sparkles size={14} />
                             </button>
                           )}

                           <button
                             onClick={(e) => { e.stopPropagation(); onDeleteVideo(video.id); }}
                             className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-sm transition-colors"
                             title="删除"
                           >
                             <Trash2 size={14} />
                           </button>
                       </div>
                   </div>
                </div>

                {/* Play Button Center */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
                    <Play className="fill-white text-white ml-1" size={24} />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className={`font-bold text-base ${textMain} truncate mb-2`}>{video.name}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} font-medium`}>
                     #{isLocal ? '本地文件' : '云端资源'}
                  </span>
                  <span className="font-mono opacity-80">
                     {video.lastPlayedTime > 0 ? new Date(video.lastPlayedTime).toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
           );
        })}
        
        {/* Empty State */}
        {currentFolders.length === 0 && currentVideos.length === 0 && !isProcessing && !isLoading && !isCreatingFolder && (
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