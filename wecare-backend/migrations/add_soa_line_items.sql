-- Add JSONB columns to soas table for line items and incomplete procedures.
-- These were previously discarded by the backend; this migration makes them persistent.
ALTER TABLE soas ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE soas ADD COLUMN IF NOT EXISTS incomplete_items JSONB DEFAULT '[]'::jsonb;

-- The soa_documents table already exists per schema.sql, but we add a `data` column
-- so the base64 file payload from the frontend can be stored alongside metadata.
ALTER TABLE soa_documents ADD COLUMN IF NOT EXISTS data TEXT;
