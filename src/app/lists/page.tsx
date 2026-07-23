import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { listItems, listMembers, lists } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import NewListForm from "@/components/NewListForm";

export const metadata = { title: "Lists" };

export default async function ListsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await db
    .select({ listId: listMembers.listId, role: listMembers.role })
    .from(listMembers)
    .where(eq(listMembers.userId, user.id));
  const roleById = new Map(memberships.map((m) => [m.listId, m.role]));

  const myLists = memberships.length
    ? await db
        .select({
          id: lists.id,
          title: lists.title,
          description: lists.description,
          count: sql<number>`(select count(*)::int from ${listItems} where ${listItems.listId} = ${lists.id})`,
        })
        .from(lists)
        .where(inArray(lists.id, memberships.map((m) => m.listId)))
        .orderBy(desc(lists.createdAt))
    : [];

  return (
    <div className="max-w-xl">
      <h1 className="display mb-6 text-2xl">Lists</h1>
      <NewListForm />
      {myLists.length === 0 ? (
        <p className="mt-6 text-ash">
          No lists yet. Make one, or save a pick from “What should we watch?” — that starts a
          shared list automatically.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-seam border-y border-seam">
          {myLists.map((l) => (
            <li key={l.id} className="py-3">
              <Link href={`/lists/${l.id}`} className="text-paper hover:underline">
                {l.title}
              </Link>
              <span className="num ml-2 text-xs text-ash">
                {l.count} {l.count === 1 ? "film" : "films"} · {roleById.get(l.id)}
              </span>
              {l.description && <p className="mt-0.5 text-sm text-ash">{l.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
