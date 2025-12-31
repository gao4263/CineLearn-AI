# CineLearn AI 项目开发文档

这份文档旨在帮助开发人员理解现有架构，以便进行功能的深度定制、性能优化或架构重构。

---

## 第一部分：功能模块详细说明 (Functional Specifications)

本应用旨在提供一个“沉浸式、语境化”的英语学习环境。核心逻辑是通过**播放器**连接**视频素材**与**AI知识库**。

### 1. 媒体资源库模块 (Library Management)
负责管理用户的视频文件、文件夹结构及元数据。

*   **1.1 多源导入**
    *   **本地文件导入**：支持拖拽或文件选择器导入 `.mp4`, `.mkv`, `.webm` 视频及 `.srt` 字幕。
    *   **格式转码 (关键逻辑)**：
        *   检测到 `.mkv` 文件时，自动调用 `FFmpeg WASM` 进行转码。
        *   转码策略：视频流 `copy` (不重编码)，音频流转码为 `aac`，封装为 `mp4`。
    *   **云端/Demo 导入**：支持通过 URL 导入远程视频资源（用于演示或网盘直链）。
    *   **自动关联**：导入视频时，若存在同名 SRT 文件，自动建立关联。
*   **1.2 智能元数据解析**
    *   **文件名解析**：自动从文件名（如 `Friends.S01E01.mkv`）中提取：
        *   剧集名称 (Show Name)
        *   季号 (Season)
        *   集号 (Episode)
    *   **目录管理**：支持创建文件夹、重命名、拖拽移动视频/文件夹，构建层级结构。
*   **1.3 数据持久化**
    *   所有视频元数据、文件夹结构存储于 `IndexedDB`。
    *   **注意**：当前版本将视频二进制文件 (Blob) 也存储在 `IndexedDB` (`videoFiles` 表) 中，以实现纯离线访问。

### 2. 沉浸式播放器模块 (Intelligent Player)
核心交互界面，集成了视频播放、字幕渲染与 AI 交互。

*   **2.1 播放控制**
    *   基础功能：播放/暂停、快进/快退 (+/- 5秒)、全屏切换。
    *   **倍速播放**：支持 0.5x 至 2.0x 变速，且支持音频音调修正 (浏览器默认行为)。
    *   **进度记忆**：自动记录每个视频的 `lastPlayedTime`，下次打开自动跳转。
*   **2.2 智能字幕系统**
    *   **字幕解析**：解析 SRT 格式，清洗 ASS/SSA 特效标签，提取纯文本。
    *   **多模式显示**：支持双语 (Dual)、仅英文 (EN)、仅中文 (CN)、关闭 (Off) 四种模式。
    *   **交互式单词**：
        *   对英文字幕进行分词处理。
        *   **点击查词**：点击任意单词，视频自动暂停，并触发 AI 字典查询。
*   **2.3 学习辅助功能**
    *   **单句循环 (Sentence Loop)**：锁定当前字幕的时间轴，反复播放该片段。
    *   **收藏 (Bookmark)**：一键收藏当前字幕片段（包含时间戳、文本）。
    *   **AI 即时分析**：针对当前显示的字幕，实时请求 AI 生成语法、词汇、文化背景解析。
    *   **语料高亮**：若当前字幕包含已生成的 AI 知识点，自动在界面上方悬浮展示知识卡片，并在字幕中高亮对应的锚点文本 (Anchor Text)。

### 3. AI 智能引擎模块 (AI Learning Engine)
负责与大模型 (LLM) 进行通信，生成结构化的学习内容。

*   **3.1 上下文查词 (Contextual Dictionary)**
    *   输入：单词 + 当前句子上下文。
    *   输出：JSON 格式，包含释义 (Definition)、音标 (IPA)、中文翻译。
    *   **特点**：释义是基于当前剧集语境生成的，而非死板的字典释义。
*   **3.2 批量语料生成 (Corpus Generation)**
    *   **触发**：用户在剧库界面点击“AI 分析”。
    *   **逻辑**：将字幕分批次（Batching）发送给 AI。
    *   **输出类型**：
        *   `vocabulary`: 重点词汇解析。
        *   `grammar`: 长难句语法结构分析。
        *   `culture`: 俚语、文化梗、背景知识。
    *   **锚点匹配**：AI 返回知识点对应的原文字符串 (Anchor)，播放器利用此信息进行高亮。
