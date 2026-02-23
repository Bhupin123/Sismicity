CREATE OR REPLACE PROCEDURE load_source()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Source (source)
    SELECT DISTINCT s.source
    FROM std_sismicity s
    WHERE s.source IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM Source so
          WHERE so.source = s.source
      );
END;
$$;
