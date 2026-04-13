CREATE OR REPLACE PROCEDURE transform_sismicity()
LANGUAGE plpgsql AS
$$
BEGIN
  INSERT INTO std_sismicity (
    dt, mag, depth, lat, lon, place, source,
    is_major, year, rolling_count_7d, rolling_count_30d,
    rolling_mean_mag_30d, days_since_last_major,
    depth_log, lat_offset, lon_offset,
    month_sin, month_cos, hour_sin, hour_cos
  )
  SELECT
    dt::timestamptz,
    mag::numeric,
    depth::numeric,
    lat::numeric,
    lon::numeric,
    place,
    source,
    (is_major::int = 1),
    year::integer,
    rolling_count_7d::numeric,
    rolling_count_30d::numeric,
    rolling_mean_mag_30d::numeric,
    days_since_last_major::numeric,
    depth_log::numeric,
    lat_offset::numeric,
    lon_offset::numeric,
    month_sin::numeric,
    month_cos::numeric,
    hour_sin::numeric,
    hour_cos::numeric
  FROM sismicity;
END;
$$;
