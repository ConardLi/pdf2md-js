/**
 * 图像生成模块测试
 * 用于测试PDF区域转图像功能
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';
import { renderRectToImage } from '../src/imageGenerator.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置PDF.js的worker路径
try {
  // 3.x 版本的设置方式
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
  pdfPath: path.join(__dirname, 'samples', 'sample.pdf'),
  
  // 输出目录
  outputDir: path.join(__dirname, 'output'),
  
  // 测试区域 [x0, y0, x1, y1]
  testRect: [100, 100, 300, 200]
};

/**
 * 测试渲染PDF区域为图像
 */
async function testRenderRectToImage() {
  console.log('=== 测试渲染PDF区域为图像 ===');
  
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
    const pdfDocument = await getDocument({ data }).promise;
    
    console.log(`PDF加载成功，共 ${pdfDocument.numPages} 页`);
    
    // 获取第一页
    const page = await pdfDocument.getPage(1);
    
    console.log(`渲染区域: [${CONFIG.testRect.join(', ')}]`);
    
    // 渲染区域为图像
    const imageBuffer = await renderRectToImage(page, CONFIG.testRect, 2);
    
    // 保存图像
    const outputPath = path.join(CONFIG.outputDir, 'test_rect.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log(`图像已保存到: ${outputPath}`);
    console.log(`图像大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('渲染区域为图像时发生错误:', error);
  }
  
  console.log('');
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试图像生成模块...\n');
  
  // 测试渲染区域为图像
  await testRenderRectToImage();
  
  console.log('图像生成模块测试完成');
}

// 运行测试
main();
