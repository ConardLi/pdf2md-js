/**
 * 完整PDF到图像转换测试
 * 用于测试将PDF文件及其识别出的区域转换为图像
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderRectToImage, generateImagesFromPdf } from '../src/imageGenerator.js';
import { parsePdfRects } from '../src/pdfParser.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', '2.pdf'),

  // 输出目录
  outputDir: path.join(__dirname, 'output', 'full_images'),

  // 是否绘制边界框
  drawBoundingBox: true,

  // 缩放比例
  scale: 2,
};

/**
 * 测试完整的PDF到图像转换流程
 */
async function testFullPdfToImage() {
  console.log('=== 测试完整的PDF到图像转换流程 ===');

  try {
    // 确保输出目录存在
    await fs.ensureDir(CONFIG.outputDir);

    // 检查PDF文件是否存在
    if (!(await fs.pathExists(CONFIG.pdfPath))) {
      console.error(`错误: 测试PDF文件不存在: ${CONFIG.pdfPath}`);
      console.log('请将测试PDF文件放在 test/samples 目录下，并更新 CONFIG.pdfPath');
      return;
    }

    console.log(`加载PDF文件: ${CONFIG.pdfPath}`);

    // 第一步：解析PDF获取所有区域
    console.log('\n步骤1: 解析PDF获取所有区域...');
    const startParseTime = Date.now();
    const pageRects = await parsePdfRects(CONFIG.pdfPath);
    const endParseTime = Date.now();

    if (!pageRects || pageRects.length === 0) {
      console.log('未找到有效区域，测试结束');
      return;
    }

    console.log(`解析完成，耗时: ${(endParseTime - startParseTime) / 1000}秒`);
    console.log(`共 ${pageRects.length} 页`);

    // 记录矩形数量
    let totalRects = 0;
    for (const { pageIndex, rects } of pageRects) {
      console.log(`页面 ${pageIndex + 1}: ${rects.length} 个矩形`);
      totalRects += rects.length;
    }
    console.log(`总计 ${totalRects} 个矩形`);

    // 第二步：生成所有区域的图像
    console.log('\n步骤2: 生成所有区域的图像...');
    const startGenTime = Date.now();
    const imageInfos = await generateImagesFromPdf(CONFIG.pdfPath, pageRects, CONFIG.outputDir, CONFIG.drawBoundingBox, CONFIG.scale);
    const endGenTime = Date.now();

    console.log(`图像生成完成，耗时: ${(endGenTime - startGenTime) / 1000}秒`);

    // 输出图像生成结果
    console.log(`\n生成了 ${imageInfos.length} 页的图像:`);

    let totalImages = 0;
    for (let i = 0; i < imageInfos.length; i++) {
      const { pageImage, rectImages } = imageInfos[i];
      console.log(`页面 ${i + 1}:`);

      // 输出页面图像路径
      console.log(`  页面图像: ${pageImage}`);

      // 输出区域图像路径
      console.log(`  区域图像 (${rectImages.length} 个):`);
      for (let j = 0; j < rectImages.length; j++) {
        console.log(`    - ${rectImages[j]}`);
      }

      totalImages += rectImages.length + 1; // +1 是页面图像
    }

    console.log(`\n总共生成了 ${totalImages} 张图像，包括 ${imageInfos.length} 张完整页面图像和 ${totalImages - imageInfos.length} 张区域图像`);
    console.log(`所有图像已保存到: ${CONFIG.outputDir}`);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }

  console.log('');
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试完整的PDF到图像转换...\n');

  // 测试完整流程
  await testFullPdfToImage();

  console.log('PDF到图像转换测试完成');
}

// 运行测试
main().catch((error) => {
  console.error('测试过程中发生错误:', error);
});
