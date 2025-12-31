/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { Search, Download, Star, Clock, Globe, Film, Loader2, Filter, ExternalLink } from 'lucide-react';
import { Theme } from '../types';

type CommunityResource = {
  id: string;
  title: string;
  originalTitle: string;
  description: string;
  cover: string;
  rating: number;
  duration: string;
  tags: string[];
  videoUrl: string; // Acts as the Netdisk/Download Link
  subtitleUrl: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
};

type CommunityViewProps = {
  theme: Theme;
};

// Mock Server Data
const MOCK_RESOURCES: CommunityResource[] = [
  {
    id: "res-1",
    title: "老友记 第一季 第三集",
    originalTitle: "Friends S01E03",
    description: "钱德勒重新吸烟引起了大家的不满。菲比发现银行多给了她500美元，她决定把钱送人...",
    cover: "https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg",
    rating: 9.8,
    duration: "22 min",
    tags: ["喜剧", "生活", "经典"],
    level: 'Beginner',
    videoUrl: "https://pan.baidu.com/s/example-friends", // Simulated Netdisk Link
    subtitleUrl: ""
  },
  {
    id: "res-2",
    title: "生活大爆炸 第一季 第一集",
    originalTitle: "The Big Bang Theory S01E01",
    description: "伦纳德和谢尔顿遇到了一位美丽的新邻居佩妮，伦纳德立刻对她一见钟情。",
    cover: "https://image.tmdb.org/t/p/w500/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg",
    rating: 9.5,
    duration: "21 min",
    tags: ["科学", "情景喜剧", "极客"],
    level: 'Intermediate',
    videoUrl: "https://pan.quark.cn/s/example-tbbt",
    subtitleUrl: ""
  },
  {
    id: "res-3",
    title: "摩登家庭 第一季 第一集",
    originalTitle: "Modern Family S01E01",
    description: "透过镜头记录三个典型的美国家庭生活中发生的趣事。",
    cover: "https://image.tmdb.org/t/p/w500/klL4uhwiU8aFzzlGpdxEULYpGg.jpg",
    rating: 9.6,
    duration: "23 min",
    tags: ["家庭", "伪纪录片", "温情"],
    level: 'Intermediate',
    videoUrl: "https://www.aliyundrive.com/s/example-modernfamily",
    subtitleUrl: ""
  },
  {
    id: "res-4",
    title: "绝望的主妇 第一季 第一集",
    originalTitle: "Desperate Housewives S01E01",
    description: "紫藤巷看起来是一个完美的地方，直到玛丽·爱丽丝·杨自杀...",
    cover: "https://image.tmdb.org/t/p/w500/5Up7y3D7X9Uo1j3yY7ZqXz0z2n.jpg",
    rating: 9.2,
    duration: "43 min",
    tags: ["悬疑", "剧情", "女性"],
    level: 'Advanced',
    videoUrl: "https://pan.baidu.com/s/example-dh",
    subtitleUrl: ""
  },
  {
    id: "res-5",
    title: "瑞克和莫蒂 第一季 第一集",
    originalTitle: "Rick and Morty S01E01",
    description: "疯狂科学家瑞克带着由于孙子莫蒂进行疯狂的宇宙冒险。",
    cover: "https://image.tmdb.org/t/p/w500/8kOWDBK6XlPUzckuHDo3wwVRFwt.jpg",
    rating: 9.9,
    duration: "23 min",
    tags: ["科幻", "动画", "黑色幽默"],
    level: 'Advanced',
    videoUrl: "https://pan.quark.cn/s/example-rm",
    subtitleUrl: ""
  },
  {
    id: "res-6",
    title: "权力的游戏 第一季 第一集",
    originalTitle: "Game of Thrones S01E01",
    description: "维斯特洛大陆的七大王国之间的权力斗争。",
    cover: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhy95hfwDWR.jpg",
    rating: 9.4,
    duration: "60 min",
    tags: ["奇幻", "史诗", "剧情"],
    level: 'Advanced',
    videoUrl: "https://www.aliyundrive.com/s/example-got",
    subtitleUrl: ""
  }
];

export const CommunityView: React.FC<CommunityViewProps> = ({ theme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('All');
  
  // Simulate network fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadClick = (url: string) => {
    if (!url) {
        alert("暂无下载链接");
        return;
    }
    // Open in new tab
    window.open(url, '_blank');
  };

  const filteredResources = MOCK_RESOURCES.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          res.originalTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLevel === 'All' || res.level === filterLevel;
    return matchesSearch && matchesFilter;
  });

  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-[#161b26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
  const subText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto`}>
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${textMain} mb-2 flex items-center gap-2`}>
              <Globe className="text-blue-500" />
              剧集社区
            </h1>
            <p className={subText}>发现热门美剧，获取网盘资源下载链接</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="搜索剧集..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputBg} pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 w-64 shadow-sm transition-all`}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
               <button
                 key={level}
                 onClick={() => setFilterLevel(level)}
                 className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                   filterLevel === level 
                     ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' 
                     : `${theme === 'dark' ? 'bg-[#161b26] text-gray-400 border-gray-800 hover:text-white' : 'bg-white text-gray-600 border-gray-200 hover:text-black'}`
                 }`}
               >
                 {level === 'All' ? '全部等级' : level}
               </button>
            ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
           <p className={subText}>正在连接社区资源库...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {filteredResources.map(res => (
             <div key={res.id} className={`${cardBg} rounded-2xl overflow-hidden border flex flex-col group hover:shadow-2xl hover:border-blue-500/30 transition-all duration-300`}>
                {/* Cover Image */}
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                   <img 
                     src={res.cover} 
                     alt={res.title}
                     className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                   />
                   <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-yellow-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Star size={12} fill="currentColor" />
                      {res.rating}
                   </div>
                   <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                      {res.level}
                   </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                   <h3 className={`font-bold text-lg ${textMain} mb-1 line-clamp-1`}>{res.title}</h3>
                   <div className="text-xs text-gray-500 font-mono mb-3">{res.originalTitle}</div>
                   
                   <p className={`text-sm ${subText} line-clamp-2 mb-4 flex-1 leading-relaxed`}>
                      {res.description}
                   </p>

                   <div className="flex flex-wrap gap-2 mb-4">
                      {res.tags.map(tag => (
                         <span key={tag} className={`text-[10px] px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                           #{tag}
                         </span>
                      ))}
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                         <Clock size={14} />
                         <span>{res.duration}</span>
                      </div>
                      
                      <button 
                         onClick={() => handleDownloadClick(res.videoUrl)}
                         className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                      >
                         <ExternalLink size={16} />
                         下载剧集
                      </button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
      
      {!loading && filteredResources.length === 0 && (
         <div className="text-center py-20 text-gray-500">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p>未找到相关剧集</p>
         </div>
      )}
    </div>
  );
};