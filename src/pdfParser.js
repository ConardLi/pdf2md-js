/**
 * PDF解析模块，负责从PDF文件中提取文本和图像信息
 */
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRect } from './utils.js';
import { mergeRects, adsorbRectsToRects, filterSmallRects } from './rectProcessor.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * 解析PDF页面，识别区域
 * @param {Object} page PDF.js页面对象
 * @returns {Array} 识别出的区域坐标数组 [[x0, y0, x1, y1], ...]
 */
export const parseRects = async (page) => {
  console.log('\n开始解析页面区域...');
  // 获取页面尺寸
  const viewport = page.getViewport({ scale: 1.0 });
  console.log(`页面尺寸: ${viewport.width} x ${viewport.height}`);

  // 提取文本内容
  const textContent = await page.getTextContent();

  // 创建文本区域的矩形列表
  const textRects = textContent.items.map((item) => {
    const { str, transform } = item;
    // 获取文本项的位置和尺寸
    const x = transform[4];
    const y = transform[5];
    const width = item.width || 0;
    const height = item.height || 12; // 默认高度

    // 创建文本区域矩形
    return {
      rect: createRect([x, viewport.height - y - height, x + width, viewport.height - y]),
      text: str,
      isLarge: str.length / Math.max(1, str.split('\n').length) > 5, // 判断是否为大文本块
    };
  });

  // 分离大文本和小文本区域
  const largeTextRects = textRects.filter((item) => item.isLarge).map((item) => item.rect);
  const smallTextRects = textRects.filter((item) => !item.isLarge).map((item) => item.rect);
  console.log(`创建了 ${textRects.length} 个文本区域，其中大文本 ${largeTextRects.length} 个，小文本 ${smallTextRects.length} 个`);

  // 获取操作列表，找出图像和绘图元素
  const operatorList = await page.getOperatorList();
  console.log(`提取到 ${operatorList.fnArray.length} 个操作`);

  // 提取图像和绘图元素
  const drawingRects = [];
  const imageRects = [];

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];

    // 处理绘图操作
    if (fn === OPS.stroke || fn === OPS.fill) {
      // 简化处理：假设前面有一个矩形路径定义
      if (i > 0 && operatorList.fnArray[i - 1] === OPS.constructPath) {
        const pathArgs = operatorList.argsArray[i - 1];
        // 简化：仅处理第一个矩形
        if (pathArgs.length >= 2 && pathArgs[0].length >= 4) {
          const coords = pathArgs[0].slice(0, 4);
          // 创建矩形，简化处理
          const rect = createRect([coords[0], viewport.height - coords[1], coords[2], viewport.height - coords[3]]);

          // 忽略小的水平线
          const bbox = rect.bbox;
          const isShortLine = Math.abs(bbox[3] - bbox[1]) < 1 && Math.abs(bbox[2] - bbox[0]) < 30;

          if (!isShortLine) {
            drawingRects.push(rect);
          }
        }
      }
    }

    // 处理图像操作
    if (fn === OPS.paintImageXObject) {
      // 简化：假设前面有setTransform操作
      if (i > 0 && operatorList.fnArray[i - 1] === OPS.setTransform) {
        const transform = operatorList.argsArray[i - 1];
        // 简化：根据变换矩阵创建近似的矩形
        const x = transform[4];
        const y = transform[5];
        const width = transform[0] * 100; // 简化估计
        const height = transform[3] * 100; // 简化估计

        const rect = createRect([x, viewport.height - y - height, x + width, viewport.height - y]);

        imageRects.push(rect);
      }
    }
  }

  // 合并所有矩形
  let allRects = [...drawingRects, ...imageRects, ...largeTextRects, ...smallTextRects];
  console.log(
    `提取到 ${drawingRects.length} 个绘图区域、${imageRects.length} 个图像区域、${largeTextRects.length} 个大文本区域和 ${smallTextRects.length} 个小文本区域`,
  );

  // 合并相近的矩形 - 增加合并阈值以确保文本不被截断
  let mergedRects = mergeRects(allRects, 25, 150); // 将距离阈值从10增加到25，高度阈值从100增加到150
  console.log(`合并后有 ${mergedRects.length} 个区域`);

  // 如果有绘图或图像区域，才进行吸附
  let updatedMergedRects = mergedRects;
  if (drawingRects.length > 0 || imageRects.length > 0) {
    // 将大文本区域吸附到合并后的矩形
    let [_, temp] = adsorbRectsToRects(largeTextRects, mergedRects, 0.1);
    updatedMergedRects = temp;

    // 将小文本区域吸附到更新后的矩形
    [_, updatedMergedRects] = adsorbRectsToRects(smallTextRects, updatedMergedRects, 5);
  }

  // 再次合并相近的矩形
  mergedRects = mergeRects(updatedMergedRects, 10);

  // 过滤掉太小的矩形 - 减小过滤阈值以保留更多区域
  mergedRects = filterSmallRects(mergedRects, 15, 10); // 降低尺寸阈值，从20x20高度改为15x10
  console.log(`过滤小矩形后剩下 ${mergedRects.length} 个区域`);

  // 将矩形转换为坐标数组
  const result = mergedRects.map((rect) => {
    const bbox = rect.bbox;
    return [bbox[0], bbox[1], bbox[2], bbox[3]];
  });

  console.log(`最终返回 ${result.length} 个区域`);
  return result;
};

/**
 * 从PDF文件解析出所有页面的区域
 * @param {string} pdfPath PDF文件路径
 * @returns {Array} 每个页面的区域信息 [{ pageIndex, rects: [[x0, y0, x1, y1], ...] }, ...]
 */
export const parsePdfRects = async (pdfPath) => {
  // 加载PDF文档
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await getDocument({ data }).promise;

  const pageCount = pdf.numPages;
  const results = [];

  // 处理每一页
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const rects = await parseRects(page);

    results.push({
      pageIndex: i - 1,
      rects,
    });

    console.log(`处理页面 ${i}/${pageCount}，找到 ${rects.length} 个区域`);
  }

  return results;
};
