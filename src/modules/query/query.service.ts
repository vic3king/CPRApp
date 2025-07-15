import { Injectable, Logger } from '@nestjs/common';
import { EnsembleService } from '@modules/ensemble';
import { AnthropicService } from '@modules/anthropic';
import { QueryDto } from './query.dto';
import { ProcessedDocument } from '@modules/ingest';
import { systemInstruction, guardedPrompt } from '@common/constants';
import { VectorStoreService } from '@modules/vector-store';
import { LegalEvaluationService } from '@modules/evaluation';

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private readonly ensembleService: EnsembleService,
    private readonly anthropicService: AnthropicService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly legalEvaluationService: LegalEvaluationService,
  ) {}

  async processQuery(queryDto: QueryDto): Promise<{
    answer: string;
    sources: ProcessedDocument[];
    queryTime: number;
    evaluation?: any;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing query: "${queryDto.message}"`);

      // Get relevant documents
      const relevantDocs = await this.retrieveRelevantDocuments(
        queryDto.message,
      );

      if (relevantDocs.length === 0) {
        return this.createEmptyResponse(startTime);
      }

      // Generate answer
      const answer = await this.generateAnswer(queryDto.message, relevantDocs);

      const queryTime = Date.now() - startTime;

      // Evaluate response
      const evaluation = await this.evaluateResponse(
        queryDto.message,
        answer,
        relevantDocs,
      );

      this.logger.log(`Query processed in ${queryTime}ms`);

      return {
        answer,
        sources: relevantDocs,
        queryTime,
        evaluation,
      };
    } catch (error) {
      this.logger.error('Error processing query:', error);
      throw error;
    }
  }

  /**
   * Retrieves relevant documents using ensemble search
   */
  private async retrieveRelevantDocuments(
    query: string,
    limit: number = 12,
  ): Promise<ProcessedDocument[]> {
    const relevantDocs = await this.ensembleService.search(query, limit);

    // const relevantDocs = await this.vectorStoreService.similaritySearch(
    //   queryDto.message,
    //   5, // Default to 5 documents
    // );

    this.logger.log(
      `Found ${relevantDocs.length} relevant documents via ensemble search`,
    );

    return relevantDocs;
  }

  /**
   * Creates response when no relevant documents are found
   */
  private createEmptyResponse(startTime: number) {
    return {
      answer:
        'I could not find any relevant information in the knowledge base to answer your question.',
      sources: [],
      queryTime: Date.now() - startTime,
    };
  }

  /**
   * Formats documents into context string for LLM
   */
  private formatDocumentsToContext(documents: ProcessedDocument[]): string {
    return documents
      .map((doc, index) => {
        const fileName = doc.metadata.fileName || `Document ${index + 1}`;
        const chunkInfo =
          doc.metadata.chunkIndex !== undefined
            ? ` (Chunk ${doc.metadata.chunkIndex + 1}/${doc.metadata.totalChunks})`
            : '';
        const scoreInfo =
          doc.metadata.score !== undefined
            ? ` [Score: ${doc.metadata.score.toFixed(3)}]`
            : '';
        return `[${fileName}${chunkInfo}${scoreInfo}]\n${doc.pageContent}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Generates answer using Anthropic Claude
   */
  private async generateAnswer(
    query: string,
    documents: ProcessedDocument[],
  ): Promise<string> {
    const context = this.formatDocumentsToContext(documents);

    return await this.anthropicService.createMessage(
      systemInstruction,
      guardedPrompt(query, context),
    );
  }

  /**
   * Evaluates the generated response using legal evaluation service
   */
  private async evaluateResponse(
    query: string,
    answer: string,
    documents: ProcessedDocument[],
  ): Promise<any | undefined> {
    try {
      const evaluation = await this.legalEvaluationService.evaluateLegalQuery(
        query,
        answer,
        documents,
      );

      this.logger.log(
        `Query evaluation completed with overall score: ${evaluation.overallScore}`,
      );

      return evaluation;
    } catch (evaluationError) {
      this.logger.warn(
        'Failed to evaluate query:',
        evaluationError instanceof Error
          ? evaluationError.message
          : 'Unknown error',
      );
      // Don't fail the entire request if evaluation fails
      return undefined;
    }
  }
}
