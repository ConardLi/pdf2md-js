/**
 * PDF2MD 主入口模块
 * 提供PDF转Markdown的完整功能
 */
import fs from 'fs-extra';
import path from 'path';
import { generateFullPageImages } from './image-generator';
import { removeFile, extractMdFromLLMOutput, adjustMarkdownHeadings, getOldMarkdownHeadings } from './utils';
import ModelClient, { ModelConfig } from './model-client';
import { DefaultPrompt, DefaultTextPrompt } from './const';

interface ParseOptions {
  outputDir?: string;
  prompt?: string;
  textPrompt?: string;
  verbose?: boolean;
  scale?: number;
  concurrency?: number;
  onProgress?: (progress: ProgressInfo) => void;
}

interface ProgressInfo {
  current: number;
  total: number;
  taskStatus: 'starting' | 'running' | 'finished';
}

interface ImageFile {
  path: string;
  index: number;
}

interface PageContent {
  pageIndex: number;
  content: string;
}

interface ParseResult {
  content: string;
  mdFilePath: string;
  imageFiles: ImageFile[];
}

/**
 * 将PDF文件解析为Markdown
 */
export const parsePdf = async (pdfPath: string, modelConfig: ModelConfig = {}, options: ParseOptions = {}): Promise<ParseResult> => {
  const { outputDir = './output', prompt = DefaultPrompt, textPrompt = DefaultTextPrompt, verbose = false, scale = 3, concurrency = 2, onProgress } = options;

  // 确保输出目录存在
  await fs.ensureDir(outputDir);

  console.log('开始解析PDF文件(全页模式):', pdfPath);

  try {
    // 第一步：生成全页图像
    console.log('生成全页图像...');
    const imageOutputDir = path.join(outputDir, 'pages');
    await fs.ensureDir(imageOutputDir);

    const imageFiles = await generateFullPageImages(pdfPath, imageOutputDir, scale);

    //先把总页数传递回调用方法
    if (onProgress) {
      onProgress({
        current: 0,
        total: imageFiles.length,
        taskStatus: 'starting',
      });
    }

    // 第二步：使用视觉模型处理每个页面图像
    console.log('处理全页图像...');

    // 创建模型客户端
    const modelClient = new ModelClient(modelConfig);

    const pageContents: PageContent[] = [];
    const processImages = async (item: ImageFile) => {
      console.log(`处理页面 ${item.index}/${imageFiles.length}: ${path.basename(item.path)}`);
      try {
        // 处理图像 - 确保传入有效的prompt
        const defaultPrompt = '请将图像中的所有文本内容转换为Markdown格式，包括标题、段落、列表和表格等。';
        const pageContent = await modelClient.processImage(item.path, prompt || defaultPrompt);
        // 添加页面内容
        pageContents.push({
          pageIndex: item.index,
          content: pageContent,
        });
        // 处理完成后，更新调用者的信息
        if (onProgress) {
          onProgress({
            current: pageContents.length,
            total: imageFiles.length,
            taskStatus: 'running',
          });
        }
        return { success: true, item, data: pageContent };
      } catch (error) {
        console.error('Markdown 转换失败:', error);
        return { success: false, item, error: (error as Error).message };
      }
    };

    // 并行处理所有问题，最多同时处理concurrency个
    await processInParallel(imageFiles, processImages, concurrency);

    //并行处理生成结果是乱序的，根据pageIndex进行排序再输出Markdown
    pageContents.sort((a, b) => a.pageIndex - b.pageIndex);

    // 第三步：生成Markdown文件
    console.log('生成Markdown文档...');

    // 生成Markdown内容
    let content = '';
    for (const page of pageContents) {
      content += page.content + '\n';
    }

    console.log('正在重新调整目录...');

    // 提取转换后的标题
    const title = await getOldMarkdownHeadings(content);

    //使用大模型重新调整目录结构
    const defaultPrompt = '请将图像中的所有文本内容转换为Markdown格式，包括标题、段落、列表和表格等。';
    const convertedTitleLLMResult = await modelClient.processImage(null, textPrompt + JSON.stringify(title) || defaultPrompt);
    const convertedTitle = await extractMdFromLLMOutput(convertedTitleLLMResult);

    //根据调整后的结果重新生成md文件
    const convertContent = await adjustMarkdownHeadings(content, convertedTitle || '');

    console.log('目录调整完成...');

    // 第四步：保存Markdown文件
    const mdFilePath = path.join(outputDir, path.basename(pdfPath, '.pdf') + '.md');
    await fs.writeFile(mdFilePath, convertContent);
    console.log('Markdown文件已保存至:', mdFilePath);

    // 第五步：清理临时图像文件（如果不需要保留）
    if (!verbose) {
      console.log('清理临时文件...');
      for (const imagePath of imageFiles) {
        await removeFile(imagePath.path);
      }
    }

    // 将任务执行结束传递回调用方法
    if (onProgress) {
      onProgress({
        current: imageFiles.length,
        total: imageFiles.length,
        taskStatus: 'finished',
      });
    }

    return {
      content,
      mdFilePath,
      imageFiles,
    };
  } catch (error) {
    console.error('PDF解析过程中发生错误:', error);
    throw error;
  }
};

// 定义并行处理的辅助函数类型
type ProcessFunction<T, R> = (item: T) => Promise<R>;

// 并行处理数组的辅助函数，限制并发数
const processInParallel = async <T, R>(items: T[], processFunction: ProcessFunction<T, R>, concurrencyLimit: number): Promise<R[]> => {
  const results: Promise<R>[] = [];
  const inProgress = new Set<Promise<R>>();
  const queue = [...items];

  while (queue.length > 0 || inProgress.size > 0) {
    // 如果有空闲槽位且队列中还有任务，启动新任务
    while (inProgress.size < concurrencyLimit && queue.length > 0) {
      const item = queue.shift()!;
      const promise = processFunction(item).then((result) => {
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
