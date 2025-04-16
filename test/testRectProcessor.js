/**
 * 矩形处理模块测试
 * 用于测试矩形合并、吸附等功能
 */
import { mergeRects, adsorbRectsToRects, filterSmallRects } from '../src/rectProcessor.js';
import { createRect } from '../src/utils.js';

// 测试数据
const TEST_RECTS = [
  // 两个相近的矩形
  createRect([10, 10, 30, 20]),
  createRect([32, 12, 50, 22]),

  // 两个远离的矩形
  createRect([100, 100, 120, 120]),
  createRect([200, 200, 220, 220]),

  // 一个水平线
  createRect([10, 50, 100, 51]),

  // 一个小矩形
  createRect([300, 300, 305, 305]),
];

/**
 * 测试矩形合并功能
 */
function testMergeRects() {
  console.log('=== 测试矩形合并功能 ===');

  // 测试1: 合并相近的矩形
  const mergedRects1 = mergeRects(TEST_RECTS.slice(0, 2), 5);
  console.log(`合并相近矩形 (距离=5): 期望合并成1个，实际合并成 ${mergedRects1.length} 个`);

  // 测试2: 不合并远离的矩形
  const mergedRects2 = mergeRects(TEST_RECTS.slice(2, 4), 5);
  console.log(`合并远离矩形 (距离=5): 期望保持2个，实际合并成 ${mergedRects2.length} 个`);

  // 测试3: 水平线合并
  const horizontalTestRects = [createRect([10, 50, 100, 51]), createRect([10, 80, 100, 81])];
  const mergedRects3 = mergeRects(horizontalTestRects, 5, 50);
  console.log(`水平线合并 (水平距离=50): 期望合并成1个，实际合并成 ${mergedRects3.length} 个`);

  console.log('');
}

/**
 * 测试矩形吸附功能
 */
function testAdsorbRects() {
  console.log('=== 测试矩形吸附功能 ===');

  // 源矩形
  const sourceRects = [createRect([15, 15, 25, 25]), createRect([150, 150, 160, 160])];

  // 目标矩形
  const targetRects = [createRect([10, 10, 30, 30]), createRect([200, 200, 220, 220])];

  // 测试吸附
  const [remainingSourceRects, updatedTargetRects] = adsorbRectsToRects(sourceRects, targetRects, 10);

  console.log(`吸附前: 源矩形=${sourceRects.length}个, 目标矩形=${targetRects.length}个`);
  console.log(`吸附后: 未吸附源矩形=${remainingSourceRects.length}个, 更新后目标矩形=${updatedTargetRects.length}个`);

  console.log('');
}

/**
 * 测试小矩形过滤功能
 */
function testFilterSmallRects() {
  console.log('=== 测试小矩形过滤功能 ===');

  // 测试过滤
  const filteredRects = filterSmallRects(TEST_RECTS, 10, 10);

  console.log(`过滤前矩形数量: ${TEST_RECTS.length}`);
  console.log(`过滤后矩形数量: ${filteredRects.length}`);

  console.log('');
}

/**
 * 主函数
 */
function main() {
  console.log('开始测试矩形处理模块...\n');

  // 测试矩形合并
  testMergeRects();

  // 测试矩形吸附
  testAdsorbRects();

  // 测试小矩形过滤
  testFilterSmallRects();

  console.log('矩形处理模块测试完成');
}

// 运行测试
main();
