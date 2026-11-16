import { requireAdmin } from "@/lib/admin/auth";
import { Inbox, type InboxMessage } from "./inbox";

export default async function MessagesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, project_type, message, locale, read, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  return <Inbox messages={(data ?? []) as InboxMessage[]} />;
}
