# PDF2MD Node.js

这是一个使用Node.js实现的PDF转Markdown工具。

## 功能

- 将PDF文档转换为Markdown格式
- 支持文本、图像和表格的识别
- 智能识别PDF文档的布局结构
- 使用OpenAI API实现高质量的OCR和格式转换

## 安装

```bash
npm install
```

## 使用方法

```javascript
import { parsePdf } from './src/index.js';

// 基本用法
const result = await parsePdf('input.pdf', {
  outputDir: './output',
  apiKey: 'your-openai-api-key',
  model: 'gpt-4-vision-preview',  // 或其他支持图像识别的模型
  verbose: false
});

console.log('生成的Markdown内容:', result.content);
```

## 参数说明

- `pdfPath`: PDF文件路径
- `options`: 配置选项
  - `outputDir`: 输出目录
  - `apiKey`: OpenAI API密钥
  - `model`: 使用的OpenAI模型
  - `verbose`: 是否保留中间生成的图像文件
  - `prompt`: 自定义的提示词

## 模块结构与协作关系

PDF2MD由以下核心模块组成，每个模块负责特定的功能，共同协作完成PDF到Markdown的转换过程：

### 1. 主入口模块 (index.js)

主入口模块是整个系统的协调者，负责：
- 接收用户输入的PDF文件路径和配置选项
- 按顺序调用其他模块完成转换过程
- 返回最终的Markdown结果

### 2. PDF解析模块 (pdfParser.js)

负责解析PDF文件并提取结构化信息：
- 使用PDF.js库加载PDF文件
- 提取每一页的文本内容、图像和图形元素
- 生成初始的矩形区域列表，每个矩形代表PDF中的一个内容块
- 输出格式：`{ pageIndex, rects }`，其中`rects`是矩形坐标数组`[x0, y0, x1, y1]`

### 3. 矩形处理模块 (rectProcessor.js)

负责处理和优化从 PDF 提取的矩形区域：
- **合并功能**：将相近的矩形合并成更大的逻辑块，减少分析的复杂性
- **吸附功能**：将小的矩形吸附到附近的大矩形上，保证相关内容在一起
- **过滤功能**：过滤掉过小或无效的矩形，减少处理量

### 4. 图像生成模块 (imageGenerator.js)

负责将PDF区域渲染为图像：
- 使用PDF.js渲染引擎将指定区域渲染为高清图像
- 支持可调节的缩放比例，确保图像清晰度
- 使用Sharp库处理和优化图像
- 输出格式：图像缓冲区或文件路径

### 5. 模型客户端模块 (modelClient.js)

负责与各种视觉模型 API 进行交互：
- 支持多种视觉模型：OpenAI、Claude、Gemini、豆包等
- 提供统一的API调用接口，封装不同模型的特征
- 处理API调用错误和重试机制
- 输出格式：模型对图像的分析结果

### 6. Markdown转换模块 (markdownConverter.js)

负责将模型返回的结果转换为标准Markdown格式：
- 处理模型返回的文本内容
- 格式化为符合规范的Markdown语法
- 合并多个区域的Markdown内容
- 输出格式：最终的Markdown文本

### 7. 工具函数模块 (utils.js)

提供各种帮助函数：
- 矩形操作函数：计算距离、判断接近性、合并矩形等
- 文件操作函数：生成随机文件名、确保目录存在等
- 其他通用工具函数

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