*   **3.3 多模型支持**
    *   架构设计支持适配器模式，目前支持配置：
        *   Google Gemini (原生 SDK)
        *   OpenAI 兼容接口 (DeepSeek, Qwen, ChatGPT)

### 4. 学习回顾中心 (Learning Center)
用于复习和管理已积累的知识。

*   **4.1 知识聚合**
    *   将“生词本”、“收藏字幕”、“AI 语料”统一展示。
    *   支持按“剧集 -> 季 -> 集”的层级结构折叠/展开查看。
*   **4.2 管理与交互**
    *   **跳转回顾**：点击任意条目，直接跳转到播放器对应的时间点。
    *   **掌握标记**：生词支持标记为“已掌握”，可筛选隐藏。
    *   **筛选排序**：支持按类型（词汇/语法/片段）筛选，按时间或字母排序。

---

## 第二部分：技术架构文档 (Technical Documentation)

### 1. 技术栈 (Tech Stack)

*   **Core Framework**: React 18 + TypeScript + Vite 5
*   **Desktop Runtime**: Electron 29 (主进程/渲染进程分离)
*   **Styling**: Tailwind CSS + Lucide React (Icons)
*   **Database**: Dexie.js (IndexedDB Wrapper) - 本地数据库
*   **Media Processing**: @ffmpeg/ffmpeg (WebAssembly) - 浏览器端转码
*   **AI Integration**: @google/genai (Gemini SDK) + Fetch API (OpenAI Compatible)

### 2. 目录结构说明

```text
root/
├── electron/
│   ├── main.ts          # Electron 主进程 (窗口管理, 安全头配置)
│   └── preload.ts       # 预加载脚本 (目前为空，预留IPC接口)
├── src/
│   ├── components/      # UI 组件
│   │   ├── Player.tsx   # 核心播放器逻辑 (最复杂组件)
│   │   ├── Library.tsx  # 剧库管理与拖拽逻辑
│   │   ├── Sidebar.tsx  # 导航栏
│   │   └── ...
│   ├── services/        # 业务逻辑服务层
│   │   ├── converter.ts # FFmpeg 转码服务 (多线程, Ultrafast preset)
│   │   ├── geminiService.ts # AI 接口封装 (Prompt Engineering)
│   │   ├── srtParser.ts # 字幕解析器
│   │   └── metadataParser.ts # 文件名正则解析
│   ├── types.ts         # TypeScript 类型定义 (数据库Schema, 状态定义)
│   ├── App.tsx          # 路由管理, 全局状态, 数据库初始化
│   └── main.tsx         # React 入口
├── package.json         # 依赖管理 & 构建脚本
└── vite.config.ts       # Vite 配置 (集成 Electron 插件)
```

### 3. 数据库设计 (Database Schema)

使用 `Dexie.js` 管理 IndexedDB。数据库名为 `CineLearnDB`。

| 表名 (Table) | 主键 (PK) | 索引 (Indexes) | 说明 |
| :--- | :--- | :--- | :--- |
| `videos` | `id` | `name`, `parentId` | 存储视频元数据（路径、时长、关联字幕URL）。 |
| `folders` | `id` | `name`, `parentId` | 存储文件夹结构。 |
| `videoFiles` | `id` | *(无)* | **关键**：存储二进制 `Blob` 数据（视频文件/转码后文件）。 |
| `savedWords` | `id` | `word`, `videoId`, `mastered` | 用户查词记录及掌握状态。 |
| `savedSubtitles` | `id` | `videoId` | 用户收藏的字幕片段。 |
| `corpusItems` | `id` | `subtitleId`, `videoId`, `type` | AI 生成的知识点（语料）。 |

> **注意**：目前的 IndexedDB 方案是为了纯前端演示和简单离线使用。在生产环境 Electron 应用中，随着视频增多，IndexedDB 会面临容量限制。

### 4. 关键流程技术实现

#### 4.1 FFmpeg WASM 转码流程 (`services/converter.ts`)
1.  **环境检测**：检查 `SharedArrayBuffer` 支持（依赖 Electron 主进程配置 COOP/COEP 头）。
2.  **加载核心**：从 CDN (或本地) 加载 `ffmpeg-core.js` 和 `.wasm`。
3.  **文件写入**：将用户选中的 File 对象写入 FFmpeg 虚拟内存文件系统 (MEMFS)。
4.  **执行指令**：
    ```bash
    -i input.mkv -c:v copy -c:a aac -ac 2 -b:a 128k -preset ultrafast -threads 0 output.mp4
    ```
    *   `-c:v copy`: 视频流直接拷贝，速度极快。
    *   `-preset ultrafast`: 音频编码追求速度。
