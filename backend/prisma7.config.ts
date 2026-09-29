import * as dotenv from 'dotenv';
dotenv.config();

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // url: env('DATABASE_URL'),
    url: process.env.DATABASE_URL!,
  },
});
