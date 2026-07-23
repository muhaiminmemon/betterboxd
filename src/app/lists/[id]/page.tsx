import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { films, listItems, listMembers, lists, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { roleIn, type ListRole } from "@/lib/lists";
import ListDetail from "@/components/ListDetail";

export default async function ListPage(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const list = (await db.select().from(lists).where(eq(lists.id, id)).limit(1))[0];
  if (!list) notFound();
  const role = await roleIn(id, user.id);
  if (!role) notFound();

  const items = await db
    .select({
      filmId: listItems.filmId,
      title: films.title,
      year: films.year,
      slug: films.slug,
      posterPath: films.posterPath,
      director: films.director,
    })
    .from(listItems)
    .innerJoin(films, eq(films.id, listItems.filmId))
    .where(eq(listItems.listId, id))
    .orderBy(asc(listItems.createdAt));

  const members = await db
    .select({
      userId: listMembers.userId,
      role: listMembers.role,
      username: users.username,
      displayName: users.displayName,
    })
    .from(listMembers)
    .innerJoin(users, eq(users.id, listMembers.userId))
    .where(eq(listMembers.listId, id));

  return (
    <ListDetail
      list={{ id: list.id, title: list.title, description: list.description }}
      items={items}
      members={members}
      myRole={role as ListRole}
      myUserId={user.id}
    />
  );
}
