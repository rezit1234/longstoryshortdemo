-- Atomické číslování faktur: VOUCHY-YYYY-NNNN

CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (year)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoice sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can insert invoice sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can update invoice sequences" ON invoice_sequences;

CREATE POLICY "Users can view invoice sequences" ON invoice_sequences
  FOR SELECT USING (true);

CREATE POLICY "Users can insert invoice sequences" ON invoice_sequences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update invoice sequences" ON invoice_sequences
  FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_next INTEGER;
BEGIN
  INSERT INTO invoice_sequences (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'VOUCHY-' || v_year::TEXT || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_invoice_number() TO anon, authenticated, service_role;
