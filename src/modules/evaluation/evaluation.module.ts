import { Module } from '@nestjs/common';
import { AnthropicModule } from '@modules/anthropic';
import { LegalEvaluationService } from './evaluation.service';

@Module({
  imports: [AnthropicModule],
  providers: [LegalEvaluationService],
  exports: [LegalEvaluationService],
})
export class EvaluationModule {}
