import { AppShell } from '../../components/AppShell';
import { ComingSoon } from './_ComingSoon';

export function WelcomeVideoManager() {
  return (
    <AppShell>
      <ComingSoon
        title="Welcome video"
        body="Upload a welcome video shown to clients on first login. Re-ports on top of Supabase Storage + welcome_video table (Phase 7 of the migration)."
      />
    </AppShell>
  );
}
