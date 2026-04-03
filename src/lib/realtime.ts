import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type ChangeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}) => void;

export function subscribeToTable(
  table: string,
  callback: ChangeCallback,
  filter?: string
): RealtimeChannel {
  let channel = supabase.channel(`${table}-changes-${Date.now()}`);
  
  const config: Record<string, any> = {
    event: '*',
    schema: 'public',
    table,
  };
  
  if (filter) {
    config.filter = filter;
  }

  channel = channel.on(
    'postgres_changes' as any,
    config,
    callback
  ).subscribe();
  
  return channel;
}

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
