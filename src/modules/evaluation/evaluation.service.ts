import { Injectable, Logger } from '@nestjs/common';
import { ProcessedDocument } from '@modules/ingest';
import { AnthropicService } from '@modules/anthropic';
import { LegalEvaluationMetrics } from './evaluation.interfaces';
import {
  evaluationSystemPrompt,
  createEvaluationPrompt,
} from '@common/constants';

@Injectable()
export class LegalEvaluationService {
  private readonly logger = new Logger(LegalEvaluationService.name);

  constructor(private readonly anthropicService: AnthropicService) {}

  /**
   * Evaluate legal query performance with domain-specific metrics
   */
  async evaluateLegalQuery(
    query: string,
    answer: string,
    sources: ProcessedDocument[],
  ): Promise<LegalEvaluationMetrics> {
    try {
      this.logger.log(`Evaluating legal query: "${query}"`);

      // Extract actual content from sources for analysis
      const sourceContent = sources.map((s) => ({
        fileName: s.metadata.fileName,
        content: s.pageContent.substring(0, 500), // First 500 chars for analysis
        score: s.metadata.score || 0, // only available for vector store
      }));

      console.log(sourceContent, 'sourceContent');
      const evaluationPrompt = createEvaluationPrompt(
        query,
        answer,
        sourceContent,
        sources.length,
      );

      const evaluation = await this.anthropicService.createMessage(
        evaluationSystemPrompt,
        evaluationPrompt,
      );

      // Parse and validate JSON response
      let scores: any;
      try {
        scores = JSON.parse(evaluation.trim());
      } catch (parseError) {
        this.logger.error('Failed to parse evaluation JSON:', parseError);
        this.logger.error('Raw evaluation response:', evaluation);
        // Return default scores if parsing fails
        return this.getDefaultEvaluation();
      }

      // Validate score ranges and types
      const validatedScores = this.validateScores(scores);
      if (!validatedScores) {
        this.logger.warn('Invalid scores detected, using defaults');
        return this.getDefaultEvaluation();
      }

      // Calculate overall score if not provided
      if (!scores.overallScore || scores.overallScore === 0) {
        const metrics = [
          scores.citationAccuracy,
          scores.precedentRelevance,
          scores.statutoryAccuracy,
          scores.legalCompleteness,
          scores.proceduralAccuracy,
          scores.jurisdictionalAccuracy,
          scores.sourceTransparency,
          scores.factualAccuracy,
        ].filter((score) => typeof score === 'number' && !isNaN(score));

        scores.overallScore =
          metrics.length > 0
            ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length
            : 0;
      }

      this.logger.log(
        `Evaluation completed - Overall: ${scores.overallScore.toFixed(1)}, Citation: ${scores.citationAccuracy.toFixed(1)}, Transparency: ${scores.sourceTransparency.toFixed(1)}`,
      );

      return {
        citationAccuracy: scores.citationAccuracy || 1,
        precedentRelevance: scores.precedentRelevance || 1,
        statutoryAccuracy: scores.statutoryAccuracy || 1,
        legalCompleteness: scores.legalCompleteness || 1,
        proceduralAccuracy: scores.proceduralAccuracy || 1,
        jurisdictionalAccuracy: scores.jurisdictionalAccuracy || 1,
        sourceTransparency: scores.sourceTransparency || 1,
        factualAccuracy: scores.factualAccuracy || 1,
        overallScore: scores.overallScore || 1,
      };
    } catch (error) {
      this.logger.error('Error evaluating legal query:', error);
      return this.getDefaultEvaluation();
    }
  }

  /**
   * Validate that all scores are within expected ranges (1-10)
   */
  private validateScores(scores: any): boolean {
    const requiredMetrics = [
      'citationAccuracy',
      'precedentRelevance',
      'statutoryAccuracy',
      'legalCompleteness',
      'proceduralAccuracy',
      'jurisdictionalAccuracy',
      'sourceTransparency',
      'factualAccuracy',
    ];

    for (const metric of requiredMetrics) {
      const score = scores[metric];
      if (
        typeof score !== 'number' ||
        isNaN(score) ||
        score < 1 ||
        score > 10
      ) {
        this.logger.warn(`Invalid score for ${metric}: ${score}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Test evaluation reliability with known test cases
   */
  async testEvaluationReliability(): Promise<{
    consistency: number;
    accuracy: number;
    testCases: number;
  }> {
    const testCases = [
      {
        query: 'What is the overriding objective?',
        answer:
          'The overriding objective is to enable the court to deal with cases justly and at proportionate cost. This is set out in CPR 1.1(1).',
        expectedHighScores: ['citationAccuracy', 'factualAccuracy'],
        sources: [
          {
            fileName: 'part01.txt',
            content:
              'CPR 1.1(1) - These Rules are a procedural code with the overriding objective...',
            score: 0.95,
          },
        ],
      },
      {
        query: 'How do I file a claim?',
        answer:
          'You can file a claim by completing form N1 and submitting it to the court. The process is outlined in Part 7 of the CPR.',
        expectedHighScores: ['proceduralAccuracy', 'sourceTransparency'],
        sources: [
          {
            fileName: 'part07.txt',
            content: 'Part 7 - How to start proceedings - the claim form...',
            score: 0.92,
          },
        ],
      },
    ];

    let consistencyScore = 0;
    let accuracyScore = 0;

    for (const testCase of testCases) {
      try {
        const evaluation = await this.evaluateLegalQuery(
          testCase.query,
          testCase.answer,
          testCase.sources.map((s) => ({
            pageContent: s.content,
            metadata: {
              type: 'text',
              source: 'test',
              fileName: s.fileName,
              filePath: `./test/${s.fileName}`,
              fileSize: s.content.length,
              score: s.score,
            },
          })),
        );

        // Check if expected high scores are actually high (7+)
        const highScoreCount = testCase.expectedHighScores.filter(
          (metric) => evaluation[metric as keyof LegalEvaluationMetrics] >= 7,
        ).length;

        accuracyScore += highScoreCount / testCase.expectedHighScores.length;
        consistencyScore += evaluation.overallScore >= 6 ? 1 : 0;
      } catch (error) {
        this.logger.error(`Test case failed: ${error}`);
      }
    }

    return {
      consistency: consistencyScore / testCases.length,
      accuracy: accuracyScore / testCases.length,
      testCases: testCases.length,
    };
  }

  private getDefaultEvaluation(): LegalEvaluationMetrics {
    return {
      citationAccuracy: 1,
      precedentRelevance: 1,
      statutoryAccuracy: 1,
      legalCompleteness: 1,
      proceduralAccuracy: 1,
      jurisdictionalAccuracy: 1,
      sourceTransparency: 1,
      factualAccuracy: 1,
      overallScore: 1,
    };
  }
}
