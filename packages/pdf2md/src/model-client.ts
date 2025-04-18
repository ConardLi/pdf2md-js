/**
 * 模型客户端模块，用于处理不同视觉模型的API调用
 */
import { generateText } from '@xsai/generate-text';
import type { UserMessagePart } from '@xsai/shared-chat';

// 默认角色提示词（中文版）
const DEFAULT_ROLE_PROMPT = `你是一个PDF文档解析器，使用markdown和latex语法输出图片的内容。`;

/**
 * 模型配置接口
 */
export interface ModelConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

/**
 * 处理图像选项接口
 */
interface ProcessImageOptions extends ModelConfig {
  rolePrompt?: string;
}

/**
 * 模型客户端类，处理与不同视觉模型的交互
 */
export class ModelClient {
  private config: ModelConfig;

  /**
   * 创建模型客户端实例
   */
  constructor(config: ModelConfig) {
    this.config = {
      baseURL: 'http://localhost:11434/v1/',
      model: 'gemma3:12b',
      ...config,
    };
  }

  /**
   * 处理图像并转换为Markdown文本
   */
  async processImage(imageData: Buffer | null, prompt: string, options: ProcessImageOptions = {}): Promise<string> {
    const { rolePrompt = DEFAULT_ROLE_PROMPT } = options;

    // 读取图像文件
    let base64Image: string | null = null;
    if (imageData) {
      base64Image = imageData.toString('base64');
    }

    const modelConfig: ModelConfig = {
      apiKey: options.apiKey || this.config.apiKey,
      baseURL: options.baseURL || this.config.baseURL,
      model: options.model || this.config.model,
    };

    return this.callLLM(rolePrompt, prompt, base64Image, modelConfig);
  }

  /**
   * 通过API调用OpenAI视觉模型
   * @private
   */
  private async callLLM(rolePrompt: string, prompt: string, base64Image: string | null, modelConfig: ModelConfig): Promise<string> {
    // 使用OpenAI API
    const baseURL = modelConfig.baseURL || 'https://api.openai.com/v1/';

    // 构建用户消息内容
    const userContent: Array<UserMessagePart> = [{ type: 'text', text: prompt }];

    // 如果有base64图片，添加图片内容
    if (base64Image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
        },
      });
    }

    const { text } = await generateText({
      apiKey: modelConfig.apiKey!,
      baseURL: baseURL,
      messages: [
        {
          role: 'system',
          content: rolePrompt,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      model: modelConfig.model!,
    });

    return text || '';
  }
}

export default ModelClient;
