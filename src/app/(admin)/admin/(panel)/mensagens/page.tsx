import { requireAdmin } from "@/lib/admin/auth";
import { Inbox, type InboxMessage } from "./inbox";

const COLS = "id, name, email, project_type, message, locale, read, created_at, deleted_at";

export default async function MessagesPage() {
  const { supabase } = await requireAdmin();
  const [inbox, trash] = await Promise.all([
    supabase
      .from("contact_messages")
      .select(COLS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("contact_messages")
      .select(COLS)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <Inbox messages={(inbox.data ?? []) as InboxMessage[]} trash={(trash.data ?? []) as InboxMessage[]} />
  );
}
