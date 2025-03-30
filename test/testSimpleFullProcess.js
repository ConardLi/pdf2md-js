/**
 * 简化版完整流程测试
 * 使用整页图像功能，直接处理PDF页面
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFullPageImages } from '../src/imageGenerator.js';
import { processImage } from '../src/modelClient.js';
import { generateMarkdown } from '../src/markdownConverter.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', 'sample.pdf'),

  // 输出目录
  outputDir: path.join(__dirname, 'output'),

  // 图像输出目录
  imageOutputDir: path.join(__dirname, 'output', 'pages'),

  // API密钥 (从环境变量获取或手动设置)
  apiKey: process.env.DOUBAO_API_KEY || 'your-api-key-here',

  // 模型配置
  model: 'doubao-1.5-vision-pro-32k-250115',
  endpoint: 'https://ark.cn-beijing.volces.com/api/v3/',

  // 是否保留中间生成的图像文件
  verbose: true,

  // 缩放比例
  scale: 3
};

/**
 * 简化版PDF转Markdown流程
 */
async function simpleFullProcess() {
  console.log('=== 测试简化版PDF转Markdown流程 ===');

  try {
    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    if (!fs.existsSync(CONFIG.imageOutputDir)) {
      fs.mkdirSync(CONFIG.imageOutputDir, { recursive: true });
    }

    // 检查PDF文件是否存在
    if (!fs.existsSync(CONFIG.pdfPath)) {
      console.error(`错误: 测试PDF文件不存在: ${CONFIG.pdfPath}`);
      console.log('请将测试PDF文件放在 test/samples 目录下，并更新 CONFIG.pdfPath');
      return;
    }

    console.log(`处理PDF文件: ${CONFIG.pdfPath}`);
    console.log(`使用模型: ${CONFIG.model}`);

    // 步骤1: 生成整页图像
    console.log('\n步骤1: 生成整页图像...');
    const startImageTime = Date.now();
    const imageFiles = await generateFullPageImages(
      CONFIG.pdfPath,
      CONFIG.imageOutputDir,
      CONFIG.scale
    );
    const endImageTime = Date.now();
    console.log(`生成整页图像完成，耗时: ${(endImageTime - startImageTime) / 1000}秒`);
    console.log(`共生成 ${imageFiles.length} 张页面图像`);

    // 步骤2: 处理每个页面图像
    console.log('\n步骤2: 使用视觉模型处理图像...');
    const startProcessTime = Date.now();

    const pageContents = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = imageFiles[i];
      console.log(`处理图像 ${i + 1}/${imageFiles.length}: ${path.basename(imagePath)}`);

      // 读取图像文件
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // 调用模型处理图像
      const pageContent = await processImage(
        base64Image,
        CONFIG.model,
        CONFIG.apiKey,
        CONFIG.endpoint
      );

      // 添加页面内容
      pageContents.push({
        pageIndex: i,
        content: pageContent
      });
    }

    const endProcessTime = Date.now();
    console.log(`图像处理完成，耗时: ${(endProcessTime - startProcessTime) / 1000}秒`);

    // 步骤3: 生成Markdown文档
    console.log('\n步骤3: 生成Markdown文档...');
    const startMdTime = Date.now();

    // 生成Markdown文件名
    const pdfBaseName = path.basename(CONFIG.pdfPath, '.pdf');
    const mdFilePath = path.join(CONFIG.outputDir, `${pdfBaseName}_simple.md`);

    // 生成Markdown内容
    const mdContent = generateMarkdown(pageContents);

    // 保存Markdown文件
    fs.writeFileSync(mdFilePath, mdContent, 'utf-8');

    const endMdTime = Date.now();
    console.log(`Markdown生成完成，耗时: ${(endMdTime - startMdTime) / 1000}秒`);

    // 计算总耗时
    const totalTime = (endMdTime - startImageTime) / 1000;

    console.log(`\n处理完成，总耗时: ${totalTime}秒`);
    console.log(`生成的Markdown文件: ${mdFilePath}`);
    console.log(`生成的图像文件数量: ${imageFiles.length}`);

    // 显示Markdown内容预览
    const previewLength = Math.min(500, mdContent.length);

    console.log('\nMarkdown内容预览:');
    console.log('-----------------------------------');
    console.log(mdContent.substring(0, previewLength) + (mdContent.length > previewLength ? '...' : ''));
    console.log('-----------------------------------');

    return {
      mdFilePath,
      imageFiles
    };

  } catch (error) {
    console.error('处理PDF时发生错误:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试简化版完整流程...\n');

  // 测试简化版完整流程
  await simpleFullProcess();

  console.log('\n简化版完整流程测试完成');
}

// 运行测试
main();
