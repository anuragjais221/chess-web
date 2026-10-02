# Prisma client setup (`src/db/prisma.ts`)

This project is on Prisma `7.10.0` with the `prisma-client` generator
(`prisma/schema.prisma`), which behaves differently from the classic
`prisma-client-js` generator most guides assume. This doc explains what
`src/db/prisma.ts` does and why each piece is there, so the reasoning isn't
lost the next time someone touches it.

## Why a custom output path changes everything

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Because `output` is set, Prisma generates the client into
`src/generated/prisma` instead of `node_modules/@prisma/client`. Two
consequences:

- `PrismaClient` must be imported from `@/generated/prisma/client`, **not**
  from `@prisma/client`. The `@prisma/client` package is still installed,
  but it now only provides shared runtime code the generated client depends
  on — its own root export just tries to re-export from the classic default
  location (`.prisma/client/default`), which is never populated here.
- `src/generated/prisma` is generated code. It's rebuilt on every
  `npx prisma generate` (which also runs automatically via the
  `postinstall` npm script) and is gitignored — never hand-edit it.

## Why a driver adapter is required

Prisma 7's `prisma-client` generator dropped the bundled Rust query-engine
binary that older Prisma versions used to talk to the database. Instead,
`PrismaClient` now requires an explicit **driver adapter** — a JS wrapper
around a normal database driver that Prisma calls to actually execute
queries. This isn't a preview feature or an opt-in; the constructor requires
it.

This project connects to Neon Postgres, so it uses `@prisma/adapter-neon`
(`PrismaNeon`), which talks to Neon over WebSocket/HTTP rather than a raw
TCP connection. This matters specifically for serverless/edge deploy targets
(e.g. Vercel functions): those environments spin up many short-lived
instances that don't hold plain TCP connections well, and Neon's driver is
built for that pattern.

`@prisma/adapter-pg` (plain TCP via `pg`) is also installed and used in
`src/db/seed.ts`. It's kept as a working fallback for local/CLI scripts,
since it was verified to work in sandboxed dev environments where outbound
WebSocket traffic to Neon's proxy on port 443 was blocked but plain TCP on
port 5432 was not. Application code should use the Neon adapter via
`src/db/prisma.ts`; `seed.ts` is a one-off script and can keep using `pg`.

## What each line in `prisma.ts` does

```ts
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/client';
import ws from 'ws';

// Sets up WebSocket connections, which enables Neon to use WebSocket communication.
neonConfig.webSocketConstructor = ws;
const connectionString = `${process.env.DATABASE_URL}`;

// Instantiates the Prisma adapter with the Neon connection string; it manages its own pool internally.
const adapter = new PrismaNeon({ connectionString });

export const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    product: {
      price: { compute(product) { return product.price.toString(); } },
      rating: { compute(product) { return product.rating.toString(); } },
    },
  },
});
```

- **`neonConfig.webSocketConstructor = ws`** — Node doesn't have a built-in
  `WebSocket` global (browsers and edge runtimes do), so the Neon driver is
  told to use the `ws` package for its WebSocket connections when running in
  Node.
- **`new PrismaNeon({ connectionString })`** — takes a Neon *pool config
  object*, not a `Pool` instance. An earlier version of this file
  constructed a `Pool` manually and passed that instance in, which is a type
  mismatch against `PrismaNeon`'s constructor (`constructor(config:
  neon.PoolConfig, options?)`). `PrismaNeon` creates and manages its own
  pool internally from the config it's given — don't construct a separate
  `Pool` unless you need to share it with other, non-Prisma code.
- **`export const prisma = ...`** — a single module-level instance, imported
  everywhere queries are needed (e.g.
  `src/lib/actions/product.actions.ts`). Prisma clients hold a connection
  pool; constructing a new one per request/action (`new PrismaClient()`
  inside a function) exhausts database connections under load. Always
  import this shared `prisma` export instead of instantiating your own.
- **`.$extends({ result: { product: { price, rating } } })`** — Postgres
  `Decimal` columns come back from Prisma as `Decimal` objects, which don't
  serialize cleanly (e.g. across the server/client boundary in Next.js
  Server Components, or through `JSON.stringify`). This extension makes
  `product.price` and `product.rating` come back as plain strings on every
  query automatically, so callers don't have to remember to convert them.

## Related fix: `src/lib/actions/product.actions.ts`

This file used to do:

```ts
import { PrismaClient } from "@prisma/client";
// ...
const prisma = new PrismaClient();
```

which had the same wrong import path as above, plus created a fresh client
(and connection pool) on every call. It now imports the shared singleton
instead:

```ts
import { prisma } from "@/db/prisma";
```

Any new server action or route handler that needs the database should do
the same — import `prisma` from `@/db/prisma`, never construct its own
`PrismaClient`.
