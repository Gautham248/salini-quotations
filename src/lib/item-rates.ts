import { db } from "./db";

/**
 * Single shared helper for resolving the effective rate of a master item
 * for a given store. Uses ItemStoreRate override if one exists for the
 * (masterItemId, storeId) pair; otherwise falls back to MasterItem.rate.
 */
export async function getEffectiveRate(masterItemId: number, storeId: number): Promise<number> {
  const override = await db.itemStoreRate.findUnique({
    where: { masterItemId_storeId: { masterItemId, storeId } },
    select: { rate: true },
  });
  if (override) return override.rate;

  const item = await db.masterItem.findUniqueOrThrow({
    where: { id: masterItemId },
    select: { rate: true },
  });
  return item.rate;
}
