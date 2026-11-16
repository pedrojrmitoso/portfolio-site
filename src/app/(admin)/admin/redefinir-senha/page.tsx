import { AuthShell } from "@/components/admin/auth-shell";
import { ResetPassword } from "./reset-password";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Definir nova senha">
      <ResetPassword />
    </AuthShell>
  );
}
