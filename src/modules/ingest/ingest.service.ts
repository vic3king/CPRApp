import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { VectorStoreService } from '@modules/vector-store';
import { EnsembleService } from '@modules/ensemble';
import { ProcessedDocument } from './ingest.interface';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly logger = new Logger(IngestService.name);
  private textSplitter: RecursiveCharacterTextSplitter;
  private isIngested = false;

  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly ensembleService: EnsembleService,
  ) {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 8000, // ↑ Large chunks: ~2,000 tokens per chunk
      chunkOverlap: 1600, // ↑ 20% overlap for context continuity
      separators: [
        '\n\n\n', // Major section breaks
        '\n\n', // Paragraph breaks
        '\n', // Line breaks
        '. ', // Sentence breaks
        ' ', // Word breaks
        '', // Character breaks (fallback)
      ],
    });
  }

  async onModuleInit() {
    if (!this.isIngested) {
      await this.ingestDocuments();
      this.isIngested = true;
    }
  }

  private async ingestDocuments() {
    try {
      this.logger.log('Ingesting documents...');

      // Check if vector store already has documents
      const currentCount = await this.vectorStoreService.getDocumentCount();
      if (currentCount > 0) {
        this.logger.log(
          `Vector store already has ${currentCount} documents - skipping ingestion`,
        );
        return;
      }

      // Process all text files(text splitter)
      const documents = await this.processAllTextFiles();

      if (documents.length === 0) {
        this.logger.warn('No documents found to ingest');
        return;
      }

      // Add documents to vector store
      await this.vectorStoreService.addDocuments(documents);

      // Initialize ensemble retrieval with the new documents
      await this.ensembleService.initializeWithDocuments(documents);

      this.logger.log(
        `Vector store ingested ${documents.length} documents and initialized ensemble retrieval`,
      );
    } catch (error) {
      this.logger.error('Failed to ingest documents:', error);
      throw error;
    }
  }

  async processAllTextFiles(): Promise<ProcessedDocument[]> {
    const textDir = './parts_text';

    try {
      const files = await fs.readdir(textDir);
      const textFiles = files.filter((file) => file.endsWith('.txt'));

      this.logger.log(`Found ${textFiles.length} text files to process`);

      const allDocuments: ProcessedDocument[] = [];

      for (const file of textFiles) {
        const filePath = path.join(textDir, file);
        const documents = await this.processTextFile(filePath);
        allDocuments.push(...documents);
      }

      this.logger.log(`Processed ${allDocuments.length} total document chunks`);
      return allDocuments;
    } catch (error) {
      this.logger.error('Error processing text files:', error);
      throw error;
    }
  }

  async processTextFile(filePath: string): Promise<ProcessedDocument[]> {
    try {
      const fileName = path.basename(filePath);
      this.logger.log(`Processing file: ${fileName}`);

      // Read the file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Get file stats
      const stats = await fs.stat(filePath);

      // Split the content into chunks
      const chunks = await this.textSplitter.splitText(content);

      // Create ProcessedDocument objects
      const processedDocuments: ProcessedDocument[] = chunks.map(
        (chunk, index) => ({
          pageContent: chunk,
          metadata: {
            type: 'text',
            source: 'local_file',
            fileName,
            filePath,
            fileSize: stats.size,
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkStart: 0, // Could calculate actual positions if needed
            chunkEnd: chunk.length,
            lastModified: stats.mtime,
            encoding: 'utf-8',
            chunkSize: chunk.length,
          },
        }),
      );

      this.logger.log(`Split ${fileName} into ${chunks.length} chunks`);
      return processedDocuments;
    } catch (error) {
      this.logger.error(`Error processing file ${filePath}:`, error);
      throw error;
    }
  }
}
