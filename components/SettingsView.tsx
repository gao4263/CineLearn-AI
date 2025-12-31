import React, { useState, useEffect } from 'react';
import { Save, Key, Cpu, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { Theme, AIConfig, AIProvider } from '../types';

type SettingsViewProps = {
  theme: Theme;
};

const PROVIDERS: { id: AIProvider; name: string; defaultBaseUrl: string; defaultModel: string }[] = [
  { id: 'gemini', name: 'Google Gemini', defaultBaseUrl: '', defaultModel: 'gemini-3-flash-preview' },
  { id: 'deepseek', name: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'qwen', name: '通义千问 (Qwen)', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'openai', name: 'OpenAI / ChatGPT', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ theme }) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: ''
  });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('ai_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const handleChange = (field: keyof AIConfig, value: string) => {
    setConfig(prev => {
        const updates: Partial<AIConfig> = { [field]: value };
        // Auto-fill defaults if provider changes
        if (field === 'provider') {
            const providerInfo = PROVIDERS.find(p => p.id === value);
            if (providerInfo) {
                updates.baseUrl = providerInfo.defaultBaseUrl;
                updates.model = providerInfo.defaultModel;
            }
        }
        return { ...prev, ...updates };
    });
    setStatus('idle');
  };

  const handleSave = () => {
    localStorage.setItem('ai_config', JSON.stringify(config));
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const bgMain = theme === 'dark' ? 'bg-[#0b0e14]' : 'bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-[#161b26] border-gray-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-[#0b0e14] border-gray-700 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500';

  return (
    <div className={`flex-1 ${bgMain} p-8 overflow-y-auto`}>
      <h1 className={`text-2xl font-bold ${textMain} mb-2 flex items-center gap-2`}>
        <Cpu className="text-blue-500" />
        AI 服务设置
      </h1>
      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-8`}>
        配置用于生成语料、查词和分析的 AI 模型服务商。
      </p>

      <div className={`${cardBg} max-w-2xl rounded-2xl border p-8 space-y-6 shadow-sm`}>
        
        {/* Provider Selection */}
        <div>
           <label className={`block text-sm font-bold mb-2 ${textMain} flex items-center gap-2`}>
              <Server size={16} /> 选择服务商
           </label>
           <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map(p => (
                 <button
                    key={p.id}
                    onClick={() => handleChange('provider', p.id)}
                    className={`px-4 py-3 rounded-xl border text-left font-medium transition-all ${
                       config.provider === p.id 
                         ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                         : `${theme === 'dark' ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`
                    }`}
                 >
                    {p.name}
                 </button>
              ))}
           </div>
        </div>

        {/* API Key */}
        <div>
           <label className={`block text-sm font-bold mb-2 ${textMain} flex items-center gap-2`}>
              <Key size={16} /> API Key (密钥)
           </label>
           <input 
              type="password"
              value={config.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder={`输入 ${PROVIDERS.find(p => p.id === config.provider)?.name} API Key`}
              className={`w-full ${inputBg} rounded-xl px-4 py-3 border outline-none transition-colors ${textMain}`}
           />
           <p className="text-xs text-gray-500 mt-2">
              您的密钥仅存储在本地浏览器中，不会上传到任何服务器。
           </p>
        </div>

        {/* Advanced Options (Base URL & Model) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800/50">
           <div>
              <label className={`block text-xs font-bold mb-2 text-gray-500 uppercase`}>Base URL (可选)</label>
              <input 
                 type="text"
                 value={config.baseUrl}
                 onChange={(e) => handleChange('baseUrl', e.target.value)}
                 placeholder="API 代理地址"
                 className={`w-full ${inputBg} rounded-xl px-3 py-2 border outline-none text-sm font-mono ${textMain}`}
                 disabled={config.provider === 'gemini'} // Gemini SDK handles this differently usually
              />
           </div>
           <div>
              <label className={`block text-xs font-bold mb-2 text-gray-500 uppercase`}>Model (模型名称)</label>
              <input 
                 type="text"
                 value={config.model}
                 onChange={(e) => handleChange('model', e.target.value)}
                 className={`w-full ${inputBg} rounded-xl px-3 py-2 border outline-none text-sm font-mono ${textMain}`}
              />
           </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 flex items-center gap-4">
           <button 
             onClick={handleSave}
             className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
           >
              <Save size={18} />
              保存设置
           </button>
           
           {status === 'saved' && (
              <span className="text-green-500 flex items-center gap-1 font-medium animate-in fade-in">
                 <CheckCircle size={16} /> 已保存
              </span>
           )}
           
           {!config.apiKey && (
              <span className="text-amber-500 flex items-center gap-1 text-sm">
                 <AlertCircle size={14} /> 请输入 API Key
              </span>
           )}
        </div>

      </div>
    </div>
  );
};
