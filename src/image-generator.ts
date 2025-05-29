/**
 * 图像生成模块，负责将PDF区域转换为图像
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.d.ts';
import type { PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api.d.ts';
import fs from 'fs-extra';
import { createCanvas, Canvas } from '@napi-rs/canvas';

// 定义一些类型
export type PageImage = { index: number; data: Buffer };

/**
 * 直接生成PDF文档的所有页面图像，不依赖区域识别
 * @param pdfData PDF文件数据或路径
 * @param outputDir 输出目录
 * @param scale 缩放比例
 * @returns 生成的图像文件路径数组
 */
export const generateFullPageImages = async (pdfData: Buffer | string, outputDir: string, scale: number = 3): Promise<PageImage[]> => {
  // 确保输出目录存在
  await fs.ensureDir(outputDir);

  // 如果pdfData是字符串，则当作路径处理
  let data: Uint8Array;
  if (typeof pdfData === 'string') {
    data = new Uint8Array(await fs.readFile(pdfData));
  } else {
    data = new Uint8Array(pdfData);
  }

  // 加载PDF文档
  const pdfDocument: PDFDocumentProxy = await getDocument({ data }).promise;
  const numPages = pdfDocument.numPages;
  console.log(`PDF文档共 ${numPages} 页`);

  // 存储生成的图像路径
  const pageImages: PageImage[] = [];

  // 处理每一页
  for (let i = 0; i < numPages; i++) {
    const pageIndex = i + 1;
    console.log(`处理第 ${pageIndex} 页...`);

    // 获取页面
    const page: PDFPageProxy = await pdfDocument.getPage(pageIndex);
    const viewport: PageViewport = page.getViewport({ scale });

    // 创建canvas
    const canvas: Canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d') as any as CanvasRenderingContext2D;

    // 填充白色背景
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, viewport.width, viewport.height);

    // 渲染页面
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // 将canvas转换为图像并保存
    const buffer = canvas.toBuffer('image/png');

    // 添加到结果数组
    pageImages.push({ index: pageIndex, data: buffer });
  }

  return pageImages;
};