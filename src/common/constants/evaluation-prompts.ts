/**
 * System prompt for legal evaluation
 */
export const evaluationSystemPrompt = `You are a legal evaluation expert specializing in Civil Procedure Rules (CPR) analysis. 

Your task is to:
1. Carefully read the provided query, answer, and source documents
2. Think through your reasoning step by step
3. Score each metric from 1-10 based ONLY on factual evidence in the content
4. Be precise and objective - avoid generic scores (1=poor, 10=excellent)
5. Calculate overallScore as the average of all other scores
6. Return ONLY valid JSON - no explanation text

Focus on:
- Exact rule citations (CPR numbers, Part references)
- Accuracy of legal statements against source content
- Completeness based on available information
- Proper legal formatting and terminology
- Factual accuracy of details from source content

IMPORTANT: Think through your reasoning first, then discard it and output only the JSON scores.`;

/**
 * Template for legal query evaluation prompt
 */
export const createEvaluationPrompt = (
  query: string,
  answer: string,
  sourceContent: Array<{
    fileName: string;
    content: string;
    score: number;
  }>,
  sourcesLength: number,
) => `
LEGAL QUERY EVALUATION - Analyze the following ACTUAL content and provide precise scores:

=== QUERY ===
${query}

=== GENERATED ANSWER ===
${answer}

=== SOURCE DOCUMENTS (${sourcesLength} found) ===
${sourceContent
  .map(
    (s, i) => `
${i + 1}. File: ${s.fileName} (Relevance: ${s.score.toFixed(3)})
Content: "${s.content}..."
`,
  )
  .join('\n')}

=== EDGE CASE HANDLING ===
- If sources are irrelevant or insufficient: Score based on what CAN be evaluated
- If answer is ambiguous: Score conservatively (lower scores)
- If sources contradict each other: Note this in reasoning, score based on majority
- If query is unclear: Score based on answer quality given the query as stated

=== EVALUATION INSTRUCTIONS ===
First, think through your reasoning in <thinking> tags, then discard it and rate each aspect from 1 to 10 based on FACTS:

<thinking>
Analyze each metric systematically:
1. Check if citations match source content exactly
2. Verify legal statements against source text
3. Assess completeness of coverage
4. Evaluate factual accuracy
5. Consider source transparency and references
6. Handle edge cases appropriately
</thinking>

1. CITATION ACCURACY (1-10): How correctly does the answer cite specific rules (e.g., "CPR 1.1", "Part 7") that match the source content?
2. PRECEDENT RELEVANCE (1-10): How well does the answer identify legal precedents/authorities found in the sources?
3. STATUTORY ACCURACY (1-10): How accurately are statutory provisions quoted/interpreted from source text?
4. LEGAL COMPLETENESS (1-10): How thoroughly does the answer cover the key legal points present in the source documents?
5. PROCEDURAL ACCURACY (1-10): How correctly are procedural rules/requirements stated from sources?
6. JURISDICTIONAL ACCURACY (1-10): How appropriately is jurisdiction (England & Wales CPR) applied based on sources?
7. SOURCE TRANSPARENCY (1-10): How clearly are sources cited with specific rule numbers from the content?
8. FACTUAL ACCURACY (1-10): How accurately are facts and details represented from the source content?

CRITICAL: Base scores ONLY on what you can verify from the actual content provided above.

Respond with ONLY valid JSON for example:
{
  "citationAccuracy": 1,
  "precedentRelevance": 1,
  "statutoryAccuracy": 1,
  "legalCompleteness": 1,
  "proceduralAccuracy": 1,
  "jurisdictionalAccuracy": 1,
  "sourceTransparency": 1,
  "factualAccuracy": 1,
  "overallScore": 1
}
`;
