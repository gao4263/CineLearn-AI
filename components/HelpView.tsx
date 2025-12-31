import React from 'react';
import { BookOpen, PlayCircle, FolderPlus, Globe, Sparkles, Layout } from 'lucide-react';
import { Theme } from '../types';

type HelpViewProps = {
  theme: Theme;
};

export const HelpView: React.FC<HelpViewProps> = ({ theme }) => {
  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
  const subText = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

  const sections = [
    {
      icon: <Layout className="text-blue-500" />,
      title: "快速开始",
      content: (
        <ul className={`list-disc list-inside space-y-2 ${subText}`}>
          <li>首先前往 <strong>AI 设置</strong> 页面配置您的 API Key（支持 Gemini, DeepSeek, Qwen, ChatGPT）。</li>
          <li>进入 <strong>我的剧库</strong>，点击“本地导入”选择您的视频文件。</li>
          <li>如果已有 .srt 字幕文件，请将其重命名为与视频相同的文件名，并在导入视频时一同导入。</li>
        </ul>
      )
    },
    {
      icon: <PlayCircle className="text-green-500" />,
      title: "播放与学习",
      content: (
        <ul className={`list-disc list-inside space-y-2 ${subText}`}>
          <li>在播放器中，您可以点击任意单词进行即时查词。</li>
          <li>点击右侧的 <strong>收藏</strong> 按钮保存当前字幕片段。</li>
          <li>点击 <strong>AI 分析</strong> 按钮（闪烁图标），让 AI 自动提取当前句子的语法、词汇和文化知识点。</li>
          <li>使用空格键暂停/播放，方向键快进/快退。</li>
        </ul>
      )
    },
    {
      icon: <Globe className="text-purple-500" />,
      title: "资源获取",
      content: (
        <ul className={`list-disc list-inside space-y-2 ${subText}`}>
          <li>在 <strong>剧集社区</strong> 中，您可以发现热门美剧。</li>
          <li>点击“下载剧集”会跳转到相应的网盘链接。</li>
          <li>下载后，请通过“本地导入”功能将视频添加到应用中。</li>
        </ul>
      )
    },
    {
      icon: <Sparkles className="text-yellow-500" />,
      title: "常见问题",
      content: (
        <div className={`space-y-4 ${subText}`}>
          <div>
            <strong>Q: 视频无法播放或没有声音？</strong>
            <p className="text-sm mt-1">部分 MKV 格式视频需要转码。应用会自动尝试转码，如果失败，建议使用其他工具转为 MP4 (H.264 + AAC) 格式后再导入。</p>
          </div>
          <div>
            <strong>Q: AI 分析显示失败？</strong>
            <p className="text-sm mt-1">请检查“AI 设置”中的 API Key 是否正确，以及网络连接是否正常。部分服务商可能需要网络代理。</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto`}>
      <h1 className={`text-2xl font-bold ${textMain} mb-2 flex items-center gap-2`}>
        <BookOpen className="text-blue-500" />
        使用帮助
      </h1>
      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-8`}>
        欢迎使用 CineLearn AI，这里是您的功能使用指南。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {sections.map((section, idx) => (
          <div key={idx} className={`${cardBg} rounded-2xl border p-6 hover:border-blue-500/30 transition-colors`}>
             <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                   {section.icon}
                </div>
                <h3 className={`text-lg font-bold ${textMain}`}>{section.title}</h3>
             </div>
             <div className="text-sm leading-relaxed">
                {section.content}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};