import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { wallPosters } from "@/lib/posters";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const posters = await wallPosters(8);

  return (
    <AuthShell mode="login" posters={posters}>
      <LoginForm />
    </AuthShell>
  );
}
