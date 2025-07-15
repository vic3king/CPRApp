import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { VectorStoreModule } from '@modules/vector-store';
import { EnsembleModule } from '@modules/ensemble';

@Module({
  imports: [VectorStoreModule, EnsembleModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
