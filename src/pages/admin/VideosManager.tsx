import { AppShell } from '../../components/AppShell';
import { ComingSoon } from './_ComingSoon';

export function VideosManager() {
  return (
    <AppShell>
      <ComingSoon
        title="Step videos"
        body="Per-step Loom / YouTube videos will be managed here once step_videos re-ports on top of Supabase (Phase 7 of the migration)."
      />
    </AppShell>
  );
}
