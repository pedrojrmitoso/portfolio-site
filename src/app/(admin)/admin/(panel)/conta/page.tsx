import { requireAdmin } from "@/lib/admin/auth";
import { Card } from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/page-header";
import { PasswordForm } from "@/components/admin/password-form";
import { MfaSettings } from "@/components/admin/mfa-settings";

export default async function AccountPage() {
  const { email } = await requireAdmin();

  return (
    <>
      <PageHeader
        title="Conta"
        description={
          <>
            Logado como <span className="font-mono text-fg">{email}</span>
          </>
        }
      />
      <div className="space-y-6">
        <Card title="Verificação em duas etapas">
          <MfaSettings />
        </Card>
        <Card title="Trocar senha">
          <div className="max-w-sm">
            <PasswordForm signOutOthers />
          </div>
        </Card>
      </div>
    </>
  );
}
