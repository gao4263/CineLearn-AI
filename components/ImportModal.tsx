import React, { useState } from 'react';
import { X, Globe, Link, FileText, Film, Loader2 } from 'lucide-react';
import { Theme } from '../types';

export const ImportModal = ({ onClose, onImport, theme }: {
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
