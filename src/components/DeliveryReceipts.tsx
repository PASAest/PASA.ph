import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** While the app is open, marks messages sent to me as delivered: on start and whenever a new one arrives. */
export function DeliveryReceipts() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const mark = () => supabase.rpc('mark_messages_delivered').then();
    mark();
    // Realtime only sends messages from my own conversations.
    const channel = supabase
      .channel(`delivery-${userId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if ((payload.new as { sender_id: string }).sender_id !== userId) mark();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
