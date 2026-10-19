-- Trigram matching for the Dex search, so "tumeric" finds turmeric. Supabase ships pg_trgm too.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
