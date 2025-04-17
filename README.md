# PDF2MD Node.js

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen" alt="Node.js Version">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

A powerful Node.js tool for converting PDF documents to Markdown format using advanced vision models. PDF2MD extracts text, tables, and images from PDFs and generates well-structured Markdown documents.

[中文文档](README.zh-CN.md)

## ✨ Features

- **Full Page Processing**: Convert entire PDF pages to high-quality images for processing
- **Visual Model Integration**: Leverage state-of-the-art vision models for accurate text extraction
- **Multiple Model Support**: Compatible with OpenAI, Claude, Gemini, and Doubao vision models
- **Structured Output**: Generate clean, well-formatted Markdown documents
- **Customizable**: Configure image quality, processing options, and output format

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf2md.git
cd pdf2md/pdf2md-node

# Install dependencies
npm install
```

## 📋 Requirements

- Node.js 20.0.0 or higher
- API key for at least one of the supported vision models

## 🔧 Usage

### Basic Usage

```javascript
import { parsePdf } from './src/index.js';

const result = await parsePdf('path/to/your.pdf', {
  apiKey: 'your-api-key',
  model: 'gpt-4-vision-preview',
  useFullPage: true // Use full page processing mode
});

console.log(`Markdown file generated: ${result.mdFilePath}`);
```

### Configuration Options

```javascript
const options = {
  // Output directory for generated files
  outputDir: './output',
  
  // API key for the vision model
  apiKey: 'your-api-key',
  
  // API endpoint (if using a custom endpoint)
  baseUrl: 'https://api.example.com/v1',
  
  // Vision model to use
  model: 'gpt-4-vision-preview',
  
  // Custom prompt for the vision model
  prompt: 'Convert this PDF to well-structured Markdown',
  
  // Whether to use full page processing (recommended)
  useFullPage: true,
  
  // Whether to keep intermediate image files
  verbose: false,
  
  // Image scaling factor (higher = better quality but slower)
  scale: 3,

  // Whether to use OpenAI-compatible API
  openAiApicompatible: true,

  // Concurrency (number of pages that can be processed simultaneously)
  concurrency: 2,

  // Progress handling callback method (allows the caller to track processing progress; the entire conversion task is only considered complete when the taskStatus is finished)
  onProgress: ({ current, total, taskStatus }) => {
    console.log(`Processed: ${current}, Total pages: ${total}, Task status: ${taskStatus}`);
  }
};

const result = await parsePdf('path/to/your.pdf', options);
```

## 🔍 Supported Models

| Provider | Models |
|----------|--------|
| OpenAI   | `gpt-4-vision-preview`, `gpt-4o` |
| Claude   | `claude-3-opus-20240229`, `claude-3-sonnet-20240229` |
| Gemini   | `gemini-pro-vision` |
| Doubao   | `doubao-1.5-vision-pro-32k-250115` |

## 🧪 Testing

The project includes several test scripts to verify functionality:

```bash
# Test the full PDF to Markdown conversion process
pnpm vite-node test/testFullProcess.js

# Test only the PDF to image conversion
pnpm vite-node test/testFullPageImages.js

# Test specific vision models
pnpm vite-node test/testModel.js
```

## 📁 Project Structure

```
pdf2md-js/
├── src/
│   ├── index.js          # Main entry point
│   ├── pdfParser.js      # PDF parsing module
│   ├── imageGenerator.js # Image generation module
│   ├── modelClient.js    # Vision model client
│   ├── markdownConverter.js # Markdown conversion module
│   └── utils.js          # Utility functions
├── test/
│   ├── samples/          # Sample PDF files for testing
│   ├── testFullProcess.js # Full process test
│   └── ... (other test files)
└── package.json
```

## 🔄 Module Architecture

PDF2MD consists of the following core modules, each responsible for specific functionality:

### 1. Main Entry Module (index.js)

Coordinates the entire system:
- Receives user input (PDF path and configuration options)
- Sequentially calls other modules to complete the conversion process
- Returns the final Markdown result

### 2. PDF Parser Module (pdfParser.js)

Parses PDF files and extracts structured information:
- Uses PDF.js library to load PDF files
- Extracts text content, images, and graphic elements from each page
- Generates a list of rectangular areas, each representing a content block in the PDF

### 3. Image Generator Module (imageGenerator.js)

Renders PDF areas as images:
- Uses PDF.js rendering engine to render specified areas as high-definition images
- Supports adjustable scaling ratios to ensure image clarity
- Uses Sharp library to process and optimize images

### 4. Model Client Module (modelClient.js)

Interacts with various vision model APIs:
- Supports multiple vision models: OpenAI, Claude, Gemini, Doubao, etc.
- Provides a unified API calling interface, encapsulating features of different models
- Handles API call errors and retry mechanisms

### 5. Markdown Converter Module (markdownConverter.js)

Converts model results to standard Markdown format:
- Processes text content returned by the model
- Formats according to Markdown syntax standards
- Merges Markdown content from multiple areas

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
