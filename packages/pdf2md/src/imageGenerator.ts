/**
 * 图像生成模块，负责将PDF区域转换为图像
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils.d.ts';
import type { RenderParameters, PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api.d.ts';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';
import { createCanvas, Canvas } from '@napi-rs/canvas';

// 定义一些类型
type Rect = [number, number, number, number]; // [x0, y0, x1, y1]
type PageRect = { pageIndex: number; rects: Rect[] };
type ImageInfo = { pageImage: string | null; rectImages: string[] };
type PageImage = { index: number; path: string };

/**
 * 将PDF页面的指定区域渲染为图像
 * @param page PDF.js页面对象
 * @param rect 区域坐标 [x0, y0, x1, y1]
 * @param scale 渲染缩放比例
 * @returns 图像缓冲区
 */
export const renderRectToImage = async (page: PDFPageProxy, rect: Rect, scale: number = 4): Promise<Buffer> => {
  const viewport: PageViewport = page.getViewport({ scale });

  // 计算渲染区域 - 添加内边距确保文本不被截断
  const [x0, y0, x1, y1] = rect;

  // 添加内边距（单位：原始坐标系下的点）
  const padding = 20 / scale; // 添加相当20像素的填充

  // 确保填充后的坐标不超出页面范围
  const paddedX0 = Math.max(0, x0 - padding);
  const paddedY0 = Math.max(0, y0 - padding);
  const paddedX1 = Math.min(viewport.width / scale, x1 + padding);
  const paddedY1 = Math.min(viewport.height / scale, y1 + padding);

  // 计算最终宽度和高度
  const width = (paddedX1 - paddedX0) * scale;
  const height = (paddedY1 - paddedY0) * scale;

  // 创建canvas - 使用Node.js版的canvas
  const canvas: Canvas = createCanvas(width, height);
  const context = canvas.getContext('2d') as any as CanvasRenderingContext2D;

  // 填充背景色
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  // 设置渲染参数 - 使用填充后的坐标
  const renderContext: RenderParameters = {
    canvasContext: context,
    viewport: viewport,
    transform: [scale, 0, 0, scale, -paddedX0 * scale, -paddedY0 * scale],
  };

  // 渲染页面
  await page.render(renderContext).promise;

  // 获取图像数据 - 使用Node.js版的canvas
  const pngData = canvas.toBuffer('image/png');

  // 使用Sharp处理图像
  const buffer = await sharp(pngData).png().toBuffer();

  return buffer;
};

/**
 * 从PDF文件生成区域图像
 * @param pdfPath PDF文件路径
 * @param pageRects 每个页面的区域信息 [{ pageIndex, rects }, ...]
 * @param outputDir 输出目录
 * @param drawBoundingBoxes 是否绘制边界框
 * @returns 图像信息 [{ pageImage, rectImages }, ...]
 */
export const generateImagesFromPdf = async (
  pdfPath: string,
  pageRects: PageRect[],
  outputDir: string,
  drawBoundingBoxes: boolean = true,
): Promise<ImageInfo[]> => {
  // 确保输出目录存在
  await fs.ensureDir(outputDir);

  // 加载PDF文档
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdfDocument: PDFDocumentProxy = await getDocument({ data }).promise;

  const imageInfos: ImageInfo[] = [];

  // 处理每一页
  for (const { pageIndex, rects } of pageRects) {
    console.log(`生成页面 ${pageIndex + 1} 的图像`);

    // 获取页面
    const page: PDFPageProxy = await pdfDocument.getPage(pageIndex + 1);
    const viewport: PageViewport = page.getViewport({ scale: 1.0 });

    // 用于存储区域图像文件名
    const rectImages: string[] = [];

    // 处理每个区域
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // 生成区域图像
      const buffer = await renderRectToImage(page, rect);

      // 保存图像
      const imageName = `${pageIndex}_${i}.png`;
      const imagePath = path.join(outputDir, imageName);
      await fs.writeFile(imagePath, buffer);

      rectImages.push(imageName);
    }

    // 如果需要绘制边界框，渲染整个页面并标记区域
    let pageImage: string | null = null;
    if (drawBoundingBoxes) {
      // 渲染整个页面 - 使用Node.js版的canvas
      const scale = 3;
      const canvas: Canvas = createCanvas(viewport.width * scale, viewport.height * scale);
      const context = canvas.getContext('2d') as any as CanvasRenderingContext2D;

      // 填充白色背景
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // 渲染页面
      await page.render({
        canvasContext: context,
        viewport: page.getViewport({ scale }),
      }).promise;

      // 绘制区域标记
      context.lineWidth = 1;
      context.strokeStyle = 'red';
      context.fillStyle = 'white';

      for (let i = 0; i < rects.length; i++) {
        const [x0, y0, x1, y1] = rects[i];

        // 绘制矩形
        context.strokeRect(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);

        // 绘制标签背景
        context.fillRect(x0 * scale + 2, y0 * scale + 2, 80, 12);

        // 绘制标签文本
        context.fillStyle = 'red';
        context.font = '10px Arial';
        context.fillText(`${pageIndex}_${i}`, x0 * scale + 5, y0 * scale + 12);
        context.fillStyle = 'white';
      }

      // 保存页面图像
      const pageImageName = `${pageIndex}.png`;
      const pageImagePath = path.join(outputDir, pageImageName);

      const pageBuffer = await sharp(canvas.toBuffer('image/png')).png().toBuffer();
      await fs.writeFile(pageImagePath, pageBuffer);

      pageImage = pageImageName;
    }

    imageInfos.push({
      pageImage,
      rectImages,
    });
  }

  return imageInfos;
};

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

    // 保存为图像
    const imageName = `page_${pageIndex}.png`;
    const imagePath = path.join(outputDir, imageName);

    // 将canvas转换为图像并保存
    const buffer = await sharp(canvas.toBuffer('image/png')).png().toBuffer();
    await fs.writeFile(imagePath, buffer);

    // 添加到结果数组
    pageImages.push({ index: pageIndex, path: imagePath });

    console.log(`页面 ${pageIndex} 已保存到: ${imagePath}`);
  }

  return pageImages;
};
