/**
 * Markdown转换模块，使用模型客户端将图像转换为Markdown
 */
import path from 'path';
import ModelClient from './modelClient.js';

// 默认提示词（中文版）
const DEFAULT_PROMPT = `使用markdown语法，将图片中识别到的文字转换为markdown格式输出。你必须做到：
1. 输出和使用识别到的图片的相同的语言，例如，识别到英语的字段，输出的内容必须是英语。
2. 不要解释和输出无关的文字，直接输出图片中的内容。例如，严禁输出 "以下是我根据图片内容生成的markdown文本："这样的例子，而是应该直接输出markdown。
3. 内容不要包含在\`\`\`markdown \`\`\`中、段落公式使用 $$ $$ 的形式、行内公式使用 $ $ 的形式、忽略掉长直线、忽略掉页码。
再次强调，不要解释和输出无关的文字，直接输出图片中的内容。`;

// 默认区域提示词（中文版）
const DEFAULT_RECT_PROMPT = `图片中用红色框和名称(%s)标注出了一些区域。如果区域是表格或者图片，使用 ![]() 的形式插入到输出内容中，否则直接输出文字内容。`;

// 此处移除DEFAULT_ROLE_PROMPT，它已经被迁移到modelClient.js

/**
 * 处理单个图像并转换为Markdown
 * @param {ModelClient} modelClient 模型客户端实例
 * @param {string} imagePath 图像文件路径
 * @param {string} prompt 提示词
 * @param {Object} options 模型选项
 * @returns {string} Markdown内容
 */
export const processImageToMarkdown = async (modelClient, imagePath, prompt, options = {}) => {
  return modelClient.processImage(imagePath, prompt, options);
};

/**
 * 处理一组图像并合并成完整的Markdown
 * @param {Array} imageInfos 图像信息数组 [{ pageImage, rectImages }, ...]
 * @param {string} outputDir 输出目录
 * @param {Object} options 配置选项
 * @returns {string} 合并后的Markdown内容
 */
export const convertImagesToMarkdown = async (imageInfos, outputDir, options) => {
  const {
    apiKey,
    baseUrl,
    model = 'gpt-4-vision-preview',
    prompt: customPrompt,
    rectPrompt: customRectPrompt,
    verbose = false,
    concurrency = 1,
    modelConfig = {},
  } = options;

  // 创建模型客户端
  const modelClient = new ModelClient({
    apiKey,
    baseUrl,
    model,
    modelConfig,
  });

  // 使用自定义提示词或默认提示词
  const prompt = customPrompt || DEFAULT_PROMPT;
  const rectPrompt = customRectPrompt || DEFAULT_RECT_PROMPT;

  // 存储每个图像的Markdown内容
  const markdownParts = [];

  // 处理每个页面的图像
  for (let pageIndex = 0; pageIndex < imageInfos.length; pageIndex++) {
    const { pageImage, rectImages } = imageInfos[pageIndex];
    console.log(`处理页面 ${pageIndex + 1} 的 ${rectImages.length} 个区域图像`);

    // 处理页面上的每个区域图像
    const tasks = rectImages.map(async (rectImage, rectIndex) => {
      const imagePath = path.join(outputDir, rectImage);
      const imageName = `${pageIndex}_${rectIndex}`;

      // 构建提示词
      const fullPrompt = prompt + '\n' + rectPrompt.replace('%s', imageName);

      try {
        // 处理图像
        const markdown = await processImageToMarkdown(modelClient, imagePath, fullPrompt, { model });
        return { rectIndex, markdown };
      } catch (error) {
        console.error(`处理图像 ${imageName} 失败:`, error);
        return { rectIndex, markdown: `<!-- 处理图像 ${imageName} 失败 -->` };
      }
    });

    // 并行处理图像（根据并发度）
    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    // 按原始顺序整理结果
    const sortedResults = results.sort((a, b) => a.rectIndex - b.rectIndex);
    const pageMarkdownParts = sortedResults.map((result) => result.markdown);

    // 添加页面标记
    // markdownParts.push(`<!-- 页面 ${pageIndex + 1} 开始 -->\n\n`);
    markdownParts.push(...pageMarkdownParts);
    // markdownParts.push(`\n\n<!-- 页面 ${pageIndex + 1} 结束 -->\n\n`);
  }

  // 合并所有Markdown内容
  return markdownParts.join('\n\n');
};

export { DEFAULT_PROMPT, DEFAULT_RECT_PROMPT };
