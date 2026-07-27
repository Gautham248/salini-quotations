import { db } from "./db";

export async function nextQuotNo(): Promise<string> {
  const maxQuot = await db.quotation.findFirst({
    orderBy: { id: "desc" },
    select: { id: true, quotNo: true },
  });

  let num = (maxQuot?.id || 0) + 1;
  let candidate = String(num);

  while (await db.quotation.findUnique({ where: { quotNo: candidate } })) {
    num += 1;
    candidate = String(num);
  }

  return candidate;
}
