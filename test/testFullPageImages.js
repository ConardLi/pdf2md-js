/**
 * 测试直接生成整页PDF图像功能
 * 不使用区域识别，简化处理流程
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFullPageImages } from '../src/imageGenerator.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', '2.pdf'),

  // 输出目录
  outputDir: path.join(__dirname, 'output', 'full_pages'),

  // 缩放比例
  scale: 3
};

/**
 * 测试整页PDF图像生成
 */
async function testFullPageImageGeneration() {
  console.log('=== 测试整页PDF图像生成 ===');

  try {
    // 确保输出目录存在
    await fs.ensureDir(CONFIG.outputDir);

    // 检查PDF文件是否存在
    if (!await fs.pathExists(CONFIG.pdfPath)) {
      console.error(`错误: 测试PDF文件不存在: ${CONFIG.pdfPath}`);
      return;
    }

    console.log(`加载PDF文件: ${CONFIG.pdfPath}`);

    // 开始时间
    const startTime = Date.now();

    // 执行转换
    const imageFiles = await generateFullPageImages(
      CONFIG.pdfPath,
      CONFIG.outputDir,
      CONFIG.scale
    );

    // 结束时间
    const endTime = Date.now();

    // 输出结果
    console.log(`\n转换完成，耗时: ${(endTime - startTime) / 1000}秒`);
    console.log(`生成了 ${imageFiles.length} 个页面图像:`);

    for (const file of imageFiles) {
      console.log(`- ${file}`);
    }

    console.log(`\n所有图像已保存到: ${CONFIG.outputDir}`);

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试整页PDF图像生成...\n');

  // 测试整页图像生成
  await testFullPageImageGeneration();

  console.log('整页PDF图像生成测试完成');
}

// 执行测试
main().catch(error => {
  console.error('执行测试时发生错误:', error);
});
