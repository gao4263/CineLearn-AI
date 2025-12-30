
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Library } from './components/Library';
import { LearningView } from './components/LearningView';
import { ViewState, ViewStates, VideoMeta, Subtitle, SavedWord, SavedSubtitle, Theme, Folder } from './types';
import { parseSRT } from './services/srtParser';
import { convertMkvToMp4 } from './services/converter';
import { parseFilename } from './services/metadataParser';
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

  constructor() {
    super('CineLearnDB');
    
    this.version(5).stores({
      videos: 'id, name, parentId',
      folders: 'id, name, parentId',
      savedWords: 'id, word, videoId',
      savedSubtitles: 'id, videoId',
      videoFiles: 'id'
    });

    this.videos = this.table('videos');
    this.folders = this.table('folders');
    this.savedWords = this.table('savedWords');
    this.savedSubtitles = this.table('savedSubtitles');
    this.videoFiles = this.table('videoFiles');
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
  const [theme, setTheme] = useState<Theme>('dark');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

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

      // Auto-load demo if library is empty
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

  const handleDeleteFolder = async (id: string) => {
    await db.folders.delete(id);
    setFolders(prev => prev.filter(f => f.id !== id));
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
    const newWord: SavedWord = {
      id: `word-${Date.now()}`,
      word: word.trim(),
      translation: 'Pending...',
      contextSentence: sub.text,
      timestamp: Date.now(),
      videoId: activeVideo.id
    };
    await db.savedWords.add(newWord);
    setSavedWords(prev => [...prev, newWord]);
  };

  const handleSaveSubtitle = async (sub: Subtitle) => {
    if (!activeVideo) return;
    const newSub: SavedSubtitle = {
      id: `saved-sub-${Date.now()}`,
      text: sub.text,
      startTime: sub.startTime,
      endTime: sub.endTime,
      videoId: activeVideo.id,
      timestamp: Date.now()
    };
    await db.savedSubtitles.add(newSub);
    setSavedSubtitles(prev => [...prev, newSub]);
    alert("字幕已收藏！"); // Simple feedback
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
            onSelect={handleVideoSelect} 
            onImportDemo={handleImportDemo}
            onImportFile={handleImportFile}
            onImportCloud={handleImportCloud}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveItem={handleMoveItem}
            isProcessing={isProcessing}
            progress={progress}
            theme={theme}
          />
        )}

        {view === ViewStates.PLAYER && (
          <Player 
            video={activeVideo} 
            subtitles={subtitles} 
            onWordSave={handleSaveWord}
            onSubtitleSave={handleSaveSubtitle}
            theme={theme}
          />
        )}

        {view === ViewStates.LEARNING && (
          <LearningView 
            savedItems={savedWords} 
            onDelete={async (id) => {
               await db.savedWords.delete(id);
               setSavedWords(prev => prev.filter(w => w.id !== id));
            }}
            onReview={(vid) => {
               const v = library.find(x => x.id === vid);
               if (v) handleVideoSelect(v);
            }}
            theme={theme}
          />
        )}
      </main>
    </div>
  );
};

export default App;
