
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, FastForward, Rewind, Maximize, Minimize, Sidebar as SidebarIcon, Heart, Repeat1, Languages } from 'lucide-react';
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
  
  // Subtitle State
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [subMode, setSubMode] = useState<SubtitleMode>('dual');
  const [isLoopingSentence, setIsLoopingSentence] = useState(false);
  
  const [showSidePanel, setShowSidePanel] = useState(false);

  // Styling based on theme
  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSub = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
  const controlBg = theme === 'dark' ? 'bg-[#161b26]' : 'bg-white';

  useEffect(() => {
    if (video?.path && videoRef.current) {
      videoRef.current.src = video.path;
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
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
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

  // Time Sync & Subtitle Matching & Looping Logic
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Find current subtitle
    const sub = subtitles.find(s => time >= s.startTime && time <= s.endTime);
    setCurrentSubtitle(sub || null);

    // Loop logic
    if (isLoopingSentence && sub) {
      // Buffer of 0.1s to prevent glitching at the very end
      if (time >= sub.endTime - 0.1) {
        videoRef.current.currentTime = sub.startTime;
        videoRef.current.play(); // Ensure it keeps playing
      }
    } else if (isLoopingSentence && !sub) {
        // If we drifted out of subtitle range (e.g. manual seek), try to find the nearest previous subtitle or just stop looping?
        // For simplicity, if we are looping but not in a subtitle, we might want to check if we just finished one. 
        // But usually the above condition catches the end. 
        // If user seeks away, maybe we should disable loop? keeping it simple for now.
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => {
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

  const changeSpeed = () => {
    const rates = [0.75, 1, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    if (videoRef.current) videoRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const cycleSubMode = () => {
    const modes: SubtitleMode[] = ['dual', 'en', 'cn', 'off'];
    const nextIdx = (modes.indexOf(subMode) + 1) % modes.length;
    setSubMode(modes[nextIdx]);
  };

  const skip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
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

  const getSubModeLabel = (mode: SubtitleMode) => {
    switch (mode) {
      case 'dual': return '双语';
      case 'en': return '英文';
      case 'cn': return '中文';
      case 'off': return '关闭';
    }
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
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${bgMain} p-6`}>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${textMain} mb-1`}>学习模式</h1>
        <p className={`text-sm ${textSub} font-medium`}>当前播放: {video.name}</p>
      </div>

      {/* Main Content Area: Video + SidePanel */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Video Player Container */}
        <div 
          ref={containerRef}
          className={`flex-1 flex flex-col relative group shadow-2xl bg-black overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-3xl'}`}
        >
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
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
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
            
            {/* Big Play Button Overlay */}
            {!isPlaying && !errorMsg && (
                <div 
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
                >
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transform transition hover:scale-105">
                        <Play className="fill-white text-white w-8 h-8 ml-1" />
                    </div>
                </div>
            )}

            {/* Subtitle Overlay */}
            {currentSubtitle && subMode !== 'off' && (
              <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none pb-8 px-4 z-10">
                <div className="flex flex-col items-center gap-2">
                    {getFilteredSubtitleText(currentSubtitle).map((line, index) => (
                    <span 
                        key={index}
                        className="inline-block bg-black/60 text-white text-lg md:text-2xl px-6 py-2 rounded-xl backdrop-blur-md shadow-lg font-medium select-text pointer-events-auto cursor-help hover:bg-black/80 transition"
                        onClick={() => onWordSave(line, currentSubtitle)}
                        title="点击保存到单词本"
                    >
                        {line}
                    </span>
                    ))}
                </div>
                {/* Quick Action for Subtitle */}
                <div className="pointer-events-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                        onClick={() => onSubtitleSave(currentSubtitle)}
                        className="p-2 bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition"
                        title="收藏当前字幕"
                    >
                        <Heart size={18} />
                    </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className={`h-16 ${controlBg} px-6 flex items-center gap-4 shrink-0 z-20`}>
            {/* Play/Pause */}
            <button onClick={togglePlay} className={`${textMain} hover:text-blue-500 transition`}>
              {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
            </button>

            {/* Seek */}
            <div className="flex items-center gap-2">
              <button onClick={() => skip(-5)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800"><Rewind size={18} /></button>
              <button onClick={() => skip(5)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800"><FastForward size={18} /></button>
            </div>

            {/* Time */}
            <div className="text-xs font-mono text-gray-400 w-24 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group/progress mx-2"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pos = (e.clientX - rect.left) / rect.width;
                   if (videoRef.current) videoRef.current.currentTime = pos * duration;
                 }}>
              <div 
                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full" 
                style={{ width: `${(currentTime / duration) * 100}%` }} 
              />
              {/* Hover effect could go here */}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2">
               {/* Speed */}
               <button 
                onClick={changeSpeed} 
                className="px-2 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 min-w-[3rem] text-center select-none"
                title="播放速度"
              >
                {playbackRate}x
              </button>

              <div className="w-px h-6 bg-gray-700 mx-1"></div>

              {/* Subtitle Mode */}
              <button 
                onClick={cycleSubMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition select-none ${subMode !== 'off' ? 'bg-blue-600/20 text-blue-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                title="切换字幕显示 (双语/英文/中文/关闭)"
              >
                <Languages size={14} />
                <span>{getSubModeLabel(subMode)}</span>
              </button>

              {/* Loop Toggle */}
              <button 
                onClick={() => setIsLoopingSentence(!isLoopingSentence)}
                className={`p-2 rounded-lg transition ${isLoopingSentence ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title={isLoopingSentence ? "关闭单句循环" : "开启单句循环"}
              >
                <Repeat1 size={18} />
              </button>

              <div className="w-px h-6 bg-gray-700 mx-1"></div>

              {/* Side Panel Toggle */}
              <button 
                onClick={() => setShowSidePanel(!showSidePanel)}
                className={`p-2 rounded-lg hover:bg-gray-800 ${showSidePanel ? 'text-blue-500' : 'text-gray-400'}`}
                title="显示/隐藏侧边栏"
              >
                <SidebarIcon size={18} />
              </button>

              {/* Fullscreen */}
              <button 
                onClick={toggleFullscreen}
                className={`p-2 rounded-lg hover:bg-gray-800 ${isFullscreen ? 'text-blue-500' : 'text-gray-400'}`}
                title={isFullscreen ? "退出全屏" : "全屏"}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Optional Side Panel */}
        {showSidePanel && (
          <div className={`w-80 ${controlBg} rounded-3xl border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} flex flex-col shrink-0 overflow-hidden`}>
            <div className={`p-5 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className={`font-bold ${textMain} flex items-center gap-2`}>
                学习辅助
              </h3>
            </div>
            <div className="p-5 text-sm text-gray-500 text-center mt-10">
                {currentSubtitle ? (
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-900/50 text-blue-200 text-left">
                            <p className="font-serif text-lg">"{currentSubtitle.text.replace(/\n/g, ' ')}"</p>
                        </div>
                        <button 
                            onClick={() => onSubtitleSave(currentSubtitle)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        >
                            <Heart size={16} /> 收藏本句
                        </button>
                    </div>
                ) : (
                    <p>暂无字幕内容</p>
                )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
