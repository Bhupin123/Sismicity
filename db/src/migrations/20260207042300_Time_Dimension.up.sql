CREATE TABLE Time_Dimension(
    time_id SERIAL PRIMARY KEY,
    year INT,
    month_sin NUMERIC (18,16),
    month_cos NUMERIC (18,16),
    hour_sin NUMERIC(18,16),
    hour_cos NUMERIC(18,16)
);