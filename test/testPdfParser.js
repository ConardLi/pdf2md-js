/**
 * PDF解析模块测试
 * 用于测试PDF文件解析和区域识别功能
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseRects } from '../src/pdfParser.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', '1.pdf'),

  // 输出目录
  outputDir: path.join(__dirname, 'output'),
};

/**
 * 测试PDF区域识别功能
 */
async function testParseRects() {
  console.log('=== 测试PDF区域识别功能 ===');

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

    console.log(`加载PDF文件: ${CONFIG.pdfPath}`);

    // 加载PDF文档
    const data = new Uint8Array(fs.readFileSync(CONFIG.pdfPath));
    const pdf = await getDocument({ data }).promise;

    console.log(`PDF加载成功，共 ${pdf.numPages} 页`);

    // 处理每一页
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      console.log(`\n处理第 ${i} 页...`);

      // 获取页面
      const page = await pdf.getPage(i);

      // 解析区域
      const startTime = Date.now();
      const rects = await parseRects(page);
      const endTime = Date.now();

      console.log(`识别出 ${rects.length} 个区域，耗时: ${(endTime - startTime) / 1000}秒`);

      // 输出前5个区域的坐标
      if (rects.length > 0) {
        console.log('前5个区域的坐标:');
        rects.slice(0, 5).forEach((rect, index) => {
          console.log(`  区域 ${index + 1}: [${rect.map((v) => v.toFixed(2)).join(', ')}]`);
        });
      }

      // 保存区域信息到JSON文件
      const outputPath = path.join(CONFIG.outputDir, `page_${i}_rects.json`);
      fs.writeFileSync(outputPath, JSON.stringify(rects, null, 2));
      console.log(`区域信息已保存到: ${outputPath}`);
    }
  } catch (error) {
    console.error('解析PDF区域时发生错误:', error);
  }

  console.log('');
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试PDF解析模块...\n');

  // 测试PDF区域识别
  await testParseRects();

  console.log('PDF解析模块测试完成');
}

// 运行测试
main();
