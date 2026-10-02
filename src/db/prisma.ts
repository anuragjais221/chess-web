import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/client';
import ws from 'ws';
import net from 'node:net';

// Node's default 250ms per-address connect timeout (happy eyeballs) is too short to reach Neon
// from high-latency networks without IPv6, causing intermittent ETIMEDOUT on the WebSocket.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Sets up WebSocket connections, which enables Neon to use WebSocket communication.
neonConfig.webSocketConstructor = ws;
const connectionString = `${process.env.DATABASE_URL}`;

// Instantiates the Prisma adapter with the Neon connection string; it manages its own pool internally.
const adapter = new PrismaNeon({ connectionString });

// Extends the PrismaClient with a custom result transformer to convert the price and rating fields to strings.
export const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    product: {
      price: {
        compute(product) {
          return product.price.toString();
        },
      },
      rating: {
        compute(product) {
          return product.rating.toString();
        },
      },
    },
  },
});
