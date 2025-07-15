import { Module } from '@nestjs/common';
import { QueryService } from '@modules/query/query.service';
import { QueryController } from './query.controller';
import { AnthropicModule } from '@modules/anthropic';
import { IngestModule } from '@modules/ingest/ingest.module';
import { VectorStoreModule } from '@modules/vector-store';
import { EnsembleModule } from '@modules/ensemble';
import { EvaluationModule } from '@modules/evaluation';

@Module({
  imports: [
    IngestModule,
    AnthropicModule,
    VectorStoreModule,
    EnsembleModule,
    EvaluationModule,
  ],
  providers: [QueryService],
  exports: [QueryService],
  controllers: [QueryController],
})
export class QueryModule {}
