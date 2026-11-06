import { config } from "dotenv";

config();

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    "DATABASE_URL_TEST is not set. Add it to .env (see .env.example) and run npm run test:db:prepare",
  );
}

// Lib modules read DATABASE_URL via the Prisma singleton — point them at the test DB.
process.env.DATABASE_URL = testUrl;
