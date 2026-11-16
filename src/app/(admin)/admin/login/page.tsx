import { AuthShell } from "@/components/admin/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Entrar no painel">
      <LoginForm />
    </AuthShell>
  );
}
