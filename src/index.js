/**
 * PDF2MD 主入口模块
 * 提供PDF转Markdown的完整功能
 */
import fs from 'fs-extra';
import path from 'path';
import { parsePdfRects } from './pdfParser.js';
import { generateImagesFromPdf, generateFullPageImages } from './imageGenerator.js';
import { convertImagesToMarkdown } from './markdownConverter.js';
import { ensureDir, removeFile } from './utils.js';
import ModelClient from './modelClient.js';

/**
 * 将PDF文件解析为Markdown
 * @param {string} pdfPath PDF文件路径
 * @param {Object} options 配置选项
 * @returns {Object} 处理结果 { content, imageFiles }
 */
/**
 * 将PDF文件解析为Markdown，使用全页图像识别
 * @param {string} pdfPath PDF文件路径
 * @param {Object} options 配置选项
 * @returns {Object} 处理结果 { content, imageFiles, mdFilePath }
 */
export const parsePdfFullPage = async (pdfPath, options = {}) => {
  const {
    outputDir = './output',
    apiKey,
    baseUrl,
    model = 'gpt-4-vision-preview',
    prompt,
    verbose = false,
    scale = 3,
    concurrency = 2
  } = options;

  // 确保输出目录存在
  await ensureDir(outputDir);

  console.log('开始解析PDF文件(全页模式):', pdfPath);

  try {
    // 第一步：生成全页图像
    console.log('生成全页图像...');
    const imageOutputDir = path.join(outputDir, 'pages');
    await ensureDir(imageOutputDir);

    const imageFiles = await generateFullPageImages(pdfPath, imageOutputDir, scale);

    // 第二步：使用视觉模型处理每个页面图像
    console.log('处理全页图像...');

    // 创建模型客户端
    const modelClient = new ModelClient({
      apiKey,
      baseUrl,
      model
    });

    const pageContents = [];
    const processImages = async item => {
      console.log(`处理页面 ${item.index}/${imageFiles.length}: ${path.basename(item.path)}`);
      try {
        // 处理图像 - 确保传入有效的prompt
        const defaultPrompt = '请将图像中的所有文本内容转换为Markdown格式，包括标题、段落、列表和表格等。';
        const pageContent = await modelClient.processImage(item.path, prompt || defaultPrompt);
        // 添加页面内容
        pageContents.push({
          pageIndex: item.index,
          content: pageContent
        });
        return { success: true, item, data: pageContent };
      } catch (error) {
        console.error('Markdown 转换失败:', error);
        return { success: false, item, error: error.message };
      }
    }

    // 并行处理所有问题，最多同时处理5个
    await processInParallel(imageFiles, processImages, concurrency);

    //并行处理生成结果是乱序的，根据pageIndex进行排序再输出Markdown
    pageContents.sort((a, b) => a.pageIndex - b.pageIndex);

    // 第三步：生成Markdown文件
    console.log('生成Markdown文档...');

    // 生成Markdown内容
    let content = '';
    for (const page of pageContents) {
      content += `<!-- 页面 ${page.pageIndex} 开始 -->

${page.content}

<!-- 页面 ${page.pageIndex} 结束 -->

`;
    }

    // 第四步：保存Markdown文件
    const mdFilePath = path.join(outputDir, path.basename(pdfPath, '.pdf') + '.md');
    await fs.writeFile(mdFilePath, content);
    console.log('Markdown文件已保存至:', mdFilePath);

    // 第五步：清理临时图像文件（如果不需要保留）
    if (!verbose) {
      console.log('清理临时文件...');
      for (const imagePath of imageFiles) {
        await removeFile(imagePath);
      }
    }

    return {
      content,
      mdFilePath,
      imageFiles
    };
  } catch (error) {
    console.error('PDF解析过程中发生错误:', error);
    throw error;
  }
};

/**
 * 将PDF文件解析为Markdown（使用区域识别）
 * @param {string} pdfPath PDF文件路径
 * @param {Object} options 配置选项
 * @returns {Object} 处理结果 { content, imageFiles }
 */
/**
 * 将PDF文件解析为Markdown
 * @param {string} pdfPath PDF文件路径
 * @param {Object} options 配置选项
 * @returns {Object} 处理结果 { content, imageFiles, mdFilePath }
 */
export const parsePdf = async (pdfPath, options = {}) => {
  // 直接使用全页图像处理，不再使用子图
  return parsePdfFullPage(pdfPath, options);
};

// 并行处理数组的辅助函数，限制并发数
const processInParallel = async (items, processFunction, concurrencyLimit) => {
  const results = [];
  const inProgress = new Set();
  const queue = [...items];

  while (queue.length > 0 || inProgress.size > 0) {
    // 如果有空闲槽位且队列中还有任务，启动新任务
    while (inProgress.size < concurrencyLimit && queue.length > 0) {
      const item = queue.shift();
      const promise = processFunction(item).then(result => {
        inProgress.delete(promise);
        return result;
      });
      inProgress.add(promise);
      results.push(promise);
    }

    // 等待其中一个任务完成
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }

  return Promise.all(results);
};


/**
 * PDF2MD模块导出
 */
export default {
  parsePdf,
  parsePdfFullPage
};