5.  **读取输出**：读取 `output.mp4` 二进制数据，生成 `Blob` 并存入 IndexedDB。

#### 4.2 AI 分析流程 (`services/geminiService.ts`)
1.  **配置获取**：从 `localStorage` 读取 API Key 和 BaseUrl。
2.  **Prompt 构建**：构建 System Prompt，强制要求 AI 返回纯净的 `JSON Array` 格式。
3.  **请求发送**：
    *   若是 Gemini：使用 SDK `generateContent`，配置 `responseSchema` 强制结构化输出。
    *   若是 OpenAI 兼容：使用 `fetch` 调用 `/chat/completions`，开启 `json_object` 模式。
4.  **清洗与存储**：去除 Markdown 代码块标记，`JSON.parse` 后存入 `corpusItems` 表。

#### 4.3 播放器字幕同步逻辑 (`components/Player.tsx`)
1.  **解析**：视频加载时，fetch 字幕文件 -> `parseSRT` -> 生成字幕对象数组。
2.  **同步循环**：
    *   监听 `<video>` 的 `onTimeUpdate` 事件。
    *   遍历（或二分查找）字幕数组，找到 `currentTime` 落在 `startTime` 和 `endTime` 之间的字幕。
    *   更新 `currentSubtitle` 状态。
3.  **高亮渲染**：
    *   获取当前字幕 ID。
    *   在 `corpusItems` 中查找 `subtitleId` 匹配的知识点。
    *   若存在，提取 `anchor` 文本，在字幕渲染层中使用 CSS 高亮该文本片段。

---

## 第三部分：深度定制指南 (Customization Guide)

### 1. 性能优化方向
*   **移除 IndexedDB 视频存储 (强烈推荐)**：
    *   *现状*：视频转为 Blob 存入 DB，读取慢、内存占用高，且受浏览器存储配额限制。
    *   *修改*：利用 Electron 的 Node.js 能力，直接存储文件到本地文件系统（如 AppData 或用户选定的库目录）。在 `electron/main.ts` 中注册自定义协议（如 `media://`）来流式读取这些文件，前端仅存储文件路径。
*   **本地化 FFmpeg Core**：
    *   *现状*：从 `unpkg.com` 加载 WASM 文件。
    *   *修改*：下载 `@ffmpeg/core` 的文件到 `public/` 目录，修改 `converter.ts` 中的加载路径，实现完全离线转码，加快初始化速度。

### 2. 功能扩展方向
*   **添加新的 AI 模型**：
    *   修改 `types.ts` 中的 `AIProvider` 类型。
    *   修改 `components/SettingsView.tsx` 添加新选项。
    *   在 `services/geminiService.ts` 中扩展 `callOpenAICompatible` 或添加新的 SDK 调用逻辑。
*   **实现云同步 (Cloud Sync)**：
    *   在 `AppDatabase` 类中引入 `dexie-cloud-addon` 或自行实现同步逻辑。
    *   将 `SavedWord` 和 `CorpusItem` 表同步到远端服务器（如 Supabase/Firebase），实现多端进度同步。
*   **增强字幕支持**：
    *   目前仅支持 SRT。若需支持 ASS (特效字幕)，建议引入 `libjass` 或 `ass-compiler`。
    *   在 `Player.tsx` 中替换现有的 DOM 渲染逻辑，改用 Canvas 渲染 ASS 字幕以保留特效。

### 3. UI/UX 定制
*   **主题系统**：
    *   目前通过 `theme` 状态 ('light' | 'dark') 控制。
    *   所有颜色定义在 `Tailwind` 类名中（如 `bg-[#0b0e14]`）。
    *   建议在 `tailwind.config.js` 中定义语义化颜色（如 `bg-primary`, `text-secondary`），替换硬编码的颜色值，以便更方便地管理主题或添加新主题。

### 4. 生产环境构建 (Build for Production)
*   **代码签名**：
    *   修改 `electron-builder` 配置（在 `package.json` 中添加 `build` 字段）。
    *   配置证书以避免 Windows/macOS 的安全警告。
*   **ASAR 打包**：
    *   确保 `ffmpeg-core.wasm` 等静态资源在打包后能被正确路径引用（需配置 `extraResources`）。
