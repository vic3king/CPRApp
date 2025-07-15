import { Module } from '@nestjs/common';
import { EnsembleService } from './ensemble.service';
import { VectorStoreModule } from '../vector-store/vector-store.module';

/**
 * Ensemble Module
 *
 * Provides advanced retrieval capabilities by combining BM25 (keyword-based)
 * and vector (semantic) search using Reciprocal Rank Fusion.
 *
 * This module is particularly effective for legal document search where both
 * exact rule references and conceptual queries need to be handled well.
 */
@Module({
  imports: [VectorStoreModule], // Import VectorStoreService
  providers: [EnsembleService],
  exports: [EnsembleService],
})
export class EnsembleModule {}
