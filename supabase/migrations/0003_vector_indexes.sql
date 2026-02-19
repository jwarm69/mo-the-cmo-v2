CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS learning_embeddings_embedding_idx
  ON learning_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
