import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isLoading = false;
let loadPromise: Promise<FeatureExtractionPipeline> | null = null;

// Initialize the embedding model (runs in browser with WebGPU/WASM)
export async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { 
      // Use WASM backend for broader compatibility
      device: 'wasm'
    }
  ).then((pipe) => {
    embeddingPipeline = pipe as FeatureExtractionPipeline;
    isLoading = false;
    return embeddingPipeline;
  });

  return loadPromise;
}

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

// Generate embeddings for multiple texts
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const pipe = await getEmbeddingPipeline();
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data as Float32Array));
  }
  
  return embeddings;
}

// Chunk text into smaller pieces for embedding
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentLength = 0;
  
  for (const sentence of sentences) {
    if (currentLength + sentence.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + sentence;
      currentLength = currentChunk.length;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentLength = currentChunk.length;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If no sentence boundaries found, chunk by character count
  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }
  }
  
  return chunks;
}

export function isEmbeddingModelLoading(): boolean {
  return isLoading;
}
