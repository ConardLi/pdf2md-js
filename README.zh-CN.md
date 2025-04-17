# PDF2MD Node.js

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen" alt="Node.js 版本">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="许可证">
</p>

一个强大的Node.js工具，使用先进的视觉模型将PDF文档转换为Markdown格式。PDF2MD从PDF中提取文本、表格和图像，并生成结构良好的Markdown文档。

## ✨ 功能特点

- **全页处理**：将整个PDF页面转换为高质量图像进行处理
- **视觉模型集成**：利用最先进的视觉模型进行精确的文本提取
- **多模型支持**：兼容OpenAI、Claude、Gemini和豆包视觉模型
- **结构化输出**：生成干净、格式良好的Markdown文档
- **可定制**：配置图像质量、处理选项和输出格式

## 🚀 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/pdf2md.git
cd pdf2md/pdf2md-node

# 安装依赖
npm install
```

## 📋 系统要求

- Node.js 20.0.0 或更高版本
- 至少一个支持的视觉模型的API密钥

## 🔧 使用方法

### 基本用法

```javascript
import { parsePdf } from './src/index.js';

const result = await parsePdf('path/to/your.pdf', {
  apiKey: 'your-api-key',
  model: 'gpt-4-vision-preview',
  useFullPage: true // 使用全页处理模式
});

console.log(`Markdown文件已生成：${result.mdFilePath}`);
```

### 配置选项

```javascript
const options = {
  // 生成文件的输出目录
  outputDir: './output',
  
  // 视觉模型的API密钥
  apiKey: 'your-api-key',
  
  // API端点（如果使用自定义端点）
  baseUrl: 'https://api.example.com/v1',
  
  // 要使用的视觉模型
  model: 'gpt-4-vision-preview',
  
  // 视觉模型的自定义提示
  prompt: '将此PDF转换为结构良好的Markdown',
  
  // 是否使用全页处理（推荐）
  useFullPage: true,
  
  // 是否保留中间图像文件
  verbose: false,
  
  // 图像缩放因子（更高 = 更好的质量但更慢）
  scale: 3,

  // 是否使用openai兼容接口
  openAiApicompatible: true,

  // 并发处理数量（可同时处理的页面数）
  concurrency: 2,

  //处理进度结果回调方法（方便调用者跟踪页面处理进度，只有taskStatus状态为finished时整个转换任务才算完成）
  onProgress: ({ current, total, taskStatus }) => {
   console.log(`已处理：${current},总页数：${total},任务处理状态：${taskStatus}`);
  }

};

const result = await parsePdf('path/to/your.pdf', options);
```

## 🔍 支持的模型

| 提供商 | 模型 |
|----------|--------|
| OpenAI   | `gpt-4-vision-preview`, `gpt-4o` |
| Claude   | `claude-3-opus-20240229`, `claude-3-sonnet-20240229` |
| Gemini   | `gemini-pro-vision` |
| 豆包     | `doubao-1.5-vision-pro-32k-250115` |

## 🧪 测试

项目包含多个测试脚本以验证功能：

```bash
# 测试完整的PDF到Markdown转换流程
pnpm vite-node test/testFullProcess.js

# 仅测试PDF到图像的转换
pnpm vite-node test/testFullPageImages.js

# 测试特定视觉模型
pnpm vite-node test/testModel.js
```

## 📁 项目结构

```
pdf2md-js/
├── src/
│   ├── index.js          # 主入口点
│   ├── pdfParser.js      # PDF解析模块
│   ├── imageGenerator.js # 图像生成模块
│   ├── modelClient.js    # 视觉模型客户端
│   ├── markdownConverter.js # Markdown转换模块
│   └── utils.js          # 工具函数
├── test/
│   ├── samples/          # 用于测试的示例PDF文件
│   ├── testFullProcess.js # 完整流程测试
│   └── ... (其他测试文件)
└── package.json
```

## 🔄 模块架构

PDF2MD由以下核心模块组成，每个模块负责特定功能：

### 1. 主入口模块 (index.js)

协调整个系统：
- 接收用户输入（PDF路径和配置选项）
- 按顺序调用其他模块完成转换过程
- 返回最终的Markdown结果

### 2. PDF解析模块 (pdfParser.js)

解析PDF文件并提取结构化信息：
- 使用PDF.js库加载PDF文件
- 提取每页的文本内容、图像和图形元素
- 生成矩形区域列表，每个矩形代表PDF中的内容块

### 3. 图像生成模块 (imageGenerator.js)

将PDF区域渲染为图像：
- 使用PDF.js渲染引擎将指定区域渲染为高清图像
- 支持可调节的缩放比例，确保图像清晰度
- 使用Sharp库处理和优化图像

### 4. 模型客户端模块 (modelClient.js)

与各种视觉模型API交互：
- 支持多种视觉模型：OpenAI、Claude、Gemini、豆包等
- 提供统一的API调用接口，封装不同模型的特性
- 处理API调用错误和重试机制

### 5. Markdown转换模块 (markdownConverter.js)

将模型结果转换为标准Markdown格式：
- 处理模型返回的文本内容
- 按照Markdown语法标准格式化
- 合并多个区域的Markdown内容

## 📄 许可证

本项目采用MIT许可证 - 详情请参阅LICENSE文件。

## 数据流程与模块协作

PDF到Markdown的转换过程按照以下流程进行：

1. **输入处理**：主入口模块接收PDF文件路径和配置选项

2. **PDF解析**：
   - `pdfParser.js` 加载PDF文件
   - 提取每一页的内容元素
   - 生成初始矩形区域列表

3. **矩形处理**：
   - `rectProcessor.js` 接收初始矩形列表
   - 调用 `mergeRects` 函数合并相近的矩形
   - 调用 `adsorbRects` 函数吸附小矩形
   - 调用 `filterSmallRects` 函数过滤小矩形
   - 返回优化后的矩形列表

4. **图像生成**：
   - `imageGenerator.js` 接收优化后的矩形列表
   - 对每个矩形区域调用 `renderRectToImage` 函数
   - 生成高清图像并保存
   - 返回图像路径列表

5. **模型识别**：
   - `modelClient.js` 接收图像路径列表
   - 根据配置选择适当的视觉模型
   - 调用模型 API对图像进行内容识别
   - 返回模型分析结果

6. **Markdown转换**：
   - `markdownConverter.js` 接收模型分析结果
   - 将结果转换为标准Markdown格式
   - 按照区域在PDF中的位置合并内容
   - 生成最终的Markdown文档

7. **输出结果**：主入口模块返回最终的Markdown内容

## 实现原理

1. **PDF解析与区域识别**：使用PDF.js解析PDF文件，识别出文档中的文本区域、图片区域和绘图元素

2. **区域分割与合并**：将相近的区域合并，识别出PDF中的逻辑块

3. **区域转图像**：将每个识别出的区域转换为高清图像

4. **图像OCR与解析**：使用视觉模型API对生成的图像进行内容识别和转换为Markdown

5. **结果合并**：将所有区域的Markdown内容合并成完整的文档
