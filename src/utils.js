/**
 * 工具函数模块，提供常用的辅助功能
 */
import fs from 'fs-extra';
import * as turf from '@turf/turf';

/**
 * 确保目录存在，不存在则创建
 * @param {string} directory 目录路径
 */
export const ensureDir = async (directory) => {
  await fs.ensureDir(directory);
};

/**
 * 创建矩形几何对象
 * @param {Array} bounds [x0, y0, x1, y1] 表示矩形的左上和右下坐标
 * @returns {Object} turf几何对象
 */
export const createRect = (bounds) => {
  const [x0, y0, x1, y1] = bounds;
  // 创建一个矩形几何对象
  return turf.bboxPolygon([x0, y0, x1, y1]);
};

/**
 * 计算两个矩形之间的距离
 * @param {Object} rect1 第一个矩形
 * @param {Object} rect2 第二个矩形
 * @param {number} buffer 缓冲区大小
 * @returns {number} 距离
 */
export const getDistance = (rect1, rect2, buffer = 0.1) => {
  // 直接使用几何计算来获取距离
  const bbox1 = turf.bbox(rect1);
  const bbox2 = turf.bbox(rect2);

  // 计算矩形之间的距离
  // 如果矩形重叠，返回0
  if (bbox1[0] <= bbox2[2] && bbox2[0] <= bbox1[2] && bbox1[1] <= bbox2[3] && bbox2[1] <= bbox1[3]) {
    return 0;
  }

  // 计算水平和垂直方向的距离
  let dx = 0;
  let dy = 0;

  if (bbox1[2] < bbox2[0]) {
    dx = bbox2[0] - bbox1[2]; // rect1在rect2的左边
  } else if (bbox2[2] < bbox1[0]) {
    dx = bbox1[0] - bbox2[2]; // rect1在rect2的右边
  }

  if (bbox1[3] < bbox2[1]) {
    dy = bbox2[1] - bbox1[3]; // rect1在rect2的上边
  } else if (bbox2[3] < bbox1[1]) {
    dy = bbox1[1] - bbox2[3]; // rect1在rect2的下边
  }

  // 计算欧几里得距离
  return Math.sqrt(dx * dx + dy * dy) - buffer * 2;
};

/**
 * 检查两个矩形是否足够接近
 * @param {Object} rect1 第一个矩形
 * @param {Object} rect2 第二个矩形
 * @param {number} distance 距离阈值
 * @returns {boolean} 是否接近
 */
export const isNear = (rect1, rect2, distance = 20) => {
  try {
    // 检查矩形是否有效
    if (!rect1 || !rect2) return false;

    // 计算距离
    const dist = getDistance(rect1, rect2);

    // 返回是否小于阈值
    return dist < distance;
  } catch (error) {
    console.error('检查矩形接近性时出错:', error.message);
    return false;
  }
};

/**
 * 检查两个矩形是否在水平方向上接近
 * @param {Object} rect1 第一个矩形
 * @param {Object} rect2 第二个矩形
 * @param {number} distance 距离阈值
 * @returns {boolean} 是否水平接近
 */
export const isHorizontalNear = (rect1, rect2, distance = 100) => {
  try {
    // 检查矩形是否有效
    if (!rect1 || !rect2) return false;

    const bbox1 = turf.bbox(rect1);
    const bbox2 = turf.bbox(rect2);

    // 获取矩形的高度和宽度
    const height1 = bbox1[3] - bbox1[1];
    const height2 = bbox2[3] - bbox2[1];
    const width1 = bbox1[2] - bbox1[0];
    const width2 = bbox2[2] - bbox2[0];

    // 判断是否为水平线(高度很小，宽度较大)
    const isHorizontalLine1 = height1 < 2 && width1 > 10;
    const isHorizontalLine2 = height2 < 2 && width2 > 10;

    // 如果两个矩形都是水平线
    if (isHorizontalLine1 && isHorizontalLine2) {
      // 检查水平方向上是否重叠或接近
      const horizontalOverlap =
        (bbox1[0] <= bbox2[2] && bbox2[0] <= bbox1[2]) || // x方向重叠
        Math.abs(bbox1[0] - bbox2[0]) < 5 || // 左边界接近
        Math.abs(bbox1[2] - bbox2[2]) < 5; // 右边界接近

      // 如果水平方向重叠或接近，检查垂直距离
      if (horizontalOverlap) {
        const verticalDistance = Math.min(Math.abs(bbox1[1] - bbox2[3]), Math.abs(bbox1[3] - bbox2[1]));
        return verticalDistance < distance;
      }
    }

    return false;
  } catch (error) {
    console.error('检查水平接近性时出错:', error.message);
    return false;
  }
};

