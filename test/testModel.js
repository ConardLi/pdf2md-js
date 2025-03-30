/**
 * 简化版模型测试工具
 * 用于测试不同视觉模型的处理能力
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ModelClient from '../src/modelClient.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  // 要测试的模型
  model: 'doubao-1.5-vision-pro-32k-250115', // 可选: gpt-4-vision-preview, gpt-4o, claude-3-opus-20240229, gemini-pro-vision

  // API密钥 (也可以从环境变量中获取)
  apiKey: process.env.DOUBAO_API_KEY || '',

  // 自定义API端点 (可选)
  endpoint: 'https://ark.cn-beijing.volces.com/api/v3/',

  // 测试图片路径
  imagePath: path.join(__dirname, 'images', 'test.png'),

  // 提示词
  prompt: `使用markdown语法，将图片中识别到的文字转换为markdown格式输出。你必须做到：
1. 输出和使用识别到的图片的相同的语言，例如，识别到英语的字段，输出的内容必须是英语。
2. 不要解释和输出无关的文字，直接输出图片中的内容。
3. 内容不要包含在\`\`\`markdown \`\`\`中、段落公式使用 $$ $$ 的形式、行内公式使用 $ $ 的形式。`,

  // 是否保存结果到文件
  saveResult: true,

  // 结果保存目录
  resultsDir: path.join(__dirname, 'results')
};

/**
 * 保存结果到文件
 * @param {string} result 处理结果
 * @param {string} modelId 模型ID
 */
async function saveResult(result, modelId) {
  // 确保结果目录存在
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${modelId}_${timestamp}.md`;
  const filePath = path.join(CONFIG.resultsDir, filename);

  fs.writeFileSync(filePath, result);
  console.log(`\n结果已保存到: ${filePath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('=== 视觉模型测试工具 (简化版) ===\n');

    // 确保测试图片存在
    if (!fs.existsSync(CONFIG.imagePath)) {
      console.error(`错误: 测试图片不存在: ${CONFIG.imagePath}`);
      console.log('请将测试图片放在 test/images 目录下，并更新 CONFIG.imagePath');
      return;
    }

    console.log(`测试模型: ${CONFIG.model}`);
    console.log(`测试图片: ${path.basename(CONFIG.imagePath)}`);

    // 创建模型客户端
    const modelClient = new ModelClient({
      apiKey: CONFIG.apiKey,
      model: CONFIG.model,
      endpoint: CONFIG.endpoint
    });

    console.log('\n开始处理图像...');

    // 处理图像
    const startTime = Date.now();
    const result = await modelClient.processImage(CONFIG.imagePath, CONFIG.prompt, {
      model: CONFIG.model,
      endpoint: CONFIG.endpoint
    });
    const endTime = Date.now();

    console.log(`\n处理完成，耗时: ${(endTime - startTime) / 1000}秒`);
    console.log('\n=== 处理结果 ===\n');
    console.log(result);

    // 保存结果
    if (CONFIG.saveResult) {
      await saveResult(result, CONFIG.model);
    }

  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 运行主函数
main();