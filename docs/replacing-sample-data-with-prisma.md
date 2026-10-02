# Replacing `sample-data.ts` with real Prisma data

`src/db/sample-data.ts` is a hardcoded array of product objects used to seed
the database. It should never be imported by application code (pages,
components, actions) — it's a seed fixture, not a data source. This doc
describes the pattern already in place for the homepage and how to apply it
anywhere else that still reaches for the sample data directly.

## Current role of `sample-data.ts`

Its only legitimate consumer is `src/db/seed.ts`:

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sampleData from "./sample-data";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: sampleData.products });
}
main();
```

Run it with:

```bash
npm run db:seed
```

That writes the sample products into the `Product` table in Postgres.
After that, the database — not the TypeScript file — is the source of
truth. If you update `sample-data.ts`, it has no effect on a running app
until you re-run `npm run db:seed`.

## The replacement pattern: query Prisma in a Server Action

Instead of importing the array, add a function to
`src/lib/actions/product.actions.ts` (or a new `*.actions.ts` file for a
different domain) that queries Prisma, and call that from your page/component:

```ts
// src/lib/actions/product.actions.ts
'use server'
import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "@/lib/utils";

export async function getLatestProducts() {
  const data = await prisma.product.findMany({
    take: 4,
    orderBy: { createdAt: 'desc' },
  });
  return convertToPlainObject(data);
}
```

```tsx
// src/app/(root)/page.tsx
import { getLatestProducts } from '@/lib/actions/product.actions';

const Homepage = async () => {
  const latestProducts = await getLatestProducts();
  return <ProductList data={latestProducts} title="Newest Arrivals" limit={4} />;
};
```

This is already how the homepage works — it never imports
`sample-data.ts`; it calls `getLatestProducts()`, which reads from
Postgres via the shared `prisma` client (see
[`prisma-client-setup.md`](./prisma-client-setup.md) for why `prisma` is
imported from `@/db/prisma` and not constructed locally).

## Steps to migrate any remaining sample-data usage

1. **Find the read.** Search for `sample-data` or direct array access (e.g.
   `sampleData.products.find(...)`, `sampleData.products.filter(...)`) in
   the component/page you're changing.
2. **Write a Prisma query that does the same filtering/sorting.** Common
   examples:
   - Get one product by slug: `prisma.product.findUnique({ where: { slug } })`
   - Get products by category: `prisma.product.findMany({ where: { category } })`
   - Get featured products: `prisma.product.findMany({ where: { isFeatured: true } })`
3. **Put the query in a Server Action**, not directly in a Client Component.
   Add it next to `getLatestProducts` in `product.actions.ts` if it's about
   products, or create a new `*.actions.ts` file for a different model.
4. **Call the action from a Server Component** (an `async` page/layout, no
   `'use client'`) and pass the resolved data down as props — the same
   shape `ProductCard`/`ProductList` already expect, since they were built
   against the sample data's shape.
5. **Run `npx tsc --noEmit`** after wiring it up. Prisma's generated types
   won't exactly match the old sample data's hand-written shape in every
   field (e.g. `price`/`rating` are `Decimal` in the schema but come back as
   `string` from the client because of the `$extends` in
   `src/db/prisma.ts` — see that doc for why), so this catches mismatches
   before runtime.
6. **Delete the sample-data import** from the file you migrated once the
   Prisma-backed version is working — don't leave both in place.

## When to leave `sample-data.ts` alone

- It's fine, and expected, for `seed.ts` to keep importing it — seeding
  needs *some* source of initial rows, and this is it.
- If you need more or different seed data, edit `sample-data.ts` and
  re-run `npm run db:seed`; don't hand-write `INSERT` statements or add a
  second seed mechanism.
