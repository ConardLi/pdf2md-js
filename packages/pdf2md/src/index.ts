/**
 * PDF2MD 主入口模块
 * 提供PDF转Markdown的完整功能
 */
import fs from 'fs-extra';
import path from 'path';
import { generateFullPageImages } from './imageGenerator';
import { removeFile, extractMdFromLLMOutput, adjustMarkdownHeadings, getOldMarkdownHeadings } from './utils';
import ModelClient from './modelClient';

interface ParseOptions {
  outputDir?: string;
  apiKey: string;
  baseUrl?: string;
  openAiApicompatible?: boolean;
  model?: string;
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
/**
 * 将PDF文件解析为Markdown，使用全页图像识别
 */
export const parsePdf = async (
  pdfPath: string,
  options: ParseOptions = {
    apiKey: '',
  },
): Promise<ParseResult> => {
  const {
    outputDir = './output',
    apiKey,
    baseUrl,
    openAiApicompatible = false,
    model = 'gpt-4-vision-preview',
    prompt = `使用markdown语法，将图片中识别到的文字转换为markdown格式输出。你必须做到：
          1. 输出和使用识别到的图片的相同的语言，例如，识别到英语的字段，输出的内容必须是英语。
          2. 不要解释和输出无关的文字，直接输出图片中的内容。
          3. 内容不要包含在\`\`\`markdown \`\`\`中、段落公式使用 $$ $$ 的形式、行内公式使用 $ $ 的形式。
          4. 忽略掉页眉页脚里的内容
          5. 请不要对图片的标题进行markdown的格式化，直接以文本形式输出到内容中。
          6. 有可能每页都会出现期刊名称，论文名称，会议名称或者书籍名称，请忽略他们不要识别成标题
          7. 请精确分析当前PDF页面的文本结构和视觉布局，按以下要求处理：
            1. 识别所有标题文本，并判断其层级（根据字体大小、加粗、位置等视觉特征）
            2. 输出为带层级的Markdown格式，严格使用以下规则：
              - 一级标题：字体最大/顶部居中，前面加 # 
              - 二级标题：字体较大/左对齐加粗，有可能是数字开头也有可能是罗马数组开头，前面加 ## 
              - 三级标题：字体稍大/左对齐加粗，前面加 ### 
              - 正文文本：直接转换为普通段落
            3. 不确定层级的标题请标记[?]
            4. 如果是中文文献，但是有英文标题和摘要可以省略不输出
            示例输出：
            ## 4研究方法
            ### 4.1数据收集
            本文采用问卷调查...`,
    textPrompt = `你是一个专业的文本结构化处理助手，擅长根据前缀规则和标题语义分析并优化Markdown文档的标题层级结构。请根据以下要求处理我提供的Markdown标题：
                ## 任务描述
                请根据markdown文章标题的实际含义，以及标题的前缀特征调整各级标题的正确层级关系，具体要求如下：
                1. 一般相同格式的前缀的标题是同级关系({title}代表实际的标题内容)：
                    例如：
                    纯数字前缀开头\`1 {title}\`， \` 2 {title}\` ，\` 3 {title}\`，\` 4 {title}\`，\` 5 {title}\`  ... 等
                    罗马数字前缀开头的\`I {title}\`，\`II {title}\` ，\`III {title}\`，\`IV {title}\`，\`V {title}\` ... 等
                    小数点分隔数组前缀开头 \`1.1 {title}\`, \`1.2 {title}\`, \`1.3 {title}\`.... \`2.1 {title}\`, \`2.2 {title}\` 等
                2. 将子标题正确嵌套到父标题下（如\`1.1 {title}\`应作为\`1 {title}\`的子标题）
                3. 剔除与文章内容无关的标题
                4. 保持输出标题内容与输入完全一致
                5. 确保内容无缺失
                6. 如果是中文文献，但有英文的文章题目，可以省略
    
                ## 输入输出格式
                - 输入：包含错误层级关系的markdown标题结构
                - 输出：修正后的标准markdown标题层级结构
    
                ## 处理原则
                1. 严格根据标题语义确定所属关系
                2. 仅调整层级不修改原标题文本
                3. 无关标题直接移除不保留占位
                4. 相同前缀规则的标题必须是同一级别，不能出现 一部分是 n级标题，一部分是其他级别的标题
    
                ## 输出要求
                请将修正后的完整标题结构放在代码块中返回，格式示例如下：
                
                期望输出：
                  \`\`\`markdown
                      
                  \`\`\`
    
                请处理以下数据：
                 `,
    verbose = false,
    scale = 3,
    concurrency = 2,
    onProgress,
  } = options;

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
    const modelClient = new ModelClient({
      apiKey,
      baseUrl,
      model,
      openAiApicompatible,
    });

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
      content += page.content;
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
