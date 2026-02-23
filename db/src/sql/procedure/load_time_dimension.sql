CREATE OR REPLACE PROCEDURE load_time_dimension()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Time_Dimension (
        year,
        month_sin,
        month_cos,
        hour_sin,
        hour_cos
    )
    SELECT DISTINCT
           s.year,
           s.month_sin,
           s.month_cos,
           s.hour_sin,
           s.hour_cos
    FROM std_sismicity s
    WHERE NOT EXISTS (
        SELECT 1
        FROM Time_Dimension t
        WHERE t.year = s.year
          AND t.month_sin = s.month_sin
          AND t.month_cos = s.month_cos
          AND t.hour_sin = s.hour_sin
          AND t.hour_cos = s.hour_cos
      );
END;
$$;
