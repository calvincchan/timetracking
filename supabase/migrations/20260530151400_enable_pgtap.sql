-- Enable pgTAP for local DB testing. Never runs against production (test-only extension).
CREATE EXTENSION IF NOT EXISTS pgtap;
