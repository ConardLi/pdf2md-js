/**
 * 简化版PDF到图像转换测试
 * 这个版本只生成完整页面图像，不再分割为子图
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');
const sharp = require('sharp');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// 设置PDF.js的worker路径
try {
  const pdfjsWorker = path.join(__dirname, '..', 'node_modules/pdfjs-dist/legacy/build/pdf.worker.js');
  const pdfjsWorkerUrl = new URL(`file://${pdfjsWorker}`).href;
  
  // 全局设置worker路径
  globalThis.pdfjsWorkerSrc = pdfjsWorkerUrl;
  
  console.log('设置PDF.js worker路径:', pdfjsWorkerUrl);
} catch (error) {
  console.warn('设置PDF.js worker路径时出错:', error.message);
}

// 测试配置
const CONFIG = {
  // 测试PDF文件路径
  pdfPath: path.join(__dirname, 'samples', '1.pdf'),
  
  // 输出目录
  outputDir: path.join(__dirname, 'output', 'simple_images'),
  
  // 缩放比例 - 可以调整以获得更高清晰度的图像
  scale: 3
};

/**
 * 简化版PDF到图像转换函数 - 每页生成一个完整图像
 * @param {Buffer} pdfData PDF文件数据
 * @param {string} outputDir 输出目录
 * @param {number} scale 缩放比例
 * @returns {Promise<Array<string>>} 生成的图像文件路径数组
 */
async function generateImagesFromPdf(pdfData, outputDir, scale = 3) {
  // 确保输出目录存在
  await fs.ensureDir(outputDir);
  
  // 加载PDF文档
  const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const numPages = pdfDocument.numPages;
  console.log(`PDF文档共 ${numPages} 页`);
  
  // 存储生成的图像路径
  const pageImages = [];
  
  // 处理每一页
  for (let i = 0; i < numPages; i++) {
    const pageIndex = i + 1;
    console.log(`处理第 ${pageIndex} 页...`);
    
    // 获取页面
    const page = await pdfDocument.getPage(pageIndex);
    const viewport = page.getViewport({ scale });
    
    // 创建canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // 填充白色背景
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, viewport.width, viewport.height);
    
    // 渲染页面
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // 保存为图像
    const imageName = `page_${pageIndex}.png`;
    const imagePath = path.join(outputDir, imageName);
    
    // 将canvas转换为图像并保存
    const buffer = await sharp(canvas.toBuffer('image/png')).png().toBuffer();
    await fs.writeFile(imagePath, buffer);
    
    // 添加到结果数组
    pageImages.push(imagePath);
    
    console.log(`页面 ${pageIndex} 已保存到: ${imagePath}`);
  }
  
  return pageImages;
}

/**
 * 测试简化版PDF到图像转换
 */
async function testSimplePdfToImage() {
  console.log('=== 测试简化版PDF到图像转换 ===');
  
  try {
    // 确保输出目录存在
    await fs.ensureDir(CONFIG.outputDir);
    
    // 检查PDF文件是否存在
    if (!await fs.pathExists(CONFIG.pdfPath)) {
      console.error(`错误: 测试PDF文件不存在: ${CONFIG.pdfPath}`);
      return;
    }
    
    console.log(`加载PDF文件: ${CONFIG.pdfPath}`);
    
    // 读取PDF文件
    const pdfData = await fs.readFile(CONFIG.pdfPath);
    
    // 开始时间
    const startTime = Date.now();
    
    // 执行转换
    const imageFiles = await generateImagesFromPdf(pdfData, CONFIG.outputDir, CONFIG.scale);
    
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
  console.log('开始测试简化版PDF到图像转换...\n');
  
  // 测试简化流程
  await testSimplePdfToImage();
  
  console.log('简化版PDF到图像转换测试完成');
}

// 执行测试
main().catch(error => {
  console.error('执行测试时发生错误:', error);
});
