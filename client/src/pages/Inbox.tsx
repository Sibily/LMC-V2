import React, { useState, useEffect, useRef } from 'react';
import { V, R, P, B, IB, Av, inp, card, G, MU, BD, TODAY, Modal, F } from '../components/Common';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { ChatSummary, ChatMessage, ChatAttachment } from '../types';
import { api } from '../api/client';
import { getSocket } from '../socket';

const EMO = ['😀', '😂', '😍', '🥰', '😊', '😉', '😎', '🤔', '😅', '😢', '😭', '😡', '👍', '👎', '👏', '🙏', '💪', '🎉', '🔥', '❤️', '💯', '✅', '❌', '⭐', '📞', '📎', '📅', '⏰', '🤝', '👀', '🙌', '😴'];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const Inbox: React.FC<{
  team: any[];
  initialBroadcast?: boolean;
  selectedChatId?: string | null;
  onSelectChat?: (chatId: string | null) => void;
}> = ({ team, initialBroadcast, selectedChatId: propChatId, onSelectChat }) => {
  const { user, toast } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(propChatId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tab, setTab] = useState<'all' | 'chats' | 'groups'>('all');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<'Message' | 'Task' | 'Reminder'>('Message');
  const [taskFor, setTaskFor] = useState('');
  const [dueDate, setDueDate] = useState(TODAY);
  const [dueTime, setDueTime] = useState('09:00');
  const [plus, setPlus] = useState(false);
  const [emo, setEmo] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message Info Modal (Seen-by popover)
  const [msgInfoModal, setMsgInfoModal] = useState<ChatMessage | null>(null);

  // Group modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  // Broadcast modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(!!initialBroadcast);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastKind, setBroadcastKind] = useState<'Message' | 'Task' | 'Reminder'>('Message');

  const endRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (propChatId !== undefined) {
      setSelectedChatId(propChatId);
    }
  }, [propChatId]);

  const selectChat = (chatId: string | null) => {
    setSelectedChatId(chatId);
    onSelectChat?.(chatId);
  };

  const loadChats = async () => {
    try {
      const res = await api.chat.getChats();
      setChats(res);
    } catch (e) {}
  };

  const loadMessages = async (chatId: string) => {
    try {
      const msgs = await api.chat.getMessages(chatId);
      setMessages(msgs);
    } catch (e) {}
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
      api.chat.markRead(selectedChatId).catch(() => {});
      const socket = getSocket();
      socket.emit('join_chat', selectedChatId);

      const handleNewMessage = (msg: ChatMessage) => {
        if (msg.chatId === selectedChatId) {
          setMessages((prev) => [...prev, msg]);
          if (msg.fromUserId !== user?.id) {
            api.chat.markRead(selectedChatId).catch(() => {});
          }
        }
        loadChats();
      };

      const handleMessagesSeen = (payload: { chatId: string; seenByUserId: string; messageIds: string[]; seenAt: string }) => {
        if (payload.chatId === selectedChatId) {
          setMessages((prev) =>
            prev.map((m) => {
              if (payload.messageIds.includes(m.id)) {
                return {
                  ...m,
                  seenAt: payload.seenAt,
                  seenByUserIds: Array.from(new Set([...(m.seenByUserIds || []), payload.seenByUserId])),
                };
              }
              return m;
            })
          );
        }
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === payload.chatId && c.lastMessage && payload.messageIds.includes(c.lastMessage.id)) {
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  seenAt: payload.seenAt,
                  seenByUserIds: Array.from(new Set([...(c.lastMessage.seenByUserIds || []), payload.seenByUserId])),
                },
              };
            }
            return c;
          })
        );
      };

      socket.on('new_message', handleNewMessage);
      socket.on('messages_seen', handleMessagesSeen);
      return () => {
        socket.emit('leave_chat', selectedChatId);
        socket.off('new_message', handleNewMessage);
        socket.off('messages_seen', handleMessagesSeen);
      };
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages.length]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await api.chat.uploadAttachment(file);
        setAttachments((prev) => [...prev, res]);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || !selectedChat) return;
    if (selectedChat.type === 'announcement' && user?.role !== 'management') {
      toast('Only management can post announcements');
      return;
    }

    try {
      await api.chat.sendMessage({
        chatId: selectedChat.id,
        text,
        kind,
        toUserId: kind !== 'Message' ? taskFor || selectedChat.targetUserId : undefined,
        due: kind !== 'Message' ? `${dueDate} ${dueTime}` : undefined,
        attachments,
      });
      setDraft('');
      setAttachments([]);
      setKind('Message');
      setPlus(false);
      setEmo(false);
    } catch (e: any) {
      toast(e.message || 'Failed to send message');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !groupMembers.length) return;
    try {
      const group: any = await api.chat.createGroup(groupName.trim(), groupMembers);
      setShowGroupModal(false);
      setGroupName('');
      setGroupMembers([]);
      await loadChats();
      selectChat(`group:${group.id}`);
      toast('Group created');
    } catch (e: any) {
      toast('Failed to create group');
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim() || !broadcastRecipients.length) {
      toast('Select recipients and enter a message');
      return;
    }
    try {
      await api.chat.broadcast({
        text: broadcastText.trim(),
        recipientIds: broadcastRecipients,
        kind: broadcastKind,
        due: broadcastKind !== 'Message' ? `${dueDate} ${dueTime}` : undefined,
      });
      setShowBroadcastModal(false);
      setBroadcastText('');
      setBroadcastRecipients([]);
      loadChats();
      toast('Broadcast sent');
    } catch (e: any) {
      toast('Broadcast failed');
    }
  };

  const filteredChats = chats.filter((c) => {
    if (tab === 'chats' && c.type !== 'colleague') return false;
    if (tab === 'groups' && c.type !== 'group') return false;
    if (q.trim() && !c.name.toLowerCase().includes(q.toLowerCase().trim())) return false;
    return true;
  });

  const pinned = filteredChats.filter((c) => c.pinned);
  const unpinned = filteredChats.filter((c) => !c.pinned);

  // Chat conversation pane
  const convo = selectedChat && (
    <div
      style={
        isWide
          ? {
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              background: '#efeae2',
              position: 'relative',
            }
          : {
              position: 'fixed',
              inset: 0,
              zIndex: 66,
              display: 'flex',
              flexDirection: 'column',
              background: '#efeae2',
            }
      }
    >
      {/* Convo Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid ' + BD,
          flexShrink: 0,
        }}
      >
        {!isWide && (
          <P onPress={() => selectChat(null)} style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <I n="back" s={22} />
          </P>
        )}
        <Av n={selectedChat.name} s={42} url={selectedChat.avatarUrl} />
        <V style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <b style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedChat.name}</b>
          <span style={{ fontSize: 12, color: MU }}>
            {selectedChat.type === 'announcement'
              ? '📢 Company-wide updates'
              : selectedChat.type === 'group'
              ? `👥 ${selectedChat.members?.length || 0} members`
              : 'Direct message'}
          </span>
        </V>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.map((m) => {
          const isMine = m.fromUserId === user?.id;
          const bg = isMine ? '#d9fdd3' : '#fff';
          const time = new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const isSeen = m.seenAt || (m.seenByUserIds && m.seenByUserIds.some((uid) => uid !== user?.id));

          return (
            <div
              key={m.id}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: isWide ? '68%' : '84%',
                background: bg,
                borderRadius: 14,
                padding: '8px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                border: isMine ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              {!isMine && selectedChat.type === 'group' && (
                <div style={{ fontSize: 12, fontWeight: 700, color: G, marginBottom: 3 }}>
                  {m.fromUser?.name || 'Colleague'}
                </div>
              )}
              {m.isBroadcast && <div style={{ fontSize: 11, color: '#667781', marginBottom: 2 }}>📢 Broadcast</div>}
              {m.kind !== 'Message' && (
                <div style={{ fontSize: 12, fontWeight: 700, color: m.kind === 'Task' ? '#7c3aed' : '#db2777', marginBottom: 4 }}>
                  {m.kind === 'Task' ? '📋 Task' : '⏰ Reminder'} {m.due ? `· Due ${m.due}` : ''}
                </div>
              )}

              {/* Attachments rendering */}
              {m.attachments && m.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: m.text ? 6 : 2 }}>
                  {m.attachments.map((att, idx) => {
                    const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.url);
                    if (isImg) {
                      return (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}
                        >
                          <img
                            src={att.url}
                            alt={att.name || 'Attachment'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 220,
                              borderRadius: 8,
                              display: 'block',
                              objectFit: 'cover',
                            }}
                          />
                        </a>
                      );
                    }
                    return (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          background: isMine ? 'rgba(0,0,0,0.05)' : '#f1f5f9',
                          borderRadius: 8,
                          textDecoration: 'none',
                          color: '#0f172a',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 6, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                          <I n="file" s={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                          {att.size ? <span style={{ fontSize: 11, color: MU }}>{formatFileSize(att.size)}</span> : null}
                        </div>
                        <I n="download" s={16} style={{ color: MU }} />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Text content */}
              {m.text && (
                <span style={{ fontSize: 14.5, whiteSpace: 'pre-wrap', lineHeight: '20px', color: '#0f172a' }}>
                  {m.text}
                </span>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: '#667781' }}>{time}</span>
                {isMine && (
                  <button
                    onClick={() => setMsgInfoModal(m)}
                    title="Click to view read details"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: isSeen ? '#53bdeb' : '#94a3b8',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <I n="checks" s={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Attachments preview strip above input bar */}
      {attachments.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fff',
            borderTop: '1px solid ' + BD,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            alignItems: 'center',
          }}
        >
          {attachments.map((att, idx) => {
            const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.url);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f1f5f9',
                  padding: '4px 8px',
                  borderRadius: 8,
                  border: '1px solid ' + BD,
                  fontSize: 12,
                }}
              >
                {isImg ? (
                  <img src={att.url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                ) : (
                  <I n="file" s={16} style={{ color: '#64748b' }} />
                )}
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {att.name}
                </span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  style={{
                    border: 'none',
                    background: '#cbd5e1',
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          {uploading && <span style={{ fontSize: 12, color: MU, fontStyle: 'italic' }}>Uploading…</span>}
        </div>
      )}

      {/* Input Bar */}
      {selectedChat.type === 'announcement' && user?.role !== 'management' ? (
        <div style={{ background: '#f0f2f5', padding: '12px', textAlign: 'center', color: MU, fontSize: 13 }}>
          📢 Only management can post announcements
        </div>
      ) : (
        <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid ' + BD, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {plus && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Message', 'Task', 'Reminder'] as const).map((k) => (
                <P
                  key={k}
                  onPress={() => setKind(k)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontWeight: 700,
                    fontSize: 12,
                    border: '1px solid ' + (kind === k ? G : BD),
                    background: kind === k ? '#dcfce7' : '#fff',
                    color: kind === k ? '#15803d' : MU,
                  }}
                >
                  {k === 'Task' ? '📋 Task' : k === 'Reminder' ? '⏰ Reminder' : 'Message'}
                </P>
              ))}
            </div>
          )}

          {kind !== 'Message' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" style={inp} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input type="time" style={inp} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          )}

          {emo && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
              {EMO.map((e) => (
                <P key={e} onPress={() => setDraft(draft + e)} style={{ fontSize: 22, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                  {e}
                </P>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 24, padding: '2px 8px' }}>
              {/* Paperclip attachment button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file or photo"
                disabled={uploading}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 8,
                  cursor: 'pointer',
                  color: attachments.length > 0 ? G : MU,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                }}
              >
                <I n="clip" s={20} />
              </button>

              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setEmo(!emo)}
                title="Insert emoji"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 8,
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                }}
              >
                😀
              </button>

              <textarea
                rows={1}
                placeholder={kind === 'Message' ? 'Write a message…' : `Describe ${kind.toLowerCase()}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  border: 0,
                  outline: 'none',
                  background: 'transparent',
                  resize: 'none',
                  padding: '10px 4px',
                  fontSize: 14.5,
                  maxHeight: 100,
                }}
              />

              <button
                type="button"
                onClick={() => setPlus(!plus)}
                title="More actions"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 8,
                  cursor: 'pointer',
                  color: plus ? G : MU,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                }}
              >
                <I n="plus" s={20} />
              </button>
            </div>

            <P
              onPress={sendMessage}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                background: G,
                color: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: draft.trim() || attachments.length > 0 ? 1 : 0.45,
                boxShadow: '0 2px 8px rgba(31,203,102,0.25)',
              }}
            >
              <I n="arrow" s={18} />
            </P>
          </div>
        </div>
      )}
    </div>
  );

  // Chat conversation list pane
  const listPane = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isWide ? '100%' : 'auto',
        background: '#fff',
      }}
    >
      {/* Top action row */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + BD, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <b style={{ fontSize: 20, color: '#0f172a' }}>Chats</b>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowBroadcastModal(true)}
              title="Broadcast message to team"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid ' + BD,
                background: '#fff',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
            >
              <I n="mega" s={14} /> Broadcast
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              title="Create new group chat"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                background: G,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
            >
              <I n="users" s={14} /> Group
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          style={{ ...inp, fontSize: 13, padding: '7px 10px' }}
          placeholder="Search chats…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'chats', 'groups'] as const).map((k) => (
            <P
              key={k}
              onPress={() => setTab(k)}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontWeight: 600,
                fontSize: 12,
                border: '1px solid ' + (tab === k ? G : BD),
                background: tab === k ? '#dcfce7' : '#fff',
                color: tab === k ? '#15803d' : MU,
              }}
            >
              {k === 'all' ? 'All' : k === 'chats' ? 'Direct' : 'Groups'}
            </P>
          ))}
        </div>
      </div>

      {/* Chats list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {[...pinned, ...unpinned].map((c) => {
          const on = selectedChatId === c.id;
          return (
            <P
              key={c.id}
              onPress={() => selectChat(c.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom: '1px solid #f1f5f9',
                background: on ? '#f0fdf4' : c.pinned ? '#f8fafc' : '#fff',
                borderLeft: on ? '3.5px solid ' + G : '3.5px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
            >
              <Av n={c.name} s={42} url={c.avatarUrl} />
              <V style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>{c.name}</b>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {c.lastMessage && (
                      <span style={{ fontSize: 11, color: MU, flexShrink: 0 }}>
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    {c.pinned && <span style={{ fontSize: 11, color: MU }}>📌</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  {c.lastMessage && c.lastMessage.fromUserId === user?.id && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color:
                          c.lastMessage.seenAt ||
                          (c.lastMessage.seenByUserIds && c.lastMessage.seenByUserIds.some((uid) => uid !== user?.id))
                            ? '#53bdeb'
                            : '#94a3b8',
                        flexShrink: 0,
                      }}
                    >
                      <I n="checks" s={14} />
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, color: MU, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {c.lastMessage ? c.lastMessage.text : 'No messages yet'}
                  </span>
                </div>
              </V>
            </P>
          );
        })}
        {!filteredChats.length && (
          <span style={{ display: 'block', color: MU, padding: '28px', textAlign: 'center', fontSize: 13 }}>
            No conversations found.
          </span>
        )}
      </div>
    </div>
  );

  // Desktop Empty Convo Pane
  const emptyConvo = (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafbfc',
        padding: 32,
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: '#ecfdf5',
          color: G,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(31,203,102,0.15)',
        }}
      >
        <I n="chat" s={30} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 320 }}>
        <b style={{ fontSize: 17, color: '#0f172a' }}>Your Conversations</b>
        <span style={{ fontSize: 13, color: MU, lineHeight: '18px' }}>
          Select a chat from the left to start messaging, or create a new group or broadcast.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <B onPress={() => setShowBroadcastModal(true)} style={{ padding: '8px 14px' }}>
          <I n="mega" s={16} /> Broadcast
        </B>
        <B k={1} onPress={() => setShowGroupModal(true)} style={{ padding: '8px 14px' }}>
          <I n="users" s={16} /> New Group
        </B>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {isWide ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px minmax(0, 1fr)',
            height: 'calc(100vh - 125px)',
            minHeight: 560,
            background: '#fff',
            borderRadius: 20,
            border: '1px solid ' + BD,
            boxShadow: '0 4px 20px -2px rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          {listPane}
          {selectedChat ? convo : emptyConvo}
        </div>
      ) : selectedChat ? (
        convo
      ) : (
        listPane
      )}

      {/* Message Info / Seen-by Modal */}
      {msgInfoModal && (
        <Modal title="Message Info" close={() => setMsgInfoModal(null)}>
          <V style={{ gap: 14 }}>
            {/* Snippet preview */}
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid ' + BD }}>
              {msgInfoModal.text && (
                <span style={{ fontSize: 13.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: '18px' }}>
                  {msgInfoModal.text}
                </span>
              )}
              {msgInfoModal.attachments && msgInfoModal.attachments.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: MU, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <I n="clip" s={14} />
                  <span>{msgInfoModal.attachments.length} attachment(s)</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MU }}>
              <I n="clock" s={14} />
              <span>
                Sent: {new Date(msgInfoModal.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                {new Date(msgInfoModal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>

            <div style={{ borderTop: '1px solid ' + BD, paddingTop: 10 }}>
              {selectedChat?.type === 'group' || msgInfoModal.isBroadcast ? (
                <V style={{ gap: 12 }}>
                  <V style={{ gap: 6 }}>
                    <b style={{ fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <I n="checks" s={16} style={{ color: '#53bdeb' }} />
                      Read by (
                      {(() => {
                        const seenIds = msgInfoModal.seenByUserIds || [];
                        return team.filter((u) => seenIds.includes(u.id) && u.id !== user?.id).length;
                      })()}
                      )
                    </b>
                    <V style={{ gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                      {team
                        .filter((u) => (msgInfoModal.seenByUserIds || []).includes(u.id) && u.id !== user?.id)
                        .map((u) => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                            <Av n={u.name} s={24} url={u.avatarUrl} />
                            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.name}</span>
                            <span style={{ fontSize: 11, color: '#53bdeb', fontWeight: 600 }}>Read</span>
                          </div>
                        ))}
                      {!(msgInfoModal.seenByUserIds || []).some((id) => id !== user?.id) && (
                        <span style={{ fontSize: 12, color: MU, fontStyle: 'italic', padding: '4px 6px' }}>
                          No readers yet
                        </span>
                      )}
                    </V>
                  </V>

                  <V style={{ gap: 6 }}>
                    <b style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <I n="clock" s={16} />
                      Delivered / Pending (
                      {(() => {
                        const seenIds = msgInfoModal.seenByUserIds || [];
                        const groupMemberIds = selectedChat?.members?.map((m) => m.id) || team.map((t) => t.id);
                        return team.filter((u) => groupMemberIds.includes(u.id) && !seenIds.includes(u.id) && u.id !== user?.id).length;
                      })()}
                      )
                    </b>
                    <V style={{ gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                      {team
                        .filter((u) => {
                          const seenIds = msgInfoModal.seenByUserIds || [];
                          const groupMemberIds = selectedChat?.members?.map((m) => m.id) || team.map((t) => t.id);
                          return groupMemberIds.includes(u.id) && !seenIds.includes(u.id) && u.id !== user?.id;
                        })
                        .map((u) => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                            <Av n={u.name} s={24} url={u.avatarUrl} />
                            <span style={{ fontSize: 13, color: MU, flex: 1 }}>{u.name}</span>
                            <span style={{ fontSize: 11, color: MU }}>Delivered</span>
                          </div>
                        ))}
                    </V>
                  </V>
                </V>
              ) : (
                <V style={{ gap: 8 }}>
                  <b style={{ fontSize: 13, color: '#0f172a' }}>Recipient Status</b>
                  {(() => {
                    const otherUserId = selectedChat?.targetUserId || selectedChat?.id.slice(3).split('|').find((id) => id !== user?.id);
                    const otherUser = team.find((u) => u.id === otherUserId);
                    const isSeen = msgInfoModal.seenAt || (msgInfoModal.seenByUserIds && otherUserId && msgInfoModal.seenByUserIds.includes(otherUserId));
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: isSeen ? '#f0fdf4' : '#f8fafc', borderRadius: 10, border: '1px solid ' + (isSeen ? '#bbf7d0' : BD) }}>
                        <Av n={otherUser?.name || 'Recipient'} s={36} url={otherUser?.avatarUrl} />
                        <V style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <b style={{ fontSize: 14 }}>{otherUser?.name || 'Recipient'}</b>
                          <span style={{ fontSize: 12, color: isSeen ? '#15803d' : MU }}>
                            {isSeen ? (msgInfoModal.seenAt ? `Read on ${new Date(msgInfoModal.seenAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Read') : 'Delivered'}
                          </span>
                        </V>
                        <span style={{ color: isSeen ? '#53bdeb' : '#94a3b8' }}>
                          <I n="checks" s={18} />
                        </span>
                      </div>
                    );
                  })()}
                </V>
              )}
            </div>
          </V>
        </Modal>
      )}

      {/* New Group Modal */}
      {showGroupModal && (
        <Modal title="New Group" close={() => setShowGroupModal(false)}>
          <V style={{ gap: 12 }}>
            <F l="Group Name">
              <input style={inp} placeholder="e.g. Sales Team" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </F>
            <F l="Members">
              <V style={{ gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {team
                  .filter((u) => u.id !== user?.id)
                  .map((u) => {
                    const isSelected = groupMembers.includes(u.id);
                    return (
                      <P
                        key={u.id}
                        onPress={() =>
                          setGroupMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        style={{ ...R, gap: 10, padding: '8px 6px' }}
                      >
                        <Av n={u.name} s={32} url={u.avatarUrl} />
                        <span style={{ flex: 1, fontWeight: 600 }}>{u.name}</span>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            border: '1.5px solid ' + (isSelected ? G : BD),
                            background: isSelected ? G : '#fff',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <I n="tick" s={14} />}
                        </div>
                      </P>
                    );
                  })}
              </V>
            </F>
            <B k={1} onPress={handleCreateGroup}>
              Create Group
            </B>
          </V>
        </Modal>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <Modal title="Broadcast Message" close={() => setShowBroadcastModal(false)}>
          <V style={{ gap: 12 }}>
            <F l="Message text">
              <textarea
                rows={3}
                style={inp}
                placeholder="Write message to send to everyone selected…"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
              />
            </F>
            <F l="Message Kind">
              <V style={{ flexDirection: 'row', gap: 6 }}>
                {(['Message', 'Task', 'Reminder'] as const).map((k) => (
                  <P
                    key={k}
                    onPress={() => setBroadcastKind(k)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontWeight: 600,
                      fontSize: 13,
                      border: '1px solid ' + (broadcastKind === k ? G : BD),
                      background: broadcastKind === k ? '#dcfce7' : '#fff',
                      color: broadcastKind === k ? '#15803d' : MU,
                    }}
                  >
                    {k}
                  </P>
                ))}
              </V>
            </F>
            <F l="Recipients">
              <V style={{ gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {team
                  .filter((u) => u.id !== user?.id)
                  .map((u) => {
                    const isSelected = broadcastRecipients.includes(u.id);
                    return (
                      <P
                        key={u.id}
                        onPress={() =>
                          setBroadcastRecipients((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        style={{ ...R, gap: 10, padding: '8px 6px' }}
                      >
                        <Av n={u.name} s={32} url={u.avatarUrl} />
                        <span style={{ flex: 1, fontWeight: 600 }}>{u.name}</span>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            border: '1.5px solid ' + (isSelected ? G : BD),
                            background: isSelected ? G : '#fff',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <I n="tick" s={14} />}
                        </div>
                      </P>
                    );
                  })}
              </V>
            </F>
            <B k={1} onPress={handleSendBroadcast}>
              Send Broadcast
            </B>
          </V>
        </Modal>
      )}
    </div>
  );
};
