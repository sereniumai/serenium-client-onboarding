import { LATEST_CHANGELOG_DATE } from '../config/changelog';

const LAST_SEEN_KEY = 'serenium.changelog.lastSeen';

export function markChangelogSeen() {
  try { localStorage.setItem(LAST_SEEN_KEY, LATEST_CHANGELOG_DATE); } catch { /* storage blocked */ }
}

export function hasUnreadChangelog(): boolean {
  try {
    const seen = localStorage.getItem(LAST_SEEN_KEY);
    return seen !== LATEST_CHANGELOG_DATE;
  } catch {
    return false;
  }
}
