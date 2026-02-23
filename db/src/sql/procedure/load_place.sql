CREATE OR REPLACE PROCEDURE load_place()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Place (place)
    SELECT DISTINCT s.place
    FROM std_sismicity s
    WHERE s.place IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM Place p
          WHERE p.place = s.place
      );
END;
$$;