/**
 * 合并两个矩形
 * @param {Object} rect1 第一个矩形
 * @param {Object} rect2 第二个矩形
 * @returns {Object} 合并后的矩形
 */
export const unionRects = (rect1, rect2) => {
  try {
    // 检查矩形是否有效
    if (!rect1 && !rect2) return null;
    if (!rect1) return rect2;
    if (!rect2) return rect1;

    // 获取边界框
    const bbox1 = turf.bbox(rect1);
    const bbox2 = turf.bbox(rect2);

    // 创建一个包含两个矩形的最小矩形
    const minX = Math.min(bbox1[0], bbox2[0]);
    const minY = Math.min(bbox1[1], bbox2[1]);
    const maxX = Math.max(bbox1[2], bbox2[2]);
    const maxY = Math.max(bbox1[3], bbox2[3]);

    // 创建新的矩形
    return turf.bboxPolygon([minX, minY, maxX, maxY]);
  } catch (error) {
    console.error('合并矩形时出错:', error.message);
    return null;
  }
};

/**
 * 生成随机文件名
 * @param {string} prefix 前缀
 * @param {string} extension 文件扩展名
 * @returns {string} 随机文件名
 */
export const generateRandomFileName = (prefix = 'img', extension = 'png') => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
};

/**
 * 删除文件
 * @param {string} filePath 文件路径
 */
export const removeFile = async (filePath) => {
  try {
    await fs.remove(filePath);
  } catch (error) {
    console.error(`删除文件 ${filePath} 失败:`, error);
  }
};

/**
 * 判断矩形是否有效
 * @param {Object} rect 矩形对象
 * @returns {boolean} 是否有效
 */
export const isValidRect = (rect) => {
  try {
    // 检查是否为空
    if (!rect) return false;

    // 检查是否有效的几何对象
    if (!rect.type || !rect.geometry) {
      // 如果不是GeoJSON对象，尝试获取其边界框
      const bbox = turf.bbox(rect);
      // 检查边界框是否有效
      return (
        bbox &&
        bbox.length === 4 &&
        bbox[0] <= bbox[2] &&
        bbox[1] <= bbox[3] && // 确保坐标正确
        bbox[2] - bbox[0] > 0 &&
        bbox[3] - bbox[1] > 0
      ); // 确保矩形有面积
    }

    return true;
  } catch (error) {
    console.error('检查矩形有效性时出错:', error.message);
    return false;
  }
};

// 从 LLM 输出中提取标题
export const extractMdFromLLMOutput = (output) => {
  const mdStart = output.indexOf('```markdown');
  const mdEnd = output.lastIndexOf('```');
  if (mdStart !== -1 && mdEnd !== -1) {
    const mdString = output.substring(mdStart + 12, mdEnd);
    return mdString;
  } else {
    console.error('模型未按标准格式输出:', output);
    return undefined;
  }
};

//获取优化前的 markdwon 标题
export const getOldMarkdownHeadings = (markdownText) => {
  const title = [];
  const lines = markdownText.split('\n');
  lines.forEach((line) => {
    // 匹配 # 开头，并捕获后面的内容
    const match = line.match(/^#+\s*(.*)/);
    if (match) {
      title.push(line);
    }
  });
  return title.join('\n');
};

//根据新生成的标题结构，重新设置原文章中标题级别
export const adjustMarkdownHeadings = (markdownText, newTitle) => {
  const map = createTitleLevelMap(newTitle);
  const lines = markdownText.split('\n');
  const processedLines = [];
  lines.forEach((line) => {
    // 匹配 # 开头，并捕获后面的内容
    const match = line.match(/^#+\s*(.*)/);
    if (!match) {
      processedLines.push(line);
      return;
    }
    const content = match ? match[1] : line;
    // 检查 content 是否在 map 中存在
    let newLine = line;
    if (map.has(content)) {
      const level = map.get(content);
      // 生成对应数量的 #（例如 level=2 -> "##"）
      const hashes = '#'.repeat(level);
      newLine = `${hashes} ${content}`;
      console.log('转换前：' + line + '===>转换后' + newLine);
    }
    processedLines.push(newLine);
  });
  return processedLines.join('\n');
};

//根据标题#数量，建立内容和数量的map映射
function createTitleLevelMap(data, map = new Map()) {
  const lines = data.split('\n');
  for (const line of lines) {
    // 匹配以#开头的标题行
    const headerMatch = line.match(/^(#+)\s*(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length; // #号的数量
      const text = headerMatch[2].trim(); // #号后的文本内容
      map.set(text, level);
    }
  }
  return map;
}
