import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';
import { Document } from '@langchain/core/documents';
import { promises as fs } from 'fs';
import * as path from 'path';

import { VectorStoreService } from '../vector-store/vector-store.service';
import { ProcessedDocument } from '../ingest/ingest.interface';

/**
 * Main ensemble service that orchestrates BM25 + Vector search
 *
 * This service handles:
 * - Initialization of ensemble retrieval components
 * - Loading documents from persistent storage
 * - Orchestrating search across multiple retrieval methods
 * - Configuration management for ensemble parameters
 */
@Injectable()
export class EnsembleService implements OnModuleInit {
  private readonly logger = new Logger(EnsembleService.name);

  // Direct configuration - no interfaces needed
  private readonly defaultResultCount = 12;
  private readonly bm25Weight = 0.4;
  private readonly vectorWeight = 0.6;
  private readonly rrfConstant = 60;
  private readonly storageDir = './data/vector-store';
  private readonly docstoreFilename = 'docstore.json';

  // State
  private ensembleRetriever: EnsembleRetriever | null = null;
  private isInitialized = false;

  constructor(private readonly vectorStoreService: VectorStoreService) {
    this.logger.log('EnsembleService initialized with direct configuration');
  }

  async onModuleInit(): Promise<void> {
    await this.initializeIfNeeded();
  }

  /**
   * Performs ensemble search combining BM25 and vector search
   *
   * @param query - Search query string
   * @param limit - Maximum number of results to return
   * @returns Promise<ProcessedDocument[]> - Ranked search results
   */
  async search(
    query: string,
    limit: number = this.defaultResultCount,
  ): Promise<ProcessedDocument[]> {
    const startTime = Date.now();

    if (!this.isInitialized || !this.ensembleRetriever) {
      this.logger.warn(
        'Ensemble not initialized, falling back to vector search',
      );
      return this.fallbackToVectorSearch(query, limit);
    }

    try {
      this.logger.log(`Performing ensemble search: "${query}"`);

      // Execute ensemble search
      const results = await this.ensembleRetriever.invoke(query);

      const processedResults = this.convertToProcessedDocuments(results, limit);

      const searchTime = Date.now() - startTime;
      this.logger.log(
        `Ensemble search completed in ${searchTime}ms, returned ${processedResults.length} documents`,
      );

      return processedResults;
    } catch (error) {
      this.logger.error('Error in ensemble search:', error);
      return this.fallbackToVectorSearch(query, limit);
    }
  }

  /**
   * Initializes ensemble retrieval with provided documents
   *
   * @param documents - Documents to initialize ensemble with
   */
  async initializeWithDocuments(documents: ProcessedDocument[]): Promise<void> {
    try {
      this.logger.log(
        `Initializing ensemble with ${documents.length} documents`,
      );

      const langchainDocs = this.convertToLangChainDocuments(documents);
      await this.createEnsembleRetriever(langchainDocs);

      this.isInitialized = true;
      this.logger.log('Ensemble retrieval initialized with new documents');
    } catch (error) {
      this.logger.error('Failed to initialize ensemble with documents:', error);
      throw error;
    }
  }

  /**
   * Fallback to vector-only search when ensemble is not available
   */
  private async fallbackToVectorSearch(
    query: string,
    limit: number,
  ): Promise<ProcessedDocument[]> {
    this.logger.log('Using vector-only fallback search');
    return this.vectorStoreService.similaritySearch(query, limit);
  }

  private async initializeIfNeeded(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const docCount = await this.vectorStoreService.getDocumentCount();

      if (docCount > 0) {
        this.logger.log(
          `Found ${docCount} documents, initializing ensemble...`,
        );
        await this.loadDocumentsAndInitialize();
      } else {
        this.logger.log(
          'No documents found, ensemble will initialize after ingestion',
        );
      }
    } catch (error) {
      this.logger.error('Error during ensemble initialization:', error);
    }
  }

  private async loadDocumentsAndInitialize(): Promise<void> {
    try {
      const documents = await this.loadDocumentsFromStorage();
      await this.createEnsembleRetriever(documents);

      this.isInitialized = true;
      this.logger.log('Ensemble retrieval initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ensemble from storage:', error);
      throw error;
    }
  }

  private async loadDocumentsFromStorage(): Promise<Document[]> {
    const docstorePath = path.join(this.storageDir, this.docstoreFilename);

    const docstoreContent = await fs.readFile(docstorePath, 'utf-8');
    const docstore = JSON.parse(docstoreContent);

    if (!Array.isArray(docstore) || docstore.length === 0) {
      throw new Error('No documents found in docstore');
    }

    this.logger.log(`Loaded ${docstore.length} documents from storage`);

    return docstore.map(
      (doc: any) =>
        new Document({
          pageContent: doc.pageContent || '',
          metadata: doc.metadata || {},
        }),
    );
  }

  private async createEnsembleRetriever(documents: Document[]): Promise<void> {
    // Create BM25 retriever
    const bm25Retriever = BM25Retriever.fromDocuments(documents, {
      k: this.defaultResultCount,
    });

    // Get vector store retriever using asRetriever()
    const vectorStore = this.vectorStoreService.getVectorStore();
    const vectorRetriever = vectorStore.asRetriever({
      k: this.defaultResultCount,
    });

    // Create ensemble retriever with direct values
    this.ensembleRetriever = new EnsembleRetriever({
      retrievers: [bm25Retriever, vectorRetriever],
      weights: [this.bm25Weight, this.vectorWeight],
      c: this.rrfConstant,
    });
  }

  private convertToLangChainDocuments(
    documents: ProcessedDocument[],
  ): Document[] {
    return documents.map(
      (doc) =>
        new Document({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
        }),
    );
  }

  private convertToProcessedDocuments(
    documents: Document[],
    limit: number,
  ): ProcessedDocument[] {
    return documents.slice(0, limit).map((doc) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata as ProcessedDocument['metadata'],
    }));
  }
}
