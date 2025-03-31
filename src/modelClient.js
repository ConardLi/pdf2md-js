/**
 * 模型客户端模块，用于处理不同视觉模型的API调用
 */
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import { promisify } from 'util';

// 默认角色提示词（中文版）
const DEFAULT_ROLE_PROMPT = `你是一个PDF文档解析器，使用markdown和latex语法输出图片的内容。`;

/**
 * 模型客户端类，处理与不同视觉模型的交互
 */
export class ModelClient {
  /**
   * 创建模型客户端实例
   * @param {Object} config 配置对象
   * @param {string} config.apiKey OpenAI API密钥
   * @param {string} [config.baseUrl] 自定义API基础URL
   * @param {string} [config.model='gpt-4-vision-preview'] 默认使用的模型
   * @param {Object} [config.modelConfig={}] 模型特定配置
   */
  constructor(config) {
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
  initClient() {
    const { apiKey } = this.config;

    if (!apiKey) {
      throw new Error('必须提供API密钥');
    }

    // 不再创建SDK实例，而是保存必要的配置信息用于API调用
    this.apiKey = apiKey;
  }

  /**
   * 处理图像并转换为Markdown文本
   * @param {string} imagePath 图像文件路径
   * @param {string} prompt 提示词
   * @param {Object} [options={}] 附加选项
   * @param {string} [options.model] 覆盖默认模型
   * @param {string} [options.rolePrompt] 覆盖默认角色提示词
   * @param {number} [options.maxTokens] 最大生成token数
   * @param {string} [options.endpoint] 自定义API端点
   * @returns {Promise<string>} Markdown文本
   */
  async processImage(imagePath, prompt, options = {}) {
    const {
      model = this.config.model,
      rolePrompt = DEFAULT_ROLE_PROMPT,
      maxTokens = 4096,
      endpoint = this.config.endpoint
    } = options;

    // 读取图像文件
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // 根据不同模型类型调用对应API
    if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
      return this.callOpenAIAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('claude')) {
      return this.callClaudeAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('gemini')) {
      return this.callGeminiAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint);
    } else if (model.startsWith('doubao')) {
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
  async callOpenAIAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint) {
    // 使用OpenAI API
    const apiEndpoint = endpoint || 'https://api.openai.com/v1/chat/completions';

    const requestData = {
      model,
      messages: [
        {
          role: 'system',
          content: rolePrompt
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: maxTokens
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

    return response.choices[0].message.content;
  }

  /**
   * 通过API调用Claude视觉模型
   * @private
   */
  async callClaudeAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint) {
    // 使用Claude API
    const apiEndpoint = endpoint || 'https://api.anthropic.com/v1/messages';

    const requestData = {
      model,
      system: rolePrompt,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Image } }
          ]
        }
      ]
    };

    const response = await this.makeHttpRequest(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestData)
    });

    if (response.error) {
      throw new Error(`Claude API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.content[0].text;
  }

  /**
   * 通过API调用Gemini视觉模型
   * @private
   */
  async callGeminiAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint) {
    // 使用Google Gemini API
    const apiEndpoint = endpoint || `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

    const requestData = {
      contents: [
        {
          parts: [
            { text: `${rolePrompt}\n${prompt}` },
            {
              inline_data: {
                mime_type: 'image/png',
                data: base64Image
              }
            }
          ]
        }
      ],
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

    return response.candidates[0].content.parts[0].text;
  }

  /**
   * 通过API调用豆包视觉模型
   * @private
   */
  async callDoubaoAPI(model, rolePrompt, prompt, base64Image, maxTokens, endpoint) {
    // 使用豆包API
    const apiEndpoint = endpoint || 'https://ark.cn-beijing.volces.com/api/v3';

    const requestData = {
      model,
      messages: [
        {
          role: 'system',
          content: rolePrompt
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    };

    const response = await this.makeHttpRequest(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(requestData)),
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (response.error) {
      throw new Error(`豆包API调用失败: ${response.error.message || JSON.stringify(response.error)}`);
    }

    return response.choices[0].message.content;
  }

  /**
   * 通用HTTP请求方法
   * @param {string} url API端点URL
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} API响应对象
   * @private
   */
  makeHttpRequest(url, options) {
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
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
          } else {
              reject(new Error(`请求失败，状态码: ${res.statusCode}, 响应: ${data}`));
          }
          } catch (e) {
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
   * @returns {Array<string>} 支持的模型列表
   */
  getSupportedModels() {
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
