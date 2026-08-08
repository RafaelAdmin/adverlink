/*
Enable Realtime in Supabase:
Go to Supabase Dashboard → Database → Replication
Enable replication for the 'messages' table

Run in Supabase SQL Editor:
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references ad_requests(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamp with time zone default now()
);
alter table messages enable row level security;

create table if not exists deal_chat_reads (
  user_id uuid references profiles(id) on delete cascade,
  deal_id uuid references ad_requests(id) on delete cascade,
  last_read_at timestamp with time zone not null default now(),
  primary key (user_id, deal_id)
);
alter table deal_chat_reads enable row level security;

alter table ad_requests add column if not exists creator_viewed_at timestamp with time zone;
alter table ad_requests add column if not exists advertiser_viewed_at timestamp with time zone;

create policy "Users manage own chat reads"
on deal_chat_reads for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
*/

import { useEffect, useRef, useState } from 'react'
import { markChatRead } from '@/lib/notifications'
import { createClient } from '@/lib/supabase'
import type { Message, Profile } from '@/lib/database.types'

interface DealChatProps {
  dealId: string
  currentUserId: string
  otherUserName?: string
}

const MAX_MESSAGE_LENGTH = 2000

export default function DealChat({ dealId, currentUserId }: DealChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true })

      setMessages(data || [])
      setLoading(false)

      const senderIds = [...new Set((data || []).map((m) => m.sender_id))]
      if (senderIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', senderIds)

        const profileMap: Record<string, Profile> = {}
        ;(profileData || []).forEach((p) => {
          profileMap[p.id] = p as Profile // TODO: strict type
        })
        setProfiles(profileMap)
      }
    }

    loadMessages()

    markChatRead(supabase, dealId, currentUserId)

    const channel = supabase
      .channel(`deal-chat-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `deal_id=eq.${dealId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          if (profile) {
            setProfiles((prev) => ({ ...prev, [profile.id]: profile as Profile })) // TODO: strict type
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dealId, currentUserId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const content = newMessage.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!content) return

    setSending(true)
    setNewMessage('')

    await supabase.from('messages').insert({
      deal_id: dealId,
      sender_id: currentUserId,
      content,
    })

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <i className="ti ti-message-circle" style={{ fontSize: '16px', color: 'var(--accent-primary, #9333ea)' }} />
        <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>Чат по заказу</span>
        <span
          style={{
            marginLeft: 'auto',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
          }}
        />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>онлайн</span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', paddingTop: '40px' }}>
            Загрузка...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i
              className="ti ti-message-off"
              style={{ fontSize: '32px', color: 'rgba(255,255,255,0.15)', display: 'block', marginBottom: '8px' }}
            />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>Начните диалог</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId
            const sender = msg.sender_id ? profiles[msg.sender_id] : undefined
            const senderName = sender?.full_name || sender?.username || 'Пользователь'

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isOwn ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {!isOwn && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary, #9333ea)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      senderName[0]?.toUpperCase()
                    )}
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isOwn && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', paddingLeft: '4px' }}>
                      {senderName}
                    </span>
                  )}

                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.08)',
                      color: 'white',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>

                  <span
                    style={{
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: '10px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter для отправки)"
          rows={1}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: 'white',
            fontSize: '13px',
            resize: 'none',
            outline: 'none',
            maxHeight: '100px',
            lineHeight: '1.5',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: newMessage.trim() ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <i
            className="ti ti-send"
            style={{
              fontSize: '18px',
              color: newMessage.trim() ? 'white' : 'rgba(255,255,255,0.2)',
            }}
          />
        </button>
      </div>
    </div>
  )
}
