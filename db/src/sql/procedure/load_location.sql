CREATE OR REPLACE PROCEDURE load_location()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Location (lat, lon, lat_offset, lon_offset)
    SELECT DISTINCT
           s.lat,
           s.lon,
           s.lat_offset,
           s.lon_offset
    FROM std_sismicity s
    WHERE s.lat IS NOT NULL
      AND s.lon IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM Location l
          WHERE l.lat = s.lat
            AND l.lon = s.lon
            AND l.lat_offset = s.lat_offset
            AND l.lon_offset = s.lon_offset
      );
END;
$$;
