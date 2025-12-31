import React from 'react';
import { LayoutGrid, PlayCircle, BookOpen, HelpCircle, Power, FolderOpen, Film, Settings } from 'lucide-react';
import { ViewState, ViewStates, Theme } from '../types';

type SidebarProps = {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onImportVideo: (file: File) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, theme, setTheme, onImportVideo }) => {
  const navItems = [
    { id: ViewStates.PLAYER, icon: PlayCircle, label: '正在播放' },
    { id: ViewStates.LIBRARY, icon: FolderOpen, label: '我的剧库' },
    { id: ViewStates.LEARNING, icon: BookOpen, label: '语料库' },
    { id: ViewStates.COMMUNITY, icon: LayoutGrid, label: '剧集社区' },
  ];

  const bgColor = theme === 'dark' ? 'bg-[#0f1218]' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const activeBg = theme === 'dark' ? 'bg-[#1a1f2e] border-blue-500' : 'bg-blue-50 border-blue-500';
  const activeText = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';

  return (
    <div className={`w-64 ${bgColor} border-r ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} flex flex-col h-full shrink-0 transition-colors duration-300`}>
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
          <Film size={20} />
        </div>
        <div>
           <div className={`text-xs font-mono mt-1 ${textColor}`}>V1.0.2</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-2 space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 border-l-4 ${
                isActive 
                  ? `${activeBg} ${activeText} border-l-blue-500` 
                  : `border-l-transparent hover:bg-opacity-50 hover:bg-gray-800 ${textColor}`
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-current opacity-20' : ''}`} />
              <span className="font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}

        <div className="pt-4 mt-2 border-t border-gray-800/50">
           <button 
             onClick={() => setView(ViewStates.SETTINGS)}
             className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl ${currentView === ViewStates.SETTINGS ? activeText : textColor} hover:text-gray-200`}
           >
            <Settings size={20} />
            <span>AI 设置</span>
          </button>
          <button 
             onClick={() => setView(ViewStates.HELP)}
             className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl ${currentView === ViewStates.HELP ? activeText : textColor} hover:text-gray-200`}
          >
            <HelpCircle size={20} />
            <span>使用帮助</span>
          </button>
        </div>
      </nav>

      {/* Bottom Widgets */}
      <div className="p-4 space-y-6">
        
        {/* Theme Toggle */}
        <div>
           <div className={`text-xs font-medium mb-3 ${textColor}`}>外观主题</div>
           <div className={`p-1 rounded-full border ${theme === 'dark' ? 'border-gray-700 bg-[#161b26]' : 'border-gray-200 bg-gray-100'} inline-flex`}>
              <button 
                onClick={() => setTheme('dark')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}
              >
                <div className="w-3 h-3 rounded-full bg-current" />
              </button>
              <button 
                 onClick={() => setTheme('light')}
                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme === 'light' ? 'bg-white text-green-500 shadow' : 'text-gray-400'}`}
              >
                <div className="w-3 h-3 rounded-full bg-current" />
              </button>
           </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-800/50">
          <img 
            src="https://picsum.photos/id/64/100/100" 
            alt="User" 
            className="w-10 h-10 rounded-full border-2 border-gray-700"
          />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>学英语的杰克</div>
            <div className="text-xs text-gray-500 truncate">等级: B2 开拓者</div>
          </div>
        </div>

        {/* Logout */}
        <button className={`flex items-center gap-3 text-xs ${textColor} hover:text-red-500 transition-colors`}>
          <Power size={14} />
          退出应用
        </button>
      </div>
    </div>
  );
};