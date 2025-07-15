export interface LegalEvaluationMetrics {
  // Search Quality (1-10 scale)
  citationAccuracy: number; // Are legal citations correct and specific?
  precedentRelevance: number; // Are relevant precedents/authorities identified?
  statutoryAccuracy: number; // Are statutes correctly identified and applied?

  // Answer Quality (1-10 scale)
  legalCompleteness: number; // Does answer cover all legal aspects found in sources?
  proceduralAccuracy: number; // Are procedural rules correctly stated from sources?
  jurisdictionalAccuracy: number; // Is jurisdiction correctly applied based on content?

  // Content Quality (1-10 scale)
  sourceTransparency: number; // Are sources clearly cited with specific references?
  factualAccuracy: number; // Are facts accurately represented from source content?

  // Overall Assessment (1-10 scale)
  overallScore: number; // Average of all evaluation metrics
}
