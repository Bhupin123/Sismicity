require("dotenv").config({ path: "../.env" });
const { Client } = require("pg");

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

const getConnection = () => new Client(dbConfig);

const resolve = async () => [
  {
    client: "postgres",
    connection: dbConfig,
  },
];

module.exports = { getConnection, resolve };