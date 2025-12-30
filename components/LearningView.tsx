import React from 'react';
import { SavedWord, Theme } from '../types';
import { Trash2, PlayCircle, Search } from 'lucide-react';

type LearningViewProps = {
  savedItems: SavedWord[];
  onDelete: (id: string) => void;
  onReview: (videoId: string, time: number) => void;
  theme: Theme;
};

export const LearningView: React.FC<LearningViewProps> = ({ savedItems, onDelete, onReview, theme }) => {
  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
  const subText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const inputBg = theme === 'dark' ? 'bg-[#161b26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textMain} mb-2`}>收藏夹</h1>
          <p className={subText}>复习你收藏的生词和例句</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="搜索收藏内容..." 
            className={`${inputBg} pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-64 shadow-sm`}
          />
        </div>
      </div>

      <div className="space-y-4">
        {savedItems.map((item) => (
          <div key={item.id} className={`${cardBg} rounded-xl p-5 border hover:border-gray-500 transition flex gap-6 items-start shadow-sm`}>
             <div className={`w-12 h-12 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-blue-50'} flex items-center justify-center shrink-0 font-serif text-xl font-bold text-blue-500`}>
               {item.word.charAt(0).toUpperCase()}
             </div>
             
             <div className="flex-1">
               <div className="flex justify-between items-start">
                 <h3 className={`text-lg font-bold ${textMain}`}>{item.word}</h3>
                 <span className="text-xs text-gray-500 font-mono">
                   {new Date(item.timestamp).toLocaleDateString()}
                 </span>
               </div>
               
               <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mt-2 italic text-lg font-serif`}>"{item.contextSentence}"</p>
               
               <div className="mt-4 flex gap-3">
                 <button 
                  onClick={() => onReview(item.videoId, 0)} 
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide"
                 >
                   <PlayCircle size={14} /> 回顾片段
                 </button>
                 <button 
                   onClick={() => onDelete(item.id)}
                   className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-400 uppercase tracking-wide"
                 >
                   <Trash2 size={14} /> 移除
                 </button>
               </div>
             </div>
          </div>
        ))}

        {savedItems.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>还没有收藏内容。去观看视频并收藏一些台词吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};