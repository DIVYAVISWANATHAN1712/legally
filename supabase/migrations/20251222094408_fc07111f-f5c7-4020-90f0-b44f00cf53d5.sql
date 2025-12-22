-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create document_chunks table for storing chunked text with embeddings
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384), -- Using 384 dimensions for all-MiniLM-L6-v2 model
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks
CREATE POLICY "Users can view their own document chunks"
  ON public.document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document chunks"
  ON public.document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks"
  ON public.document_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster vector similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for document lookups
CREATE INDEX document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX document_chunks_user_id_idx ON public.document_chunks(user_id);

-- Function for semantic similarity search
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(384),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID,
  p_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.user_id = p_user_id
    AND (p_document_id IS NULL OR dc.document_id = p_document_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;