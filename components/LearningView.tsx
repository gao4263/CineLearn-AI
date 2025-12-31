/// <reference lib="dom" />
import React, { useState, useMemo } from 'react';
import { SavedWord, SavedSubtitle, Theme, CorpusItem, VideoMeta, Folder } from '../types';
import { Trash2, PlayCircle, Search, BookOpen, Filter, Sparkles, User, GraduationCap, Languages, Bookmark, Volume2, CheckCircle, Folder as FolderIcon, Film, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

type LearningViewProps = {
  savedItems: SavedWord[];
  savedSubtitles: SavedSubtitle[];
  corpusItems: CorpusItem[];
  videos: VideoMeta[];
  folders: Folder[];
  onDelete: (id: string, type: 'saved' | 'corpus' | 'subtitle') => void;
  onReview: (videoId: string, time: number) => void;
  onToggleMastered?: (id: string) => void;
  theme: Theme;
};

type FilterType = 'all' | 'vocabulary' | 'grammar' | 'culture' | 'subtitle';
type SortType = 'time' | 'alpha';

// --- Icon Helper ---
const GlobeIcon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const getIconForType = (type: string) => {
  switch (type) {
    case 'vocabulary': return <Languages size={20} />;
    case 'grammar': return <GraduationCap size={20} />;
    case 'culture': return <GlobeIcon size={20} />;
    case 'subtitle': return <Bookmark size={20} />;
    default: return <BookOpen size={20} />;
  }
};

// --- Card Component ---
const LearningItemCard = ({ 
    item, 
    theme, 
    onReview, 
    onDelete, 
    onToggleMastered 
}: {
    item: any; 
    theme: Theme; 
    onReview: (vid: string, time: number) => void;
    onDelete: (id: string, type: any) => void;
    onToggleMastered?: (id: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
    
    const isSavedWord = item._type === 'saved';
    const isSubtitle = item._type === 'subtitle';
    const isCorpus = item._type === 'corpus';
    const isMastered = isSavedWord && item.metadata?.mastered;

    // Threshold for showing expand button (approx characters)
    const showExpand = isCorpus && item.content.length > 80;

    return (
        <div 
            onClick={() => onReview(item.videoId, item.startTime || 0)}
            className={`${cardBg} rounded-xl p-5 border ${isMastered ? 'opacity-60 grayscale-[0.5]' : ''} hover:border-blue-500/50 cursor-pointer transition flex gap-5 items-start shadow-sm group/card relative`}
        >
            {/* Icon Box */}
            <div className={`w-12 h-12 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-blue-50'} flex items-center justify-center shrink-0 shadow-inner group-hover/card:scale-110 transition-transform`}>
                <div className={`${isSavedWord ? 'text-blue-500' : isSubtitle ? 'text-yellow-500' : 'text-purple-500'}`}>
                    {getIconForType(item.displayType)}
                </div>
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1 w-full">
                        {/* Title Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <h3 className={`text-lg font-bold ${textMain} break-words group-hover/card:text-blue-400 transition-colors`}>
                                    {item.title}
                                </h3>
                                {isSavedWord && item.metadata?.pronunciation && (
                                    <div className="flex items-center gap-1 text-gray-500 font-mono text-xs bg-black/10 px-2 py-0.5 rounded">
                                        <span>{item.metadata.pronunciation}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Master Toggle */}
                            {isSavedWord && onToggleMastered && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleMastered(item.id); }}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-colors ${isMastered ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/10 text-gray-500 hover:bg-green-500/10 hover:text-green-500'}`}
                                >
                                    <CheckCircle size={12} />
                                    {isMastered ? '已掌握' : '标记掌握'}
                                </button>
                            )}
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-gray-500 flex-wrap mt-1">
                            <span className={`px-1.5 py-0.5 rounded ${isSavedWord ? 'bg-blue-500/10 text-blue-500' : isSubtitle ? 'bg-yellow-500/10 text-yellow-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                {isSavedWord ? '生词' : isSubtitle ? '片段' : 'AI 分析'}
                            </span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                            
                            {isSubtitle && item.metadata && item.metadata.corpusCount > 0 && (
                                <span className="bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded ml-1">
                                    +{item.metadata.corpusCount} 语料
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Content / Definition */}
                <div className={`mt-3 text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {isSavedWord ? (
                        <div className="space-y-2">
                            {item.metadata?.translation && (
                                <p className="font-medium text-blue-400">{item.metadata.translation}</p>
                            )}
                            <div className="bg-black/20 p-2.5 rounded-lg border border-gray-800/50 text-xs italic text-gray-400">
                                <p>"{item.content}"</p>
                            </div>
                        </div>
                    ) : isSubtitle ? (
                        <div className="bg-black/20 p-2.5 rounded-lg border border-gray-800/50">
                            <p className="font-medium text-white/90">"{item.content}"</p>
                        </div>
                    ) : (
                        <div>
                             <p className={`${!isExpanded && showExpand ? 'line-clamp-3' : ''} transition-all duration-300`}>
                                 {item.content}
                             </p>
                             {showExpand && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                    className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                                 >
                                     {isExpanded ? (
                                        <>收起 <ChevronUp size={12} /></>
                                     ) : (
                                        <>展开 <ChevronDown size={12} /></>
                                     )}
                                 </button>
                             )}
                        </div>
                    )}
                </div>
                
                {/* Hover Action Bar */}
                <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onReview(item.videoId, item.startTime || 0); }}
                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transform active:scale-90 transition-all"
                        title="跳转播放"
                    >
                        <PlayCircle size={16} fill="currentColor" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id, item._type); }}
                        className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transform active:scale-90 transition-all"
                        title="删除"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const LearningView: React.FC<LearningViewProps> = ({ savedItems, savedSubtitles, corpusItems, videos, folders, onDelete, onReview, onToggleMastered, theme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('time');
  const [hideMastered, setHideMastered] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const inputBg = theme === 'dark' ? 'bg-[#161b26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
  const groupHeaderBg = theme === 'dark' ? 'bg-[#11161f] hover:bg-[#1c2230]' : 'bg-gray-100 hover:bg-gray-200';
  const subText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  // Helper to build hierarchy string
  const getVideoHierarchy = (videoId: string): { path: string; fullPath: string } => {
      const video = videos.find(v => v.id === videoId);
      if (!video) return { path: 'Uncategorized', fullPath: 'Uncategorized' };

      const pathParts = [];
      let currentFolderId = video.parentId;

      while (currentFolderId) {
          const folder = folders.find(f => f.id === currentFolderId);
          if (folder) {
              pathParts.unshift(folder.name);
              currentFolderId = folder.parentId;
          } else {
              break;
          }
      }
      
      // If no folders, treat as root video
      if (pathParts.length === 0) return { path: video.name, fullPath: video.name };

      return { 
          path: pathParts.join(' / '), 
          fullPath: `${pathParts.join(' / ')} / ${video.name}` 
      };
  };

  // Unite items
  const unifiedItems = useMemo(() => {
    // 1. Saved Words
    const manualItems = savedItems.map(item => ({
      id: item.id,
      videoId: item.videoId,
      subtitleId: item.subtitleId,
      timestamp: item.timestamp,
      _type: 'saved' as const,
      displayType: 'vocabulary' as const, 
      content: item.contextSentence,
      title: item.word,
      metadata: {
          pronunciation: item.pronunciation,
          translation: item.translation,
          mastered: item.mastered
      }
    }));

    // 2. Saved Subtitles
    const subtitleItems = savedSubtitles.map(item => {
        const relatedCorpus = corpusItems.filter(c => c.subtitleId === item.id);
        
        return {
            id: item.id,
            videoId: item.videoId,
            subtitleId: item.id,
            timestamp: item.timestamp,
            startTime: item.startTime,
            _type: 'subtitle' as const,
            displayType: 'subtitle' as const,
            content: item.text,
            title: `片段收藏`,
            metadata: {
                corpusCount: relatedCorpus.length
            }
        };
    });

    const aiItems = corpusItems.map(item => ({
      id: item.id,
      videoId: item.videoId,
      subtitleId: item.subtitleId,
      timestamp: item.timestamp,
      _type: 'corpus' as const,
      displayType: item.type,
      content: item.content,
      // Use anchor (English) as title. Fallback to generic text if missing, or truncated content if really needed.
      title: item.anchor || (item.content.length > 20 ? item.content.substring(0, 20) + '...' : item.content),
      metadata: null
    }));
    
    return [...manualItems, ...subtitleItems, ...aiItems];
  }, [savedItems, savedSubtitles, corpusItems, videos]);

  // Filter items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      // 0. Hide Mastered (Only applies to Saved Words)
      if (hideMastered && item._type === 'saved' && item.metadata?.mastered) return false;

      // 1. Filter Type
      if (filterType !== 'all') {
        if (item.displayType !== filterType) return false;
      }

      // 2. Search Term
      if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(lowerTerm);
        const contentMatch = item.content.toLowerCase().includes(lowerTerm);
        return titleMatch || contentMatch;
      }

      return true;
    });
  }, [unifiedItems, filterType, searchTerm, hideMastered]);

  // Group items by Video (and implicitly by folder structure)
  const groupedData = useMemo(() => {
     const groups: Record<string, typeof filteredItems> = {};
     
     filteredItems.forEach(item => {
         if (!groups[item.videoId]) groups[item.videoId] = [];
         groups[item.videoId].push(item);
     });

     // Sort items within groups
     Object.keys(groups).forEach(key => {
         groups[key].sort((a, b) => {
             if (sortType === 'time') {
                 return b.timestamp - a.timestamp;
             } else {
                 return a.title.localeCompare(b.title);
             }
         });
     });

     return groups;
  }, [filteredItems, sortType]);

  // Get sorted list of group keys (Video IDs) based on Hierarchy string
  const sortedGroupKeys = useMemo(() => {
      return Object.keys(groupedData).sort((aId, bId) => {
          const hA = getVideoHierarchy(aId).fullPath;
          const hB = getVideoHierarchy(bId).fullPath;
          return hA.localeCompare(hB);
      });
  }, [groupedData, videos, folders]);

  const toggleGroup = (videoId: string) => {
      setExpandedGroups(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto`}>
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${textMain} mb-2`}>语料库 & 收藏</h1>
            <p className={subText}>查看已解析的知识点和收藏的精彩片段，按剧集整理</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Sort */}
             <select 
               value={sortType}
               onChange={(e) => setSortType(e.target.value as SortType)}
               className={`${inputBg} px-3 py-2.5 rounded-xl focus:outline-none text-sm font-medium`}
             >
                 <option value="time">按添加时间排序</option>
                 <option value="alpha">按字母顺序排序</option>
             </select>

             {/* Search */}
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="搜索内容..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${inputBg} pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 w-64 shadow-sm transition-all`}
                />
              </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center">
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                { id: 'all', label: '全部' },
                { id: 'subtitle', label: '片段收藏' },
                { id: 'vocabulary', label: '词汇/生词' },
                { id: 'grammar', label: '语法' },
                { id: 'culture', label: '文化' }
                ].map(f => (
                <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as FilterType)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    filterType === f.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : `${theme === 'dark' ? 'bg-[#161b26] text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-black'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`
                    }`}
                >
                    {f.label}
                </button>
                ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-500 select-none">
                <input 
                    type="checkbox" 
                    checked={hideMastered}
                    onChange={(e) => setHideMastered(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                隐藏已掌握
            </label>
        </div>
      </div>

      <div className="space-y-6">
        {sortedGroupKeys.map((videoId) => {
           const items = groupedData[videoId];
           const hierarchy = getVideoHierarchy(videoId);
           const videoName = videos.find(v => v.id === videoId)?.name || 'Unknown Video';
           const isExpanded = expandedGroups[videoId] !== false; // Default expanded

           return (
               <div key={videoId} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {/* Hierarchy Header */}
                   <button 
                     onClick={() => toggleGroup(videoId)}
                     className={`w-full flex items-center gap-3 p-3 rounded-xl ${groupHeaderBg} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'} transition-all mb-4 group text-left`}
                   >
                       {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                       
                       <FolderIcon size={18} className="text-blue-500" />
                       <div className="flex-1">
                           <div className={`text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5`}>{hierarchy.path}</div>
                           <div className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                               {videoName}
                               <span className="text-xs bg-gray-500/10 text-gray-500 px-2 py-0.5 rounded-full font-medium">{items.length} 个内容</span>
                           </div>
                       </div>
                   </button>

                   {/* Items Grid */}
                   {isExpanded && (
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pl-4 border-l-2 border-dashed border-gray-800/50">
                           {items.map((item) => (
                               <LearningItemCard 
                                 key={item.id} 
                                 item={item} 
                                 theme={theme}
                                 onReview={onReview}
                                 onDelete={onDelete}
                                 onToggleMastered={onToggleMastered}
                               />
                           ))}
                       </div>
                   )}
               </div>
           );
        })}

        {sortedGroupKeys.length === 0 && (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
              <Filter className="opacity-40" size={32} />
            </div>
            <p>没有找到相关内容。<br/>尝试不同的搜索词或分类，或者去剧库添加收藏。</p>
          </div>
        )}
      </div>
    </div>
  );
};