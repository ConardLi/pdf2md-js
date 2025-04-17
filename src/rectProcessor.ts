/**
 * 矩形区域处理模块，用于合并和处理PDF中的矩形区域
 */
import * as turf from '@turf/turf';
import { isNear, isHorizontalNear, unionRects, isValidRect, RECT } from './utils';

/**
 * 合并矩形列表中相近的矩形
 * @param rectList 矩形列表
 * @param distance 合并距离阈值
 * @param horizontalDistance 水平合并距离阈值
 * @returns 合并后的矩形列表
 */
export const mergeRects = (rectList: RECT[], distance: number = 20, horizontalDistance: number | null = null): RECT[] => {
  try {
    // 防止空列表
    if (!rectList || !Array.isArray(rectList) || rectList.length === 0) {
      return [];
    }

    // 预处理：过滤无效矩形
    let validRects = rectList.filter((rect) => rect && isValidRect(rect));
    if (validRects.length === 0) {
      return [];
    }

    // 复制数组，避免修改原数组
    let workingRects = [...validRects];
    let merged = true;

    while (merged && workingRects.length > 0) {
      merged = false;
      const newRectList: RECT[] = [];

      while (workingRects.length > 0) {
        let rect = workingRects.shift();
        if (!rect) continue; // 跳过空值

        for (let i = 0; i < workingRects.length; i++) {
          const otherRect = workingRects[i];
          if (!otherRect) continue; // 跳过空值

          if (isNear(rect, otherRect, distance) || (horizontalDistance && isHorizontalNear(rect, otherRect, horizontalDistance))) {
            // 合并矩形
            const mergedRect = unionRects(rect, otherRect);
            if (mergedRect) {
              rect = mergedRect;
              // 从列表中移除已合并的矩形
              workingRects.splice(i, 1);
              i--; // 调整索引
              merged = true;
            }
          }
        }

        if (rect) {
          newRectList.push(rect);
        }
      }

      workingRects = newRectList;
    }

    // 过滤无效的矩形
    return workingRects.filter((rect) => rect && isValidRect(rect));
  } catch (error: any) {
    console.error('合并矩形时出错:', error.message);
    return [];
  }
};

/**
 * 将源矩形列表吸附到目标矩形列表
 * @param sourceRects 源矩形列表
 * @param targetRects 目标矩形列表
 * @param distance 吸附距离阈值
 * @returns [未吸附的源矩形列表, 更新后的目标矩形列表]
 */
export const adsorbRectsToRects = (sourceRects: RECT[], targetRects: RECT[], distance: number = 10): [RECT[], RECT[]] => {
  const newSourceRects: RECT[] = [];
  const updatedTargetRects: RECT[] = [...targetRects];

  for (const rect of sourceRects) {
    let adsorbed = false;

    for (let i = 0; i < updatedTargetRects.length; i++) {
      if (isNear(rect, updatedTargetRects[i], distance)) {
        // 合并矩形
        const mergedRect = unionRects(rect, updatedTargetRects[i]);
        if (mergedRect) {
          updatedTargetRects[i] = mergedRect;
          adsorbed = true;
          break;
        }
      }
    }

    if (!adsorbed) {
      newSourceRects.push(rect);
    }
  }

  return [newSourceRects, updatedTargetRects];
};

/**
 * 将几何对象数组转换为矩形的坐标数组
 * @param rects 几何对象数组
 * @returns 矩形坐标数组 [[x0, y0, x1, y1], ...]
 */
export const rectsToCoordinates = (rects: RECT[]): number[][] => {
  return rects.map((rect) => {
    const bbox = turf.bbox(rect);
    return [bbox[0], bbox[1], bbox[2], bbox[3]];
  });
};

/**
 * 过滤掉太小的矩形
 * @param rects 矩形列表
 * @param minWidth 最小宽度
 * @param minHeight 最小高度
 * @returns 过滤后的矩形列表
 */
export const filterSmallRects = (rects: RECT[], minWidth: number = 20, minHeight: number = 20): RECT[] => {
  return rects.filter((rect) => {
    const bbox = turf.bbox(rect);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];
    return width > minWidth && height > minHeight;
  });
};
