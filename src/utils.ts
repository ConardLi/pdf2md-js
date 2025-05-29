/**
 * 工具函数模块，提供常用的辅助功能
 */
import fs from 'fs-extra';

/**
 * 删除文件
 * @param filePath 文件路径
 */
export const removeFile = async (filePath: string): Promise<void> => {
  try {
    await fs.remove(filePath);
  } catch (error: any) {
    console.error(`删除文件 ${filePath} 失败:`, error);
  }
};

// 从 LLM 输出中提取标题
export const extractMdFromLLMOutput = (output: string): string | undefined => {
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
export const getOldMarkdownHeadings = (markdownText: string): string => {
  const title: string[] = [];
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
export const adjustMarkdownHeadings = (markdownText: string, newTitle: string): string => {
  const map = createTitleLevelMap(newTitle);
  const lines = markdownText.split('\n');
  const processedLines: string[] = [];
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
      const hashes = '#'.repeat(level!);
      newLine = `${hashes} ${content}`;
      console.log('转换前：' + line + '===>转换后' + newLine);
    }
    processedLines.push(newLine);
  });
  return processedLines.join('\n');
};

//根据标题#数量，建立内容和数量的map映射
function createTitleLevelMap(data: string, map: Map<string, number> = new Map()): Map<string, number> {
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