import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueryModule } from './modules/query/query.module';
import { ConfigModule } from '@nestjs/config';
import { IngestModule } from './modules/ingest/ingest.module';
import { VectorStoreModule } from './modules/vector-store/vector-store.module';
import { EnsembleModule } from './modules/ensemble/ensemble.module';
import { AnthropicModule } from './modules/anthropic/anthropic.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AnthropicModule,
    QueryModule,
    IngestModule,
    VectorStoreModule,
    EnsembleModule,
    EvaluationModule,
  ],
})
export class AppModule {}
