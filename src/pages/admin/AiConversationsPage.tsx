import { AppShell } from '../../components/AppShell';
import { ComingSoon } from './_ComingSoon';

export function AiConversationsPage() {
  return (
    <AppShell>
      <ComingSoon
        title="AI conversations"
        body="All client AI chat transcripts land here once ai_chat_messages re-ports on top of Supabase (Phase 7 of the migration)."
      />
    </AppShell>
  );
}
