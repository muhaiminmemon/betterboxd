import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listMembers } from "@/db/schema";

export type ListRole = "owner" | "editor" | "viewer";

export async function roleIn(listId: string, userId: string): Promise<ListRole | null> {
  const row = (
    await db
      .select({ role: listMembers.role })
      .from(listMembers)
      .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)))
      .limit(1)
  )[0];
  return (row?.role as ListRole) ?? null;
}

export function canEdit(role: ListRole | null): boolean {
  return role === "owner" || role === "editor";
}
