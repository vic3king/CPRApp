import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { Document } from 'langchain/document';
import { ProcessedDocument } from '../ingest/ingest.interface';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private vectorStore: HNSWLib;
  private embeddings: HuggingFaceInferenceEmbeddings;
  private readonly storageDir = './data/vector-store';
  private isInitialized = false;

  constructor() {
    this.embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: 'sentence-transformers/all-mpnet-base-v2',
    });
  }

  async onModuleInit(): Promise<void> {
    // Initialize the vector store when the module starts
    await this.initializeStore();
  }

  /**
   * Get the underlying HNSWLib vector store instance for use with asRetriever()
   */
  getVectorStore(): HNSWLib {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }
    return this.vectorStore;
  }

  private async initializeStore(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if saved vector store exists
      const indexPath = path.join(this.storageDir, 'docstore.json');

      const indexExists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);

      if (indexExists) {
        this.logger.log('Loading existing vector store from file...');
        this.vectorStore = await HNSWLib.load(this.storageDir, this.embeddings);
        this.logger.log('Successfully loaded existing vector store');
      } else {
        this.logger.log('Creating new vector store...');
        this.vectorStore = await HNSWLib.fromDocuments([], this.embeddings);
        this.logger.log('Successfully created new vector store');
      }

      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async addDocuments(documents: ProcessedDocument[]): Promise<void> {
    try {
      this.logger.log(`Adding ${documents.length} documents to vector store`);

      // Convert ProcessedDocument to LangChain Document format
      const langchainDocs: Document[] = documents.map(
        (doc) =>
          new Document({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          }),
      );

      // This triggers embedding generation via Hugging Face API for each document
      await this.vectorStore.addDocuments(langchainDocs);

      // Save the vector store to file
      await this.vectorStore.save(this.storageDir);

      this.logger.log(
        `Successfully added ${documents.length} documents to vector store and saved to file`,
      );
    } catch (error) {
      this.logger.error('Error adding documents to vector store:', error);
      throw error;
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      // Check if docstore.json exists and get count from there
      const docstorePath = path.join(this.storageDir, 'docstore.json');

      try {
        const docstoreContent = await fs.readFile(docstorePath, 'utf-8');
        const docstore = JSON.parse(docstoreContent);
        const count = Array.isArray(docstore) ? docstore.length : 0;
        this.logger.log(`Document count from docstore: ${count}`);
        return count;
      } catch (fileError) {
        this.logger.log('No existing docstore found, count is 0');
        return 0;
      }
    } catch (error) {
      this.logger.error('Error getting document count:', error);
      return 0;
    }
  }

  /**
   * Performs similarity search and returns documents with scores in metadata
   *
   * @param query - Search query string
   * @param k - Number of results to return
   * @returns Promise<ProcessedDocument[]> - Documents with scores in metadata
   */
  async similaritySearch(
    query: string,
    k: number = 4,
  ): Promise<ProcessedDocument[]> {
    try {
      this.logger.log(`Performing similarity search for query: "${query}"`);

      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k,
      );

      const processedResults: ProcessedDocument[] = results.map(
        ([doc, score]) => ({
          pageContent: doc.pageContent,
          metadata: {
            ...(doc.metadata as ProcessedDocument['metadata']),
            score,
          },
        }),
      );

      console.log(processedResults, 'processedResults');
      this.logger.log(`Found ${processedResults.length} similar documents`);
      return processedResults;
    } catch (error) {
      this.logger.error('Error performing similarity search:', error);
      throw error;
    }
  }
}
