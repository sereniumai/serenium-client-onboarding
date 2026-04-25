import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
  userId: string;
  name: string;
  joinedAt: string;
}

/**
 * Joins a Supabase Realtime presence channel keyed by `channelKey` and
 * returns the OTHER users currently in the channel (the caller is excluded).
 *
 * Used to warn clients when someone else is editing the same module so we
 * don't silently overwrite each other on autosave.
 *
 * Pass `enabled: false` to skip joining (e.g. while we don't yet have a
 * userId or org).
 */
export function usePresence(args: {
  channelKey: string | null;
  userId: string | null;
  name: string;
  enabled?: boolean;
}): PresenceUser[] {
  const { channelKey, userId, name, enabled = true } = args;
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!enabled || !channelKey || !userId) {
      setOthers([]);
      return;
    }

    const channel = supabase.channel(channelKey, {
      config: { presence: { key: userId } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, Array<PresenceUser>>;
      const collected: PresenceUser[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === userId) continue;
        const first = metas[0];
        if (first) collected.push(first);
      }
      setOthers(collected);
    };

    channel.on('presence', { event: 'sync' }, sync);
    channel.on('presence', { event: 'join' }, sync);
    channel.on('presence', { event: 'leave' }, sync);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          name,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [channelKey, userId, name, enabled]);

  return others;
}
