/**
 * 图像生成模块，负责将PDF区域转换为图像
 */
import { PDFiumLibrary } from "@hyzyla/pdfium";
import fs from 'fs-extra';
import sharp from 'sharp';

// 定义一些类型
export type PageImage = { index: number; data: Buffer };


async function renderFunction(options: { data: sharp.SharpInput | sharp.SharpInput[] | undefined; width: any; height: any; }) {
  return await sharp(options.data, {
    raw: {
      width: options.width,
      height: options.height,
      channels: 4,
    },
  })
  .png()
  .toBuffer();
}

/**
 * 获取PDF文档的页数
 * @param pdfData PDF文件数据或路径
 * @returns PDF文档的总页数
 */
export const getPageCount = async (pdfData: Buffer | string): Promise<number> => {
  // 如果pdfData是字符串，则当作路径处理
  let data: Uint8Array;
  if (typeof pdfData === 'string') {
    data = new Uint8Array(await fs.readFile(pdfData));
  } else {
    data = new Uint8Array(pdfData);
  }

  const library = await PDFiumLibrary.init();

  const document = await library.loadDocument(data);

  const pageCount = document.getPageCount();

  document.destroy();
  library.destroy();

  // 加载PDF文档并返回页数
  return pageCount;
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
  const library = await PDFiumLibrary.init();

  const document = await library.loadDocument(data);

  const numPages = document.getPageCount();

  console.log(`PDF文档共 ${numPages} 页`);

  // 存储生成的图像路径
  const pageImages: PageImage[] = [];

  // 处理每一页
  for (const page of document.pages()) {
    const pageIndex = page.number + 1;
    console.log(`处理第 ${pageIndex} 页...`);

    // 将PDF页面渲染为PNG图片
    const image = await page.render({
      scale: 3, // 3倍缩放（默认72 DPI）
      render: renderFunction,  // sharp函数，用于将原始位图数据转换为PNG
    });

    pageImages.push({ index: pageIndex, data: Buffer.from(image.data) });

    // 将PNG图片保存到输出文件夹
    //await fs.writeFile(`output/${page.number}.png`, Buffer.from(image.data));
  }

  document.destroy();
  library.destroy();
  return pageImages;
};

/**
 * 将PDF文档的所有页面截图并保存到指定目录
 * @param pdfData PDF文件数据或路径
 * @param outputDir 输出目录
 * @param scale 缩放比例，默认为3
 * @returns 保存的图像文件路径数组
 */
export const savePdfAsImages = async (pdfData: Buffer | string, outputDir: string, scale: number = 3): Promise<string[]> => {
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
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(data);
  const numPages = document.getPageCount();

  console.log(`PDF文档共 ${numPages} 页，开始生成截图...`);

  // 存储生成的图像文件路径
  const imagePaths: string[] = [];

  // 处理每一页
  for (const page of document.pages()) {
    const pageIndex = page.number + 1;
    console.log(`生成第 ${pageIndex} 页截图...`);

    // 将PDF页面渲染为PNG图片
    const image = await page.render({
      scale: scale,
      render: renderFunction,
    });

    // 生成文件名和路径
    const fileName = `page-${pageIndex.toString().padStart(3, '0')}.png`;
    const filePath = `${outputDir}/${fileName}`;
    
    // 保存图片到文件
    await fs.writeFile(filePath, Buffer.from(image.data));
    imagePaths.push(filePath);
  }

  document.destroy();
  library.destroy();
  
  console.log(`PDF截图完成，共生成 ${imagePaths.length} 张图片`);
  return imagePaths;
};
