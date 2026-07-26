import { db } from "./db";
export async function nextQuotNo(): Promise<string> {
  const seq = await db.quotSequence.create({ data: { dummy: 0 } });
  return String(seq.id);
}
