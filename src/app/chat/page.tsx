'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import AudioCallModal from '@/components/AudioCallModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRecord, ChatMessage, ChatGroup } from '@/lib/types';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  Send, 
  Plus, 
  Search, 
  Sparkles, 
  Circle, 
  CheckCheck, 
  Smile, 
  Radio, 
  Clock, 
  ShieldCheck, 
  UserPlus, 
  X,
  Volume2
} from 'lucide-react';

function ChatHubContent() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'members' | 'groups'>('members');
  const [members, setMembers] = useState<UserRecord[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected chat target
  const [selectedMember, setSelectedMember] = useState<UserRecord | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Audio Call Modal state
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);

  // Create Group Modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Send periodic presence heartbeat
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = () => {
      fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, email: user.email, isOnline: true }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);

    return () => {
      clearInterval(interval);
      fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, email: user.email, isOnline: false }),
      }).catch(() => {});
    };
  }, [user]);

  // Fetch all members and groups
  const loadDirectory = async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/chat/groups'),
      ]);

      if (uRes.ok) {
        const uJson = await uRes.json();
        if (uJson.success && uJson.data) {
          setMembers(uJson.data);
          // Auto select first member if none selected
          if (!selectedMember && !selectedGroup && uJson.data.length > 0) {
            const others = uJson.data.filter((u: UserRecord) => u.email.toLowerCase() !== user?.email?.toLowerCase());
            if (others.length > 0) {
              setSelectedMember(others[0]);
            }
          }
        }
      }

      if (gRes.ok) {
        const gJson = await gRes.json();
        if (gJson.success && gJson.data) {
          setGroups(gJson.data);
        }
      }
    } catch (err) {
      console.warn('Error loading chat directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
    const interval = setInterval(loadDirectory, 12000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch messages when selected target changes
  const fetchMessages = async () => {
    if (!user) return;

    let url = '';
    if (selectedGroup) {
      url = `/api/chat/messages?groupId=${selectedGroup.id}`;
    } else if (selectedMember) {
      url = `/api/chat/messages?userId1=${user.uid}&userId2=${selectedMember.id}`;
    }

    if (!url) return;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMessages(json.data);
        }
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const msgInterval = setInterval(fetchMessages, 3500);
    return () => clearInterval(msgInterval);
  }, [selectedMember, selectedGroup, user]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.uid,
      senderName: user.displayName || 'You',
      senderAvatar: user.photoURL || undefined,
      receiverId: selectedMember ? selectedMember.id : undefined,
      groupId: selectedGroup ? selectedGroup.id : undefined,
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.uid,
          senderName: user.displayName || 'You',
          senderAvatar: user.photoURL || '',
          receiverId: selectedMember ? selectedMember.id : undefined,
          groupId: selectedGroup ? selectedGroup.id : undefined,
          text: textToSend,
        }),
      });
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    setCreatingGroup(true);

    try {
      const res = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          createdBy: user.uid,
          createdByName: user.displayName || 'Member',
          members: [user.uid, ...selectedGroupMemberIds],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setGroups(prev => [json.data, ...prev]);
          setSelectedGroup(json.data);
          setSelectedMember(null);
          setIsCreateGroupOpen(false);
          setNewGroupName('');
          setNewGroupDesc('');
          setSelectedGroupMemberIds([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Format last seen human readable
  const formatLastSeen = (isoString?: string, isOnline?: boolean) => {
    if (isOnline) return 'Active Now';
    if (!isoString) return 'Offline';

    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 2) return 'Active just now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    if (diffHour < 24) return `Active ${diffHour}h ago`;
    if (diffDay === 1) return 'Active yesterday';
    return `Active ${diffDay}d ago`;
  };

  // Filtered members list
  const otherMembers = members.filter(m => m.email.toLowerCase() !== user?.email?.toLowerCase());
  const filteredMembers = otherMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.department.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Main Content Split: Chat Directory (Left) + Active Chat Room (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Directory & Channels */}
          <div className="w-full md:w-80 lg:w-96 bg-slate-950 border-r border-emerald-900/40 flex flex-col shrink-0 h-full">
            
            {/* Directory Header */}
            <div className="p-4 border-b border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-white text-base">Team Connect</h2>
                    <p className="text-[10px] text-emerald-400 font-medium">Real-Time Team & Voice</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  title="Create New Team Group"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search members or groups..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Directory Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800/80 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'members'
                      ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Members ({otherMembers.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'groups'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Groups ({groups.length})</span>
                </button>
              </div>
            </div>

            {/* Scrollable Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
              {loading ? (
                <div className="py-12">
                  <LuxuryLoader message="Loading team directory..." size="sm" />
                </div>
              ) : activeTab === 'members' ? (
                filteredMembers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">No other members online</p>
                    <p className="text-[11px] text-slate-500">New team members will appear when they sign in.</p>
                  </div>
                ) : (
                  filteredMembers.map(m => {
                    const isSelected = selectedMember?.id === m.id && !selectedGroup;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setSelectedGroup(null);
                        }}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/60 border-l-4 border-amber-400 text-white'
                            : 'hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with live status indicator dot */}
                          <div className="relative shrink-0">
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                              alt={m.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                            />
                            <span 
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                                m.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                              title={m.isOnline ? 'Active Online' : 'Offline'}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white truncate">{m.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{m.department}</p>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {formatLastSeen(m.lastSeen, m.isOnline)}
                            </span>
                          </div>
                        </div>

                        {/* Call Icon on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(m);
                            setSelectedGroup(null);
                            setIsAudioCallOpen(true);
                          }}
                          title={`Audio Call ${m.name}`}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-slate-400 hover:text-slate-950 border border-slate-800 transition-all hover:scale-105 shrink-0"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )
              ) : (
                filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <p>No groups created yet.</p>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="mt-2 text-amber-300 hover:underline text-[11px] font-semibold"
                    >
                      + Create First Team Group
                    </button>
                  </div>
                ) : (
                  filteredGroups.map(g => {
                    const isSelected = selectedGroup?.id === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          setSelectedGroup(g);
                          setSelectedMember(null);
                        }}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-950/40 border-l-4 border-amber-400 text-white'
                            : 'hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={g.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=d97706&color=fff`}
                            alt={g.name}
                            className="w-10 h-10 rounded-2xl object-cover ring-1 ring-amber-500/30 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white truncate">{g.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{g.description || 'Team Group'}</p>
                            <span className="text-[10px] text-amber-400/90 font-mono">
                              {g.members?.length || 0} members
                            </span>
                          </div>
                        </div>

                        {/* Group Call */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroup(g);
                            setSelectedMember(null);
                            setIsAudioCallOpen(true);
                          }}
                          title={`Audio Conference with ${g.name}`}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-amber-400 text-slate-400 hover:text-slate-950 border border-slate-800 transition-all hover:scale-105 shrink-0"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )
              )}
            </div>

          </div>

          {/* Right Column: Chat Room Window */}
          <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
            
            {/* Chat Room Header */}
            {(selectedMember || selectedGroup) ? (
              <div className="p-4 border-b border-emerald-900/40 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        selectedGroup 
                          ? (selectedGroup.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGroup.name)}&background=d97706&color=fff`)
                          : (selectedMember?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember?.name || 'User')}&background=047857&color=fff`)
                      }
                      alt="Avatar"
                      className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-500/40"
                    />
                    {!selectedGroup && selectedMember && (
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                        selectedMember.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-white text-base truncate">
                      {selectedGroup ? selectedGroup.name : selectedMember?.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      {selectedGroup ? (
                        <span className="text-amber-400 font-medium">
                          {selectedGroup.members?.length || 0} active members • Group Channel
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-400">{selectedMember?.department}</span>
                          <span className="text-slate-600">•</span>
                          <span className={`font-mono font-medium ${selectedMember?.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {formatLastSeen(selectedMember?.lastSeen, selectedMember?.isOnline)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Action: Start Audio Call */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAudioCallOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Phone className="w-4 h-4 text-slate-950" />
                    <span className="hidden sm:inline">Audio Call</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-800 text-xs text-slate-400">
                Select a member or group to start chatting
              </div>
            )}

            {/* Message Bubble Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {(!selectedMember && !selectedGroup) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-emerald-900/60 flex items-center justify-center text-amber-400 mx-auto">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif font-bold text-white text-lg">Shopify Catering Team Chat</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Select a colleague or group channel from the left sidebar to start real-time messaging or make direct audio calls.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Radio className="w-8 h-8 mx-auto text-emerald-500 animate-pulse" />
                  <p className="text-xs text-slate-300 font-semibold">Start the conversation</p>
                  <p className="text-[11px]">Send a friendly greeting or coordinate lunch & refreshments!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.uid;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <img
                          src={msg.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=047857&color=fff`}
                          alt={msg.senderName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                        />
                      )}

                      <div
                        className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 text-xs shadow-md space-y-1 ${
                          isMine
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-slate-950 font-medium rounded-br-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                        }`}
                      >
                        {!isMine && (
                          <p className="text-[10px] font-bold text-amber-300">
                            {msg.senderName}
                          </p>
                        )}
                        <p className={`leading-relaxed whitespace-pre-wrap ${isMine ? 'text-slate-950 font-semibold' : 'text-slate-200'}`}>
                          {msg.text}
                        </p>
                        <div className={`flex items-center justify-end gap-1 text-[9px] ${isMine ? 'text-emerald-950 font-bold' : 'text-slate-400 font-mono'}`}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Message Input Form */}
            {(selectedMember || selectedGroup) && (
              <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800/80 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      required
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      placeholder={
                        selectedGroup 
                          ? `Message #${selectedGroup.name}...` 
                          : `Message ${selectedMember?.name}...`
                      }
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 text-slate-950" />
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Audio Call Modal */}
      <AudioCallModal
        isOpen={isAudioCallOpen}
        onClose={() => setIsAudioCallOpen(false)}
        targetName={selectedGroup ? selectedGroup.name : (selectedMember?.name || 'Colleague')}
        targetAvatar={selectedGroup ? selectedGroup.avatar : selectedMember?.avatar}
        targetRole={selectedMember?.role}
        targetDepartment={selectedMember?.department}
        isGroup={!!selectedGroup}
      />

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">Create Team Group</h3>
              </div>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Lunch & Snacks Club, Dev Team"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Brief purpose of this team channel"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Select Members to Add ({selectedGroupMemberIds.length} selected)
                </label>
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1">
                  {otherMembers.length === 0 ? (
                    <p className="text-[11px] text-slate-500 p-2">No other members available</p>
                  ) : (
                    otherMembers.map(m => {
                      const isChecked = selectedGroupMemberIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-900 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                              alt={m.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">{m.name}</p>
                              <p className="text-[10px] text-slate-400">{m.department}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroupMemberIds(prev => [...prev, m.id]);
                              } else {
                                setSelectedGroupMemberIds(prev => prev.filter(id => id !== m.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group Channel'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatHubContent />
    </AuthGuard>
  );
}
