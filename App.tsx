/// <reference lib="dom" />
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Library } from './components/Library';
import { LearningView } from './components/LearningView';
import { ViewState, ViewStates, VideoMeta, Subtitle, SavedWord, SavedSubtitle, Theme, Folder, CorpusItem } from './types';
import { parseSRT } from './services/srtParser';
import { convertMkvToMp4 } from './services/converter';
import { parseFilename } from './services/metadataParser';
import { generateCorpusForSubtitle, generateCorpusBatch, lookupWord } from './services/geminiService';
import Dexie, { Table } from 'dexie';

// --- IndexedDB Setup ---
type VideoFile = {
  id: string;
  blob: Blob;
};

class AppDatabase extends Dexie {
  videos: Table<VideoMeta>;
  folders: Table<Folder>;
  savedWords: Table<SavedWord>;
  savedSubtitles: Table<SavedSubtitle>;
  videoFiles: Table<VideoFile>;
  corpusItems: Table<CorpusItem>;

  constructor() {
    super('CineLearnDB');
    
    this.version(7).stores({
      videos: 'id, name, parentId',
      folders: 'id, name, parentId',
      savedWords: 'id, word, videoId, mastered',
      savedSubtitles: 'id, videoId',
      videoFiles: 'id',
      corpusItems: 'id, subtitleId, videoId, type'
    });

    this.videos = this.table('videos');
    this.folders = this.table('folders');
    this.savedWords = this.table('savedWords');
    this.savedSubtitles = this.table('savedSubtitles');
    this.videoFiles = this.table('videoFiles');
    this.corpusItems = this.table('corpusItems');
  }
}

