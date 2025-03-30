# 模型测试工具使用说明

这个测试工具用于测试不同视觉模型的处理能力，方便您对比和选择最适合PDF转Markdown任务的模型。

## 准备工作

1. 创建测试图片目录：
```bash
mkdir -p test/images
```

2. 将测试图片放入 `test/images` 目录中（支持PNG、JPG格式）

3. 设置环境变量（可选）：
```bash
# OpenAI API密钥
export OPENAI_API_KEY=sk-your-key

# Claude API密钥
export ANTHROPIC_API_KEY=sk-ant-your-key

# Gemini API密钥
export GEMINI_API_KEY=your-key

# 豆包API密钥
export DOUBAO_API_KEY=your-key
```

## 运行测试

```bash
node test/testModel.js
```

## 功能说明

1. **选择模型**：支持多种视觉模型，包括OpenAI、Claude、Gemini和豆包
2. **选择测试图片**：从test/images目录中选择要测试的图片
3. **选择提示词模板**：提供多种预设的提示词模板，也可以自定义提示词
4. **保存结果**：可以将处理结果保存到test/results目录中，方便对比不同模型的效果

## 支持的模型

- GPT-4 Vision Preview (OpenAI)
- GPT-4o (OpenAI)
- Claude 3 Opus (Anthropic)
- Claude 3 Sonnet (Anthropic)
- Gemini Pro Vision (Google)
- 豆包 1.5 Vision Pro (ByteDance)

## 提示词模板

- **default**: 默认的PDF转Markdown提示词
- **simple**: 简单描述图片内容
- **detailed**: 详细分析图片内容，包括文本、图表、公式等

## 结果对比

测试结果会保存在 `test/results` 目录中，文件名格式为 `{模型ID}_{时间戳}.md`，方便您对比不同模型的处理效果。
