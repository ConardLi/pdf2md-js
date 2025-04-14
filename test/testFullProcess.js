/**
 * 完整流程测试
 * 用于测试PDF转Markdown的整个流程
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parsePdf } from '../src/index.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义进度状态
const progressState = { current: 0, total: 0, taskStatus: false };

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', '2.pdf'),

  // 输出目录
  outputDir: path.join(__dirname, 'output'),

  // API密钥 (从环境变量获取或手动设置)
  apiKey: process.env.DOUBAO_API_KEY || '',

  // 模型配置
  model: 'doubao-1.5-vision-pro-32k-250115',
  endpoint: 'https://ark.cn-beijing.volces.com/api/v3/',

  // 使用全页模式
  useFullPage: true,

  // 是否保留中间生成的图像文件
  verbose: true,

  // 并发处理数量
  concurrency: 5
};

/**
 * 测试完整的PDF转Markdown流程
 */
async function testFullProcess() {
  console.log('=== 测试完整的PDF转Markdown流程 ===');

  try {
    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 检查PDF文件是否存在
    if (!fs.existsSync(CONFIG.pdfPath)) {
      console.error(`错误: 测试PDF文件不存在: ${CONFIG.pdfPath}`);
      console.log('请将测试PDF文件放在 test/samples 目录下，并更新 CONFIG.pdfPath');
      return;
    }

    console.log(`处理PDF文件: ${CONFIG.pdfPath}`);
    console.log(`使用模型: ${CONFIG.model}`);

    // 开始处理
    const startTime = Date.now();

    let parseResult = null;

    parsePdf(CONFIG.pdfPath, {
      outputDir: CONFIG.outputDir,
      apiKey: CONFIG.apiKey,
      baseUrl: CONFIG.endpoint,
      model: CONFIG.model,
      verbose: CONFIG.verbose,
      gptWorker: CONFIG.concurrency,
      useFullPage: CONFIG.useFullPage, // 添加useFullPage参数
      concurrency: CONFIG.concurrency,
      //增加处理进度结果回调
      onProgress: ({ current, total, taskStatus }) => {
        progressState.current = current;
        progressState.total = total;
        progressState.taskStatus = taskStatus;
      }
    }).then(result => {
      parseResult = result;
    });

    // 如果需要主动查询
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        console.log(`[主动查询] 进度: ${progressState.current}/${progressState.total},${progressState.taskStatus}`);
        if (progressState.taskStatus === "finished") {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });

    const endTime = Date.now();
    
    console.log(`\n处理完成，耗时: ${(endTime - startTime) / 1000}秒`);
    console.log(`生成的Markdown文件: ${parseResult.mdFilePath}`);
    console.log(`生成的图像文件数量: ${parseResult.imageFiles.length}`);

    // 显示Markdown内容预览
    const mdContent = fs.readFileSync(parseResult.mdFilePath, 'utf-8');
    const previewLength = Math.min(500, mdContent.length);

    console.log('\nMarkdown内容预览:');
    console.log('-----------------------------------');
    console.log(mdContent.substring(0, previewLength) + (mdContent.length > previewLength ? '...' : ''));
    console.log('-----------------------------------');

  } catch (error) {
    console.error('处理PDF时发生错误:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试完整流程...\n');

  // 测试完整流程
  await testFullProcess();

  console.log('\n完整流程测试完成');
}

// 运行测试
main();
