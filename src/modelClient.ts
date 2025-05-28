/**
 * 模型客户端模块，用于处理不同视觉模型的API调用
 */

import https from 'https';
import http from 'http';

// 默认角色提示词（中文版）
const DEFAULT_ROLE_PROMPT = `你是一个PDF文档解析器，使用markdown和latex语法输出图片的内容。`;

interface ModelConfig {
  model?: string;
  modelConfig?: Record<string, any>;
  apiKey?: string;
  baseUrl?: string;
  openAiApicompatible?: boolean;
}

interface ProcessImageOptions {
  model?: string;
  rolePrompt?: string;
  maxTokens?: number;
  endpoint?: string;
}

interface MessageContent {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
  source?: {
    type: string;
    media_type: string;
    data: string;
  };
  inline_data?: {
    mime_type: string;
    data: string;
  };
  [key: string]: any; // 允许其他属性
}

interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | MessageContent[];
  }>;
  max_tokens: number;
}

interface ClaudeRequest {
  model: string;
  system: string;
  max_tokens: number;
  messages: Array<{
    role: string;
    content: MessageContent[];
  }>;
}

interface GeminiRequestPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<GeminiRequestPart>;
  }>;
  generation_config: {
    max_output_tokens: number;
  };
}

interface DoubaoRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | MessageContent[];
  }>;
  max_tokens?: number;
}

interface APIResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  content?: Array<{
    text: string;
  }>;
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * 模型客户端类，处理与不同视觉模型的交互
 */
export class ModelClient {
  private config: ModelConfig;
  private apiKey!: string | null;

  /**
   * 创建模型客户端实例
   * @param config 配置对象
   */
  constructor(config: ModelConfig) {
    this.config = {
      model: 'gpt-4-vision-preview',
      modelConfig: {},
      ...config
    };

    // 初始化模型客户端
    this.initClient();
  }

  /**
   * 初始化模型客户端
   * @private
   */
  private initClient(): void {
    const { apiKey } = this.config;

    if (!apiKey) {
      throw new Error('必须提供API密钥');
    }

    this.apiKey = apiKey;
  }

  /**
   * 处理图像并转换为Markdown文本
   * @param imagePath 图像文件路径
   * @param prompt 提示词
   * @param options 附加选项
   * @returns Markdown文本
   */
  async processImage(
    imagePath: Buffer|null,
    prompt: string,
    options: ProcessImageOptions = {}
  ): Promise<string> {
    const model = options.model || this.config.model;
    if (!model) {
      throw new Error('必须指定模型');
    }
    const rolePrompt = options.rolePrompt || DEFAULT_ROLE_PROMPT;
    const maxTokens = options.maxTokens || 4096;
    const endpoint = options.endpoint || this.config.baseUrl;

    // 读取图像文件
    let base64Image: string | null = null;
    if (imagePath) {
      //const imageBuffer = await fs.readFile(imagePath);
      base64Image = imagePath.toString('base64');
    }

    // 根据不同模型类型调用对应API
    if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
      return this.callOpenAIAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('claude') && !this.config.openAiApicompatible) {
      return this.callClaudeAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('gemini') && !this.config.openAiApicompatible) {
      return this.callGeminiAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('doubao') && !this.config.openAiApicompatible) {
      return this.callDoubaoAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else {
      // 默认使用OpenAI
      return this.callOpenAIAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    }
  }

  /**
   * 通过API调用OpenAI视觉模型
   * @private
   */
  private async callOpenAIAPI(
    model: string,
    rolePrompt: string,
    prompt: string,
    base64Image: string | null,
    maxTokens: number,
    endpoint?: string
  ): Promise<string> {
    const apiEndpoint = endpoint || 'https://api.openai.com/v1/chat/completions';

    // 构建用户消息内容
    const userContent: MessageContent[] = [{ type: 'text', text: prompt }];

    // 如果有base64图片，添加图片内容
    if (base64Image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`
        }
      });
    }

    const requestData: OpenAIRequest = {
      model,
      messages: [
        {
          role: 'system',
          content: rolePrompt
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      max_tokens: maxTokens as number
    };

    const response = await this.makeHttpRequest(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (response.error) {
      throw new Error(`OpenAI API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * 通过API调用Claude视觉模型
   * @private
   */
  private async callClaudeAPI(
    model: string,
    rolePrompt: string,
    prompt: string,
    base64Image: string | null,
    maxTokens: number,
    endpoint?: string
  ): Promise<string> {
    const apiEndpoint = endpoint || 'https://api.anthropic.com/v1/messages';

    // 构建消息内容
    const messageContent: MessageContent[] = [{ type: 'text', text: prompt }];

    // 如果有base64图片，添加图片内容
    if (base64Image) {
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64Image
        }
      });
    }

    const requestData: ClaudeRequest = {
      model,
      system: rolePrompt,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ]
    };

    const response = await this.makeHttpRequest(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        //@ts-ignore
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestData)
    });

    if (response.error) {
      throw new Error(`Claude API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.content?.[0]?.text || '';
  }

  /**
   * 通过API调用Gemini视觉模型
   * @private
   */
  private async callGeminiAPI(
    model: string,
    rolePrompt: string,
    prompt: string,
    base64Image: string | null,
    maxTokens: number,
    endpoint?: string
  ): Promise<string> {
    const apiEndpoint = endpoint || `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

    // 构建消息部分
    const parts: GeminiRequestPart[] = [
      { text: `${rolePrompt}\n${prompt}` }  // 合并系统提示和用户提示
    ];

    // 如果有base64图片，添加图片内容
    if (base64Image) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Image
        }
      });
    }

    const requestData: GeminiRequest = {
      contents: [{
        parts: parts
      }],
      generation_config: {
        max_output_tokens: maxTokens
      }
    };

    // Gemini API使用URL参数传递API密钥
    const fullUrl = `${apiEndpoint}?key=${this.apiKey}`;

    const response = await this.makeHttpRequest(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (response.error) {
      throw new Error(`Gemini API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * 通过API调用豆包视觉模型
   * @private
   */
  private async callDoubaoAPI(
    model: string,
    rolePrompt: string,
    prompt: string,
    base64Image: string | null,
    maxTokens: number,
    endpoint?: string
  ): Promise<string> {
    const apiEndpoint = endpoint || 'https://ark.cn-beijing.volces.com/api/v3';

    // 构建用户消息内容
    const userContent: MessageContent[] = [{ type: 'text', text: prompt }];

    // 如果有base64图片，添加图片内容
    if (base64Image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`
        }
      });
    }

    const requestData: DoubaoRequest = {
      model,
      messages: [
        {
          role: 'system',
          content: rolePrompt
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      max_tokens: maxTokens as number
    };

    const response = await this.makeHttpRequest(
      endpoint?.endsWith('/chat/completions') ? apiEndpoint : `${apiEndpoint}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(requestData)).toString(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestData)
      }
    );

    if (response.error) {
      throw new Error(`豆包API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * 通用HTTP请求方法
   * @private
   */
  private async makeHttpRequest(url: string, options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<APIResponse> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search
      };
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } else {
              reject(new Error(`请求失败，状态码: ${res.statusCode}, 响应: ${data}`));
            }
          } catch (e) {
            //@ts-ignore
            reject(new Error(`API响应解析失败: ${e.message}, 原始响应: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): string[] {
    return [
      // OpenAI视觉模型
      'gpt-4-vision-preview',
      'gpt-4o',
      // Claude视觉模型
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      // Gemini模型
      'gemini-pro-vision',
      // 豆包模型
      'doubao-1.5-vision-pro-32k-250115'
    ];
  }
}

export default ModelClient;
