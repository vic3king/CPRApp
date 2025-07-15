export interface ProcessedDocument {
  pageContent: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  type: 'text';
  source: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  // Optional chunk fields
  chunkIndex?: number;
  totalChunks?: number;
  chunkStart?: number;
  chunkEnd?: number;
  // Enhanced metadata fields for better retrieval
  lastModified?: Date;
  encoding?: string;
  chunkSize?: number;
  section?: string;
  hasNumbers?: boolean;
  hasReferences?: boolean;
  complexity?: 'low' | 'medium' | 'high';
  keywords?: string[];
  // Similarity score from vector search
  score?: number;
}
