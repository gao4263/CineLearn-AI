
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize, Bookmark, RotateCw, Captions, ChevronUp } from 'lucide-react';
import { Subtitle, VideoMeta, Theme } from '../types';

type PlayerProps = {
  video: VideoMeta | null;
  subtitles: Subtitle[];
  onWordSave: (word: string, subtitle: Subtitle) => void;
  onSubtitleSave: (subtitle: Subtitle) => void;
  theme: Theme;
};

type SubtitleMode = 'dual' | 'en' | 'cn' | 'off';

export const Player: React.FC<PlayerProps> = ({ video, subtitles, onWordSave, onSubtitleSave, theme }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  // Subtitle State
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [subMode, setSubMode] = useState<SubtitleMode>('dual');
  const [isLoopingSentence, setIsLoopingSentence] = useState(false);
  
  // Styling based on theme
  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';

  useEffect(() => {
    if (video?.path && videoRef.current) {
      (videoRef.current as any).src = video.path;
      // Reset state
      setCurrentTime(0);
      setIsPlaying(false);
      setErrorMsg(null);
      setIsLoopingSentence(false);
    }
  }, [video]);

  // Fullscreen logic
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!window.document.fullscreenElement) {
      (containerRef.current as any).requestFullscreen().catch((err: any) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      window.document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };
    window.document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => window.document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Time Sync & Subtitle Matching & Looping Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = (videoRef.current as any).currentTime;
    setCurrentTime(time);

    // Find current subtitle
    const sub = subtitles.find(s => time >= s.startTime && time <= s.endTime);
    setCurrentSubtitle(sub || null);

    // Loop logic
    if (isLoopingSentence && sub) {
      // Buffer of 0.1s to prevent glitching at the very end
      if (time >= sub.endTime - 0.1) {
        (videoRef.current as any).currentTime = sub.startTime;
        (videoRef.current as any).play(); // Ensure it keeps playing
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      (videoRef.current as any).pause();
    } else {
      (videoRef.current as any).play().catch((e: any) => {
        console.error("Playback error:", e);
        if (video?.path.endsWith('.mkv')) {
          setErrorMsg("浏览器不支持直接播放MKV，请转换格式。");
        } else {
          setErrorMsg("无法播放视频");
        }
      });
    }
    setIsPlaying(!isPlaying);
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

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

  const getFilteredSubtitleText = (sub: Subtitle): string[] => {
    const lines = sub.text.split('\n');
    if (subMode === 'off') return [];
    if (subMode === 'dual') return lines;
    
    return lines.filter(line => {
      const hasCN = isChinese(line);
      if (subMode === 'cn') return hasCN;
      if (subMode === 'en') return !hasCN;
      return true;
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
         <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration((e.currentTarget as any).duration)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
         />
      </div>

      {/* Subtitle Overlay */}
      {currentSubtitle && subMode !== 'off' && (
        <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-20 px-4 transition-all duration-300">
           <div className="flex flex-col items-center gap-2 text-center">
              {getFilteredSubtitleText(currentSubtitle).map((line, index) => (
                <span 
                    key={index}
                    className="inline-block bg-black/60 text-white text-lg md:text-2xl px-4 py-1.5 rounded-xl backdrop-blur-md shadow-lg font-medium select-text pointer-events-auto cursor-help hover:bg-black/80 transition"
                    onClick={() => onWordSave(line, currentSubtitle)}
                    title="点击保存到生词本"
                >
                    {line}
                </span>
              ))}
           </div>
        </div>
      )}

      {/* Right Floating Control Stack */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
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
            onClick={() => currentSubtitle && onSubtitleSave(currentSubtitle)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all ${currentSubtitle ? 'bg-gray-900/60 text-white hover:bg-gray-900/90 cursor-pointer' : 'bg-gray-900/30 text-gray-500 cursor-not-allowed'}`}
            title="收藏当前字幕"
         >
             <Bookmark size={20} />
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
          <div className="flex-1 pb-4 flex items-center cursor-pointer group/progress"
               onClick={(e) => {
                 const rect = (e.currentTarget as any).getBoundingClientRect();
                 const pos = (e.clientX - rect.left) / rect.width;
                 if (videoRef.current) (videoRef.current as any).currentTime = pos * duration;
               }}>
             <div className="w-full h-1 bg-white/20 rounded-full relative overflow-visible transition-all group-hover/progress:h-1.5">
                <div 
                   className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full" 
                   style={{ width: `${(currentTime / duration) * 100}%` }} 
                />
                <div 
                   className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"
                   style={{ left: `${(currentTime / duration) * 100}%` }}
                />
             </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 pb-3">
              {/* Time */}
              <span className="text-sm font-medium text-gray-300 font-mono tracking-tight">
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
