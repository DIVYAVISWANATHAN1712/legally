import { supabase } from '@/integrations/supabase/client';
import { generateEmbedding, generateEmbeddings, chunkText } from './embeddingService';

interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

// Store document chunks with embeddings
export async function storeDocumentChunks(
  documentId: string,
  userId: string,
  documentContent: string
): Promise<void> {
  const chunks = chunkText(documentContent, 500, 100);
  
  console.log(`Chunking document into ${chunks.length} pieces`);
  
  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks);
  
  // Prepare chunk records
  const chunkRecords = chunks.map((content, index) => ({
    document_id: documentId,
    user_id: userId,
    chunk_index: index,
    content,
    embedding: `[${embeddings[index].join(',')}]`, // Format for pgvector
    metadata: { chunk_size: content.length }
  }));
  
  // Insert chunks in batches
  const batchSize = 10;
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize);
    const { error } = await supabase
      .from('document_chunks')
      .insert(batch);
    
    if (error) {
      console.error('Error inserting chunks:', error);
      throw error;
    }
  }
  
  console.log(`Stored ${chunks.length} chunks with embeddings`);
}

// Search for relevant chunks using semantic similarity
export async function searchDocumentChunks(
  query: string,
  userId: string,
  documentId?: string,
  matchCount: number = 5,
  matchThreshold: number = 0.3
): Promise<DocumentChunk[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Call the similarity search function
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_threshold: matchThreshold,
    match_count: matchCount,
    p_user_id: userId,
    p_document_id: documentId || null
  });
  
  if (error) {
    console.error('Error searching chunks:', error);
    throw error;
  }
  
  return data || [];
}

// Get context for RAG by combining relevant chunks
export async function getRAGContext(
  query: string,
  userId: string,
  documentId?: string,
  maxChunks: number = 5
): Promise<string> {
  const chunks = await searchDocumentChunks(query, userId, documentId, maxChunks);
  
  if (chunks.length === 0) {
    return '';
  }
  
  // Sort by chunk index for better coherence
  chunks.sort((a, b) => a.chunk_index - b.chunk_index);
  
  // Combine chunks into context
  const context = chunks
    .map((chunk, i) => `[Chunk ${i + 1}, Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`)
    .join('\n\n');
  
  return context;
}

// Delete chunks for a document
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);
  
  if (error) {
    console.error('Error deleting chunks:', error);
    throw error;
  }
}
