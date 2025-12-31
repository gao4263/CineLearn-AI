/// <reference lib="dom" />
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize, Bookmark, RotateCw, Captions, Sparkles, BookOpen, Plus, X, Volume2, Loader2 } from 'lucide-react';
import { Subtitle, VideoMeta, Theme, CorpusItem, SavedSubtitle } from '../types';
import { lookupWord } from '../services/geminiService';

type PlayerProps = {
  video: VideoMeta | null;
  subtitles: Subtitle[];
  savedSubtitles: SavedSubtitle[];
  corpusItems?: CorpusItem[];
  onWordSave: (word: string, subtitle: Subtitle) => void;
  onToggleSubtitle: (subtitle: Subtitle) => void;
  onAnalyzeSubtitle?: (subtitle: Subtitle) => void;
  onUpdateProgress: (time: number) => void;
  theme: Theme;
};

type SubtitleMode = 'dual' | 'en' | 'cn' | 'off';

type DictPopupState = {
  x: number;
  y: number;
  word: string;
  loading: boolean;
  data: {
    definition: string;
    pronunciation: string;
    translation: string;
  } | null;
};

const CorpusCard: React.FC<{ item: CorpusItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStyles = (type: string) => {
    switch(type) {
        case 'vocabulary': 
            return {
                container: 'bg-green-950/90 border-green-600/50 text-green-100 shadow-green-900/20',
                title: 'text-green-400'
            };
        case 'culture': 
            return {
                container: 'bg-amber-950/90 border-amber-600/50 text-amber-100 shadow-amber-900/20',
                title: 'text-amber-400'
            };
        case 'grammar':
             return {
                container: 'bg-purple-950/90 border-purple-600/50 text-purple-100 shadow-purple-900/20',
                title: 'text-purple-400'
             };
        default: 
            return {
                container: 'bg-slate-900/90 border-slate-600/50 text-slate-100',
                title: 'text-slate-400'
            };
    }
  };

  const styles = getStyles(item.type);
  const typeLabel = item.type === 'vocabulary' ? '词汇' : item.type === 'culture' ? '文化' : item.type === 'grammar' ? '语法' : '知识点';

  return (
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`pointer-events-auto backdrop-blur-md px-5 py-4 rounded-2xl border animate-in slide-in-from-top-4 fade-in duration-500 shadow-xl cursor-pointer transition-all w-[400px] shrink-0 hover:scale-[1.02] ${styles.container} ${isExpanded ? 'z-50' : 'z-auto'}`}
      >
          <div className={`text-xs font-bold uppercase opacity-90 mb-1 ${styles.title}`}>{typeLabel}</div>
          {item.anchor && (
              <div className="text-lg font-bold text-white mb-2 leading-tight">
                  {item.anchor}
              </div>
          )}
          <div className={`text-sm font-medium leading-relaxed tracking-wide text-gray-200 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {item.content}
          </div>
      </div>
  );
};

export const Player: React.FC<PlayerProps> = ({ video, subtitles, savedSubtitles, corpusItems = [], onWordSave, onToggleSubtitle, onAnalyzeSubtitle, onUpdateProgress, theme }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // New buffering state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Subtitle State
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [subMode, setSubMode] = useState<SubtitleMode>('dual');
  const [isLoopingSentence, setIsLoopingSentence] = useState(false);
  
  // Dictionary Popup State
  const [dictPopup, setDictPopup] = useState<DictPopupState | null>(null);

  // Styling based on theme
  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';

  // Get active corpus items for current subtitle
  const activeCorpusItems = useMemo(() => {
    if (!currentSubtitle) return [];
    return corpusItems.filter(item => item.subtitleId === currentSubtitle.id);
  }, [currentSubtitle, corpusItems]);

  // Check if current subtitle is saved
  const isSaved = useMemo(() => {
     return currentSubtitle && savedSubtitles.some(s => s.id === currentSubtitle.id);
  }, [currentSubtitle, savedSubtitles]);

  // Load Video and Restore Progress
  useEffect(() => {
    if (video?.path && videoRef.current) {
      const prevSrc = videoRef.current.getAttribute('src');
      const startAt = video.lastPlayedTime || 0;

      if (prevSrc !== video.path) {
         videoRef.current.pause();
         videoRef.current.src = video.path;
         videoRef.current.load();
         videoRef.current.currentTime = startAt;
         setCurrentTime(startAt);
         setIsPlaying(false);
         setIsBuffering(true); // Set buffering on new video load
         setErrorMsg(null);
         setIsLoopingSentence(false);
         setDictPopup(null);
      } else {
         if (Math.abs(videoRef.current.currentTime - startAt) > 1) {
            videoRef.current.currentTime = startAt;
            setCurrentTime(startAt);
         }
      }
    }
  }, [video]);

  useEffect(() => {
     if (Math.floor(currentTime) % 5 === 0 && currentTime > 0) {
        onUpdateProgress(currentTime);
     }
  }, [currentTime, onUpdateProgress]);

  // Cleanup
  useEffect(() => {
     return () => {
        if (videoRef.current) {
           onUpdateProgress(videoRef.current.currentTime);
        }
     };
  }, []);

  // Close popup on click outside or resume play
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (dictPopup && !(e.target as HTMLElement).closest('#dict-popup')) {
            setDictPopup(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dictPopup]);

  // Reset popup when subtitle changes
  useEffect(() => {
      setDictPopup(null);
  }, [currentSubtitle?.id]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      (containerRef.current as any).requestFullscreen().catch((err: any) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleWordClick = async (e: React.MouseEvent, word: string) => {
      e.stopPropagation();
      if (!currentSubtitle) return;

      // Clean word (remove punctuation)
      const cleanWord = word.replace(/[^a-zA-Z0-9'’-]/g, '');
      if (!cleanWord) return;

      // Pause Video
      if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
      }

      // Calculate Position
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      
      const popupX = rect.left - containerRect.left + (rect.width / 2);
      const popupY = rect.top - containerRect.top - 10;

      // Set Initial Loading State
      setDictPopup({
          x: popupX,
          y: popupY,
          word: cleanWord,
          loading: true,
          data: null
      });

      // Fetch Data
      try {
          const result = await lookupWord(cleanWord, currentSubtitle.text);
          setDictPopup(prev => {
              if (prev && prev.word === cleanWord) {
                  return { ...prev, loading: false, data: result };
              }
              return prev;
          });
      } catch (err) {
          setDictPopup(null);
      }
  };

  const handleAddToVocab = () => {
      if (dictPopup && dictPopup.data && currentSubtitle) {
          onWordSave(dictPopup.word, currentSubtitle);
          setDictPopup(null);
      }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    if (!isDragging) {
       const time = (videoRef.current as any).currentTime;
       setCurrentTime(time);

       const sub = subtitles.find(s => time >= s.startTime && time <= s.endTime);
       setCurrentSubtitle(sub || null);

       if (isLoopingSentence && sub) {
         if (time >= sub.endTime - 0.1) {
           (videoRef.current as any).currentTime = sub.startTime;
           if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
           }
         }
       }
    }
  };

  const togglePlay = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused) {
      try {
        await videoEl.play();
        setIsPlaying(true);
        setErrorMsg(null);
        setDictPopup(null); // Close popup on play
      } catch (e: any) {
        console.warn("Playback prevented:", e);
        if (e.name !== 'AbortError') {
            setErrorMsg(video?.path.endsWith('.mkv') ? "浏览器不支持直接播放MKV，请转换格式。" : `无法播放视频: ${e.message}`);
        }
        setIsPlaying(false);
        setIsBuffering(false);
      }
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (rate: number) => {
    if (videoRef.current) (videoRef.current as any).playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const cycleSubMode = () => {
    const modes: SubtitleMode[] = ['dual', 'en', 'cn', 'off'];
    const nextIdx = (modes.indexOf(subMode) + 1) % modes.length;
    setSubMode(modes[nextIdx]);
  };

  const skip = (amount: number) => {
    if (videoRef.current) {
      (videoRef.current as any).currentTime += amount;
    }
  };

  const handleAnalyzeClick = async () => {
      if (currentSubtitle && onAnalyzeSubtitle) {
          setIsAnalyzing(true);
          await onAnalyzeSubtitle(currentSubtitle);
          setIsAnalyzing(false);
      }
  };

  // --- Scrubber / Progress Bar Logic ---
  const calculateProgress = (clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handleScrubStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Optimistically set buffering when scrub starts
    const newTime = calculateProgress(e.clientX);
    setCurrentTime(newTime); 
  };

  useEffect(() => {
    const handleScrubMove = (e: MouseEvent) => {
       if (isDragging) {
          const newTime = calculateProgress(e.clientX);
          setCurrentTime(newTime);
       }
    };

    const handleScrubEnd = (e: MouseEvent) => {
       if (isDragging) {
          const newTime = calculateProgress(e.clientX);
          if (videoRef.current) {
             videoRef.current.currentTime = newTime;
          }
          setIsDragging(false);
          onUpdateProgress(newTime);
       }
    };

    if (isDragging) {
       document.addEventListener('mousemove', handleScrubMove);
       document.addEventListener('mouseup', handleScrubEnd);
    }

    return () => {
       document.removeEventListener('mousemove', handleScrubMove);
       document.removeEventListener('mouseup', handleScrubEnd);
    };
  }, [isDragging, duration, onUpdateProgress]);


  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

  const renderWords = (text: string, keyPrefix: string, highlightType?: string) => {
      // Split by word boundaries
      const parts = text.split(/([a-zA-Z0-9'’-]+)/g);
      
      // Define styles for highlight types
      let highlightClass = '';
      if (highlightType === 'vocabulary') highlightClass = 'text-green-400 border-b-2 border-green-400/50';
      else if (highlightType === 'culture') highlightClass = 'text-amber-400 border-b-2 border-amber-400/50';
      else if (highlightType === 'grammar') highlightClass = 'text-purple-400 border-b-2 border-purple-400/50';

      return parts.map((part, i) => {
          const isWord = /^[a-zA-Z0-9'’-]+$/.test(part);
          if (isWord) {
              return (
                  <span 
                    key={`${keyPrefix}-${i}`} 
                    onClick={(e) => handleWordClick(e, part)}
                    className={`cursor-pointer hover:scale-105 active:text-blue-500 transition-all inline-block ${highlightType ? highlightClass : 'hover:text-blue-400'}`}
                  >
                      {part}
                  </span>
              );
          }
          return <span key={`${keyPrefix}-${i}`} className={highlightType ? highlightClass : ''}>{part}</span>;
      });
  };

  // Helper to highlight specific ranges in the line based on corpus anchors
  const renderClickableLine = (line: string, index: number) => {
      // 1. Identify ranges to highlight from active corpus items
      const ranges: {start: number, end: number, type: string}[] = [];
      
      activeCorpusItems.forEach(item => {
          if (!item.anchor) return;
          // Case insensitive search
          const idx = line.toLowerCase().indexOf(item.anchor.toLowerCase());
          if (idx !== -1) {
              ranges.push({
                  start: idx,
                  end: idx + item.anchor.length,
                  type: item.type
              });
          }
      });
      
      // Sort ranges by start position
      ranges.sort((a, b) => a.start - b.start);
      
      // Merge overlaps or simple flatten: just iterate and skip if index is passed
      // For simplicity, we assume anchors generally don't overlap in a confusing way
      // We will take the first range that fits, and skip anything that starts before previous ends.
      const mergedRanges: typeof ranges = [];
      let lastEnd = 0;
      ranges.forEach(r => {
          if (r.start >= lastEnd) {
              mergedRanges.push(r);
              lastEnd = r.end;
          }
      });
      
      // Construct components
      const components = [];
      let currentIdx = 0;
      
      mergedRanges.forEach((r, rIdx) => {
          // Non-highlighted part before
          if (r.start > currentIdx) {
              const text = line.substring(currentIdx, r.start);
              components.push(renderWords(text, `normal-${index}-${rIdx}`));
          }
          
          // Highlighted part
          const text = line.substring(r.start, r.end);
          components.push(renderWords(text, `highlight-${index}-${rIdx}`, r.type));
          
          currentIdx = r.end;
      });
      
      // Remaining
      if (currentIdx < line.length) {
          components.push(renderWords(line.substring(currentIdx), `normal-${index}-end`));
      }

      return (
          <div key={index} className="whitespace-pre-wrap leading-relaxed px-4 py-1.5 rounded-xl bg-black/60 backdrop-blur-md shadow-lg inline-block">
              {components}
          </div>
      );
  };

  const getFilteredSubtitleElements = (sub: Subtitle) => {
    const lines = sub.text.split('\n');
    if (subMode === 'off') return [];
    
    // Determine which lines to show based on mode
    const linesToShow = lines.filter(line => {
      const hasCN = isChinese(line);
      if (subMode === 'dual') return true;
      if (subMode === 'cn') return hasCN;
      if (subMode === 'en') return !hasCN;
      return true;
    });

    return linesToShow.map((line, idx) => {
        // Only make English lines clickable
        if (!isChinese(line)) {
            return renderClickableLine(line, idx);
        } else {
             // Plain Chinese line
             return (
                 <span 
                    key={idx}
                    className="inline-block bg-black/60 text-white text-lg md:text-2xl px-4 py-1.5 rounded-xl backdrop-blur-md shadow-lg font-medium"
                 >
                     {line}
                 </span>
             );
        }
    });
  };

  if (!video) {
    return (
      <div className={`flex-1 flex items-center justify-center ${bgMain} ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} flex-col gap-4`}>
        <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center">
             <Play className="w-8 h-8 opacity-50 ml-1" />
        </div>
        <p>请从“我的剧库”选择视频开始学习</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative group/player select-none overflow-hidden" ref={containerRef}>
      
      {/* Video Layer */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
         {errorMsg && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-6 rounded-lg max-w-md text-center">
                <h3 className="text-lg font-bold mb-2">播放错误</h3>
                <p>{errorMsg}</p>
                <button onClick={() => setErrorMsg(null)} className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-500">关闭</button>
              </div>
            </div>
         )}

         {/* Buffering Indicator */}
         {isBuffering && !errorMsg && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm p-4 rounded-full shadow-xl animate-in fade-in duration-200">
                    <Loader2 className="w-10 h-10 text-white/90 animate-spin" />
                </div>
            </div>
         )}

         <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration((e.currentTarget as any).duration)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            // Buffering events
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onSeeking={() => setIsBuffering(true)}
            onSeeked={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onLoadStart={() => setIsBuffering(true)}
            onLoadedData={() => setIsBuffering(false)}
         />
      </div>

      {/* Corpus Overlay (Top Half) */}
      {activeCorpusItems.length > 0 && (
          <div className="absolute top-8 left-0 right-0 flex justify-center z-20 pointer-events-none px-12">
              <div className="flex gap-4 flex-row flex-wrap justify-center items-start">
                  {activeCorpusItems.map((item, idx) => (
                      <CorpusCard key={idx} item={item} />
                  ))}
              </div>
          </div>
      )}

      {/* Subtitle Overlay */}
      {currentSubtitle && subMode !== 'off' && (
        <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-20 px-4 transition-all duration-300 text-lg md:text-2xl font-medium text-white">
           <div className="flex flex-col items-center gap-2 text-center pointer-events-auto">
              {getFilteredSubtitleElements(currentSubtitle)}
           </div>
        </div>
      )}

      {/* Dictionary Popup */}
      {dictPopup && (
         <div 
           id="dict-popup"
           style={{ top: dictPopup.y, left: dictPopup.x }}
           className="absolute z-50 -translate-x-1/2 -translate-y-full mb-2 w-64 bg-[#1e293b]/95 backdrop-blur-xl border border-gray-600 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
         >
            {dictPopup.loading ? (
                <div className="p-6 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-xs">正在查询字典...</span>
                </div>
            ) : dictPopup.data ? (
                <div className="flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-xl font-bold text-white capitalize">{dictPopup.word}</h3>
                            <button onClick={() => setDictPopup(null)} className="text-gray-400 hover:text-white"><X size={16}/></button>
                        </div>
                        {dictPopup.data.pronunciation && (
                            <div className="flex items-center gap-1 text-sm text-gray-400 font-mono mb-2">
                                <span>{dictPopup.data.pronunciation}</span>
                                <Volume2 size={12} className="cursor-pointer hover:text-blue-400" />
                            </div>
                        )}
                        <div className="text-sm text-blue-300 font-medium mb-1">
                            {dictPopup.data.translation}
                        </div>
                        <div className="text-xs text-gray-400 italic">
                            {dictPopup.data.definition}
                        </div>
                    </div>
                    <button 
                       onClick={handleAddToVocab}
                       className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        添加到生词本
                    </button>
                </div>
            ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                    查询失败，请重试
                </div>
            )}
            {/* Arrow Tip */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-[#1e293b]/95 border-b border-r border-gray-600 rotate-45"></div>
         </div>
      )}

      {/* Right Floating Control Stack */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
         {/* Analyze Button */}
         {currentSubtitle && activeCorpusItems.length === 0 && (
             <button 
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all ${isAnalyzing ? 'bg-blue-600/50 cursor-wait' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500'}`}
                title="AI 分析当前字幕语料"
             >
                 <Sparkles size={20} className={isAnalyzing ? 'animate-spin' : ''} />
             </button>
         )}

         {/* Loop Button */}
         <button 
            onClick={() => setIsLoopingSentence(!isLoopingSentence)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all ${isLoopingSentence ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-900/60 text-white hover:bg-gray-900/90'}`}
            title={isLoopingSentence ? "关闭单句循环" : "开启单句循环"}
         >
             <RotateCw size={20} className={isLoopingSentence ? 'animate-spin-slow' : ''} />
         </button>

         {/* Subtitle Toggle */}
         <button 
            onClick={cycleSubMode}
            className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md bg-gray-900/60 text-white hover:bg-gray-900/90 transition-all relative"
            title="切换字幕模式"
         >
             <Captions size={20} className={subMode === 'off' ? 'opacity-40' : ''} />
             <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black uppercase">
               {subMode}
             </span>
         </button>

         {/* Bookmark Button */}
         <button 
            onClick={() => currentSubtitle && onToggleSubtitle(currentSubtitle)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all ${isSaved ? 'bg-yellow-500/90 text-white shadow-lg shadow-yellow-500/30' : 'bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-900/90'} ${currentSubtitle ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            title={isSaved ? "取消收藏" : "收藏当前字幕及语料"}
         >
             <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
         </button>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-8 pb-4 flex items-end gap-6 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
          
          {/* Transport Controls */}
          <div className="flex items-center gap-5 pb-2">
             <button onClick={() => skip(-5)} className="text-gray-300 hover:text-white transition-transform hover:scale-110">
                <SkipBack size={24} fill="currentColor" />
             </button>
             
             <button 
               onClick={togglePlay} 
               className="w-14 h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95"
             >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
             </button>

             <button onClick={() => skip(5)} className="text-gray-300 hover:text-white transition-transform hover:scale-110">
                <SkipForward size={24} fill="currentColor" />
             </button>
          </div>

          {/* Progress Bar Container */}
          <div 
             className="flex-1 pb-4 flex items-center cursor-pointer group/progress py-2"
             ref={progressBarRef}
             onMouseDown={handleScrubStart}
           >
             <div className="w-full h-1 bg-white/20 rounded-full relative overflow-visible transition-all group-hover/progress:h-1.5">
                {/* Track */}
                <div 
                   className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full transition-all duration-75 ease-linear"
                   style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} 
                />
                
                {/* Thumb */}
                <div 
                   className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow transition-opacity ${isDragging ? 'opacity-100 scale-125' : 'opacity-0 group-hover/progress:opacity-100'}`}
                   style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
             </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 pb-3">
              {/* Time */}
              <span className="text-sm font-medium text-gray-300 font-mono tracking-tight select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="w-px h-4 bg-gray-600/50"></div>

              {/* Speed Control */}
              <div className="relative">
                 {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[#1e293b]/95 backdrop-blur-xl border border-gray-700 rounded-xl p-1.5 flex flex-col gap-0.5 shadow-2xl min-w-[90px] animate-in fade-in slide-in-from-bottom-2 origin-bottom-right">
                       {[0.5, 0.75, 1, 1.25, 1.5, 2].reverse().map((rate) => (
                          <button 
                            key={rate} 
                            onClick={() => changeSpeed(rate)}
                            className={`px-3 py-2 text-sm rounded-lg text-left transition-colors flex justify-between items-center ${playbackRate === rate ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:bg-white/10'}`}
                          >
                             <span>{rate === 1 ? '正常' : `${rate}x`}</span>
                          </button>
                       ))}
                    </div>
                 )}
                 <button 
                   onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                   className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1 ${showSpeedMenu ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'}`}
                 >
                    {playbackRate === 1 ? '正常速度' : `${playbackRate}x`}
                 </button>
              </div>

              {/* Fullscreen */}
              <button 
                onClick={toggleFullscreen} 
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                 {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
          </div>
      </div>
    </div>
  );
};