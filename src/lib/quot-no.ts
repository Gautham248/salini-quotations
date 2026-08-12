import { db } from "./db";

/**
 * Generates the next quotation number scoped to a specific store.
 *
 * Uses a Prisma interactive transaction that opens in DEFERRED mode
 * (libsql adapter default), then immediately issues a raw SQL UPDATE
 * to atomically increment StoreQuotSequence.lastNumber. The UPDATE
 * is the first write and forces the DEFERRED transaction to upgrade
 * to a write lock, serializing concurrent calls for the SAME store.
 *
 * SQLite WAL + DEFERRED: the raw UPDATE is an atomic write that
 * acquires the writer lock. Concurrent transactions for the same
 * storeId block at this point until the first one commits.
 * Postgres: row-level lock on that StoreQuotSequence row.
 */
export async function nextQuotNo(storeId: number): Promise<string> {
  return await db.$transaction(async (tx) => {
    // Atomic increment via raw SQL — single write that acquires the
    // lock immediately. Uses $queryRaw (parameterized, not $queryRawUnsafe)
    // because the libsql adapter's Prisma-level increment may decompose
    // into SELECT+UPDATE under DEFERRED transactions.
    let num: number;
    let candidate: string;

    const rows = await tx.$queryRaw<Array<{ lastNumber: number }>>`
      UPDATE "StoreQuotSequence" SET "lastNumber" = "lastNumber" + 1 WHERE "storeId" = ${storeId} RETURNING "lastNumber"
    `;

    if (rows.length === 0) {
      throw new Error(`StoreQuotSequence not found for storeId=${storeId}`);
    }

    num = rows[0].lastNumber;
    candidate = String(num);

    // Collision check against pre-existing manual/imported quotNo values
    while (
      await tx.quotation.findUnique({
        where: { storeId_quotNo: { storeId, quotNo: candidate } },
        select: { id: true },
      })
    ) {
      num += 1;
      candidate = String(num);
    }

    await tx.$queryRaw`UPDATE "StoreQuotSequence" SET "lastNumber" = ${num} WHERE "storeId" = ${storeId}`;

    return candidate;
  });
}
