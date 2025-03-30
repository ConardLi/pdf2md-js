/**
 * 矩形区域处理模块，用于合并和处理PDF中的矩形区域
 */
import * as turf from '@turf/turf';
import { isNear, isHorizontalNear, unionRects, createRect, isValidRect } from './utils.js';

/**
 * 合并矩形列表中相近的矩形
 * @param {Array} rectList 矩形列表
 * @param {number} distance 合并距离阈值
 * @param {number|null} horizontalDistance 水平合并距离阈值
 * @returns {Array} 合并后的矩形列表
 */
export const mergeRects = (rectList, distance = 20, horizontalDistance = null) => {
  try {
    // 防止空列表
    if (!rectList || !Array.isArray(rectList) || rectList.length === 0) {
      return [];
    }
    
    // 预处理：过滤无效矩形
    let validRects = rectList.filter(rect => rect && isValidRect(rect));
    if (validRects.length === 0) {
      return [];
    }
    
    // 复制数组，避免修改原数组
    let workingRects = [...validRects];
    let merged = true;
    
    while (merged && workingRects.length > 0) {
      merged = false;
      const newRectList = [];
      
      while (workingRects.length > 0) {
        let rect = workingRects.shift();
        if (!rect) continue; // 跳过空值
        
        for (let i = 0; i < workingRects.length; i++) {
          const otherRect = workingRects[i];
          if (!otherRect) continue; // 跳过空值
          
          if (isNear(rect, otherRect, distance) || 
              (horizontalDistance && isHorizontalNear(rect, otherRect, horizontalDistance))) {
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
    return workingRects.filter(rect => rect && isValidRect(rect));
  } catch (error) {
    console.error('合并矩形时出错:', error.message);
    return [];
  }
};

/**
 * 将源矩形列表吸附到目标矩形列表
 * @param {Array} sourceRects 源矩形列表
 * @param {Array} targetRects 目标矩形列表
 * @param {number} distance 吸附距离阈值
 * @returns {Array} [未吸附的源矩形列表, 更新后的目标矩形列表]
 */
export const adsorbRectsToRects = (sourceRects, targetRects, distance = 10) => {
  const newSourceRects = [];
  const updatedTargetRects = [...targetRects];
  
  for (const rect of sourceRects) {
    let adsorbed = false;
    
    for (let i = 0; i < updatedTargetRects.length; i++) {
      if (isNear(rect, updatedTargetRects[i], distance)) {
        // 合并矩形
        updatedTargetRects[i] = unionRects(rect, updatedTargetRects[i]);
        adsorbed = true;
        break;
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
 * @param {Array} rects 几何对象数组
 * @returns {Array} 矩形坐标数组 [[x0, y0, x1, y1], ...]
 */
export const rectsToCoordinates = (rects) => {
  return rects.map(rect => {
    const bbox = turf.bbox(rect);
    return [bbox[0], bbox[1], bbox[2], bbox[3]];
  });
};

/**
 * 过滤掉太小的矩形
 * @param {Array} rects 矩形列表
 * @param {number} minWidth 最小宽度
 * @param {number} minHeight 最小高度
 * @returns {Array} 过滤后的矩形列表
 */
export const filterSmallRects = (rects, minWidth = 20, minHeight = 20) => {
  return rects.filter(rect => {
    const bbox = turf.bbox(rect);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];
    return width > minWidth && height > minHeight;
  });
};

export default {
  mergeRects,
  adsorbRectsToRects,
  rectsToCoordinates,
  filterSmallRects
};
