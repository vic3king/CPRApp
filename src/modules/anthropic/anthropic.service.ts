import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService implements OnModuleInit {
  private readonly logger = new Logger(AnthropicService.name);
  private anthropic: Anthropic;

  onModuleInit() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async createMessage(
    systemInstruction: string,
    userInput: string,
  ): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        // model: 'claude-3-7-sonnet-20250219', // better output
        model: 'claude-3-5-haiku-20241022', // faster and cheaper
        max_tokens: 1000,
        temperature: 0,
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response format from Anthropic');
    } catch (error) {
      this.logger.error('Failed to create Anthropic response:', error);
      throw error;
    }
  }
}
