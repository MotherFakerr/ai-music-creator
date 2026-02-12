/**
 * @ai-music/ai
 * AI 接入层 - 音乐续写
 */

import { Sequence } from '@ai-music-creator/core';

export interface AIConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ContinueOptions {
  style?: string;      // 续写风格
  length?: number;      // 续写小节数
  complexity?: number;  // 复杂度 (1-10)
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig = {}) {
    this.config = config;
  }

  async continueSequence(sequence: Sequence, options: ContinueOptions = {}): Promise<Sequence> {
    // TODO: 实现 AI 续写逻辑
    // 1. 将 Sequence 转换为 AI 可理解的格式
    // 2. 调用 AI API
    // 3. 将结果转换回 Sequence
    
    console.log('AI continue sequence:', {
      sequenceId: sequence.id,
      options
    });

    // 返回原始序列（待实现）
    return sequence;
  }
}

export const aiService = new AIService();
