CREATE TABLE Location (
    location_id SERIAL PRIMARY KEY,
    lat NUMERIC(10,7),
    lon NUMERIC(10,7),
    lat_offset NUMERIC(12,10),
    lon_offset NUMERIC(12,10)
);