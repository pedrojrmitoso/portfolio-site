import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { supabase } = await requireAdmin();
  const { data: profile } = await supabase.from("profile").select("*").eq("id", 1).maybeSingle();

  return (
    <>
      <PageHeader title="Perfil" description="Hero, bio e currículo. Textos em PT, EN e FR." />
      <ProfileForm profile={profile} />
    </>
  );
}