const db = new AppDatabase();

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewStates.LIBRARY);
  const [activeVideo, setActiveVideo] = useState<VideoMeta | null>(null);
  const [library, setLibrary] = useState<VideoMeta[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [savedSubtitles, setSavedSubtitles] = useState<SavedSubtitle[]>([]);
  const [corpusItems, setCorpusItems] = useState<CorpusItem[]>([]);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleImportCloud = async (videoUrl: string, subtitleUrl: string, name: string) => {
    const parsed = parseFilename(name);
    
    let targetParentId: string | undefined = undefined;
    if (parsed.showName) {
      const existingFolder = folders.find(f => f.name.toLowerCase() === parsed.showName.toLowerCase());
      if (existingFolder) {
        targetParentId = existingFolder.id;
        if (parsed.season) {
          const seasonFolder = folders.find(f => f.parentId === existingFolder.id && f.name.includes(parsed.season!));
          if (seasonFolder) targetParentId = seasonFolder.id;
        }
      }
    }

    const newVideo: VideoMeta = {
      id: `cloud-${Date.now()}`,
      name: name,
      path: videoUrl,
      subtitleUrl: subtitleUrl || undefined,
      duration: 0,
      lastPlayedTime: 0,
      parentId: targetParentId,
      season: parsed.season,
      episode: parsed.episode
    };

    await db.videos.put(newVideo);
    const updatedLibrary = await db.videos.toArray();
    const vidsWithUrls = await Promise.all(updatedLibrary.map(async (v) => {
      if (v.path === 'blob-db') {
        const fileRecord = await db.videoFiles.get(v.id);
        if (fileRecord) return { ...v, path: URL.createObjectURL(fileRecord.blob) };
      }
      return v;
    }));
    setLibrary(vidsWithUrls);
  };

  const handleImportDemo = async () => {
    await handleImportCloud(
      "https://objectstorage.ap-seoul-1.oraclecloud.com/n/ocichina001/b/joy/o/MDJT%20S01E03.mkv",
      "https://objectstorage.ap-seoul-1.oraclecloud.com/n/ocichina001/b/joy/o/MDJT%20S01E03.srt",
      "MDJT S01E03"
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const vids = await db.videos.toArray();
      const flds = await db.folders.toArray();
      const vidsWithUrls = await Promise.all(vids.map(async (v) => {
        if (v.path === 'blob-db') {
          const fileRecord = await db.videoFiles.get(v.id);
          if (fileRecord) return { ...v, path: URL.createObjectURL(fileRecord.blob) };
        }
        return v;
      }));
      
      setLibrary(vidsWithUrls);
      setFolders(flds);
      const words = await db.savedWords.toArray();
      setSavedWords(words);
      const subs = await db.savedSubtitles.toArray();
      setSavedSubtitles(subs);
      const corp = await db.corpusItems.toArray();
      setCorpusItems(corp);
      setIsLoading(false);

      // Check for review
      const unmasteredCount = words.filter(w => !w.mastered && (Date.now() - w.timestamp > 86400000)).length;
      if (unmasteredCount > 0) {
        // Simple notification (could be a toast)
        console.log(`You have ${unmasteredCount} words to review.`);
      }

      if (vids.length === 0) {
        handleImportDemo();
      }
    };
    loadData();
  }, []);

  const handleCreateFolder = async (name: string, parentId?: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      createdAt: Date.now(),
    };
    await db.folders.add(newFolder);
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  };

  const handleImportFile = async (file: File, folderId?: string) => {
    const isSrt = file.name.toLowerCase().endsWith('.srt');
    if (isSrt) {
      const cleanName = file.name.replace(/\.srt$/i, '');
      const matchingVideo = library.find(v => v.name.includes(cleanName) || cleanName.includes(v.name));
      if (matchingVideo) {
        const text = await file.text();
        const parsedSubs = parseSRT(text);
        setSubtitles(parsedSubs);
      }
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      let finalBlob: Blob = file;
      const fileId = `local-${Date.now()}`;
      const isMkv = file.name.toLowerCase().endsWith('.mkv');

      if (isMkv) {
        finalBlob = await convertMkvToMp4(file, (p) => setProgress(p));
      } else {
        setProgress(100);
      }

      const parsed = parseFilename(file.name);

      let targetFolderId = folderId;
      if (!targetFolderId && parsed.showName) {
         let rootFolder = folders.find(f => f.name.toLowerCase() === parsed.showName.toLowerCase() && !f.parentId);
         if (!rootFolder && confirm(`检测到美剧《${parsed.showName}》，是否为其创建文件夹？`)) {
            rootFolder = await handleCreateFolder(parsed.showName);
         }
         if (rootFolder) {
            targetFolderId = rootFolder.id;
            if (parsed.season) {
               let seasonFolder = folders.find(f => f.parentId === rootFolder!.id && f.name.includes(parsed.season!));
               if (!seasonFolder && confirm(`创建分季目录：${parsed.season}？`)) {
                  seasonFolder = await handleCreateFolder(parsed.season, rootFolder.id);
               }
               if (seasonFolder) targetFolderId = seasonFolder.id;
            }
         }
      }

      await db.videoFiles.put({ id: fileId, blob: finalBlob });

      const newVideo: VideoMeta = {
        id: fileId,
        name: file.name.replace(/\.(mkv|mp4|webm)$/i, ''),
        path: URL.createObjectURL(finalBlob),
        duration: 0,
        lastPlayedTime: 0,
        parentId: targetFolderId,
        season: parsed.season,
        episode: parsed.episode
      };

      await db.videos.put({ ...newVideo, path: 'blob-db' });
      const updatedLibrary = await db.videos.toArray();
      const vidsWithUrls = await Promise.all(updatedLibrary.map(async (v) => {
        if (v.path === 'blob-db') {
          const fileRecord = await db.videoFiles.get(v.id);
          if (fileRecord) return { ...v, path: URL.createObjectURL(fileRecord.blob) };
        }
        return v;
      }));
      setLibrary(vidsWithUrls);
    } catch (error) {
      console.error(error);
      alert("Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoSelect = async (video: VideoMeta) => {
    setActiveVideo(video);
    setSubtitles([]); 

    if (video.subtitleUrl) {
      try {
        const res = await fetch(video.subtitleUrl);
        const text = await res.text();
        const parsedSubs = parseSRT(text);
        setSubtitles(parsedSubs);
      } catch (e) {
        console.warn("Could not fetch subtitles for video", e);
      }
    }

    setView(ViewStates.PLAYER);
  };

  const handleUpdateProgress = useCallback((time: number) => {
    if (activeVideo) {
      setActiveVideo(prev => prev ? ({ ...prev, lastPlayedTime: time }) : null);
      setLibrary(prev => prev.map(v => v.id === activeVideo.id ? { ...v, lastPlayedTime: time } : v));
      db.videos.update(activeVideo.id, { lastPlayedTime: time });
    }
  }, [activeVideo]);

  const handleAnalyzeVideo = async (video: VideoMeta) => {
    if (!video.subtitleUrl && !video.path.endsWith('.srt')) {
      alert("No subtitle URL available for this video.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      let text = '';
      if (video.subtitleUrl) {
        const res = await fetch(video.subtitleUrl);
        text = await res.text();
      } else {
        alert("Batch analysis currently supports cloud subtitles or imported demo.");
        setIsProcessing(false);
        return;
      }

      const parsedSubs = parseSRT(text);
      if (parsedSubs.length === 0) {
        alert("No subtitles found to analyze.");
        setIsProcessing(false);
        return;
      }

      const batchSize = 20;
      const chunks = [];
      for (let i = 0; i < parsedSubs.length; i += batchSize) {
        chunks.push(parsedSubs.slice(i, i + batchSize));
      }

      let completedCount = 0;
      const totalChunks = chunks.length;

      for (const chunk of chunks) {
         const results = await generateCorpusBatch(chunk, `TV Show: ${video.name}`);
         
         if (results && results.length > 0) {
             const newItems: CorpusItem[] = results.map((item, idx) => ({
                 id: `corpus-${item.subtitleId || 'unknown'}-${Date.now()}-${idx}`,
                 subtitleId: item.subtitleId || '',
                 videoId: video.id,
                 type: (item.type || 'vocabulary') as any,
                 content: item.content || '',
                 anchor: item.anchor || undefined,
                 timestamp: Date.now()
             })).filter(item => item.subtitleId !== ''); 

             if (newItems.length > 0) {
                 await db.corpusItems.bulkAdd(newItems);
                 setCorpusItems(prev => [...prev, ...newItems]);
             }
         }

         completedCount++;
         setProgress(Math.round((completedCount / totalChunks) * 100));
         await new Promise(resolve => setTimeout(resolve, 500)); 
      }
      
      alert("Analysis Complete!");

    } catch (e) {
      console.error("Analysis failed", e);
      alert("Analysis failed. Check console.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    await db.folders.delete(id);
    setFolders(prev => prev.filter(f => f.id !== id));
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("确定要删除这个视频吗？")) return;
    
    await db.videos.delete(id);
    await db.videoFiles.delete(id);
    await db.savedWords.where('videoId').equals(id).delete();
    await db.savedSubtitles.where('videoId').equals(id).delete();
    await db.corpusItems.where('videoId').equals(id).delete();

    setLibrary(prev => prev.filter(v => v.id !== id));
    
    if (activeVideo?.id === id) {
       setActiveVideo(null);
       setView(ViewStates.LIBRARY);
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    await db.folders.update(id, { name });
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };

  const handleMoveItem = async (id: string, type: 'video' | 'folder', pid?: string) => {
    if (type === 'video') {
      await db.videos.update(id, { parentId: pid });
      const updatedLibrary = await db.videos.toArray();
      const vidsWithUrls = await Promise.all(updatedLibrary.map(async (v) => {
        if (v.path === 'blob-db') {
          const fileRecord = await db.videoFiles.get(v.id);
          if (fileRecord) return { ...v, path: URL.createObjectURL(fileRecord.blob) };
        }
        return v;
      }));
      setLibrary(vidsWithUrls);
    } else {
      await db.folders.update(id, { parentId: pid });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: pid } : f));
    }
  };

  const handleSaveWord = async (word: string, sub: Subtitle) => {
    if (!activeVideo) return;
    
    // Check if duplicate
    const exists = savedWords.find(w => w.word.toLowerCase() === word.toLowerCase() && w.videoId === activeVideo.id);
    if (exists) {
        alert("已添加到生词本");
        return;
    }

    // Temporary placeholder while loading
    const tempId = `word-${Date.now()}`;
    const newWord: SavedWord = {
      id: tempId,
      word: word.trim(),
      translation: '查询中...',
      contextSentence: sub.text,
      timestamp: Date.now(),
      videoId: activeVideo.id,
      subtitleId: sub.id,
      mastered: false
    };

    setSavedWords(prev => [...prev, newWord]);

    // Async lookup
    try {
        const details = await lookupWord(word, sub.text);
        const finalWord: SavedWord = {
            ...newWord,
            translation: details?.definition || '暂无释义',
            pronunciation: details?.pronunciation || '',
            // If details has translation (Chinese), append it
            contextSentence: sub.text // keep context
        };
        // If we got a translation field from AI, maybe append it to definition or store separate?
        // Using translation field for definition currently based on prompt. 
        // Let's refine: prompt returns definition (eng), translation (cn).
        // Map: definition -> translation property? Or combine?
        // Let's combine: "CN Translation. Eng Definition."
        if (details) {
            finalWord.translation = `${details.translation} ${details.definition}`;
        }

        await db.savedWords.add(finalWord);
        setSavedWords(prev => prev.map(w => w.id === tempId ? finalWord : w));
    } catch (e) {
        await db.savedWords.add(newWord);
        // Keep "查询中" or set to manual needed
    }
  };

  const handleToggleMastered = async (wordId: string) => {
      const word = savedWords.find(w => w.id === wordId);
      if (word) {
          const newVal = !word.mastered;
          await db.savedWords.update(wordId, { mastered: newVal });
          setSavedWords(prev => prev.map(w => w.id === wordId ? { ...w, mastered: newVal } : w));
      }
  };

  const handleToggleSubtitle = async (sub: Subtitle) => {
    if (!activeVideo) return;
    
    // Check if already saved (ID check is robust now with deterministic IDs)
    const existing = savedSubtitles.find(s => s.id === sub.id);
    
    if (existing) {
       await db.savedSubtitles.delete(existing.id);
       setSavedSubtitles(prev => prev.filter(s => s.id !== sub.id));
    } else {
       const newSub: SavedSubtitle = {
          id: sub.id,
          text: sub.text,
          startTime: sub.startTime,
          endTime: sub.endTime,
          videoId: activeVideo.id,
          timestamp: Date.now()
       };
       await db.savedSubtitles.add(newSub);
       setSavedSubtitles(prev => [...prev, newSub]);
    }
  };

  const handleAnalyzeSubtitle = async (sub: Subtitle) => {
    if (!activeVideo) return;
    
    const existing = corpusItems.filter(c => c.subtitleId === sub.id);
    if (existing.length > 0) return;

    try {
        const results = await generateCorpusForSubtitle(sub.text, `TV Show: ${activeVideo.name}`);
        if (results && results.length > 0) {
            const newItems: CorpusItem[] = results.map((item, idx) => ({
                id: `corpus-${sub.id}-${idx}-${Date.now()}`,
                subtitleId: sub.id,
                videoId: activeVideo.id,
                type: (item.type || 'vocabulary') as any,
                content: item.content || '',
                anchor: item.anchor || undefined,
                timestamp: Date.now()
            }));
            
            await db.corpusItems.bulkAdd(newItems);
            setCorpusItems(prev => [...prev, ...newItems]);
        }
    } catch (e) {
        console.error("Failed to analyze subtitle", e);
        alert("AI 分析失败，请检查网络或 Key");
    }
  };

  return (
    <div className={`flex h-screen font-sans antialiased selection:bg-blue-500 selection:text-white ${theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50'}`}>
      <Sidebar 
        currentView={view} 
        setView={setView} 
        theme={theme}
        setTheme={setTheme}
        onImportVideo={(f) => handleImportFile(f)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {view === ViewStates.LIBRARY && (
          <Library 
            videos={library}
            folders={folders} 
            corpusItems={corpusItems}
            onSelect={handleVideoSelect} 
            onAnalyze={handleAnalyzeVideo}
            onDeleteVideo={handleDeleteVideo}
            onImportDemo={handleImportDemo}
            onImportFile={handleImportFile}
            onImportCloud={handleImportCloud}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveItem={handleMoveItem}
            isProcessing={isProcessing}
            progress={progress}
            isLoading={isLoading}
            theme={theme}
          />
        )}

        {view === ViewStates.PLAYER && (
          <Player 
            video={activeVideo} 
            subtitles={subtitles} 
            savedSubtitles={savedSubtitles}
            onWordSave={handleSaveWord}
            onToggleSubtitle={handleToggleSubtitle}
            onAnalyzeSubtitle={handleAnalyzeSubtitle}
            onUpdateProgress={handleUpdateProgress}
            corpusItems={corpusItems}
            theme={theme}
          />
        )}

        {view === ViewStates.LEARNING && (
          <LearningView 
            savedItems={savedWords} 
            savedSubtitles={savedSubtitles}
            corpusItems={corpusItems}
            videos={library}
            folders={folders}
            onDelete={async (id, type) => {
               if (type === 'saved') {
                   await db.savedWords.delete(id);
                   setSavedWords(prev => prev.filter(w => w.id !== id));
               } else if (type === 'subtitle') {
                   await db.savedSubtitles.delete(id);
                   setSavedSubtitles(prev => prev.filter(s => s.id !== id));
               } else {
                   await db.corpusItems.delete(id);
                   setCorpusItems(prev => prev.filter(c => c.id !== id));
               }
            }}
            onToggleMastered={handleToggleMastered}
            onReview={(vid, time) => {
               const v = library.find(x => x.id === vid);
               if (v) {
                   // Ensure we pass a new object with the precise timestamp to trigger the Player's seeking effect
                   const targetVideo = { ...v, lastPlayedTime: time };
                   handleVideoSelect(targetVideo);
               }
            }}
            theme={theme}
          />
        )}
      </main>
    </div>
  );
};

export default App;