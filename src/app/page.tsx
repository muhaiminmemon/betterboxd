import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/library");

  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="display text-4xl font-medium leading-tight tracking-tight">
        Rate films properly.
      </h1>
      <p className="mt-4 max-w-lg text-lg text-ash">
        A film diary on a 1.0 to 10.0 scale, in tenths. Forty films don&apos;t share four stars
        here. <span className="num text-paper">8.7</span> and{" "}
        <span className="num text-paper">8.2</span> are different opinions.
      </p>
      <ul className="mt-8 space-y-3 text-ash">
        <li>
          <span className="text-paper">Bring your Letterboxd history.</span> Import your diary,
          preview every row, fix mismatches, undo anytime.
        </li>
        <li>
          <span className="text-paper">Keep your history honest.</span> Rewatches never overwrite
          old ratings, so you can watch your taste change over the years.
        </li>
        <li>
          <span className="text-paper">Your data stays yours.</span> Full export, free forever.
        </li>
      </ul>
      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/signup"
          className="rounded-card bg-paper px-5 py-2 font-medium text-carbon hover:bg-white"
        >
          Create account
        </Link>
        <Link href="/login" className="text-ash hover:text-paper">
          Sign in
        </Link>
      </div>
    </div>
  );
}
