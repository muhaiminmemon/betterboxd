import AuthShell from "@/components/AuthShell";
import SignupForm from "@/components/SignupForm";
import { wallPosters } from "@/lib/posters";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const posters = await wallPosters(8);

  return (
    <AuthShell mode="signup" posters={posters}>
      <SignupForm />
    </AuthShell>
  );
}
