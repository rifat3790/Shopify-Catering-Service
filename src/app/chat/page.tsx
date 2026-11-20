'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import LuxuryLoader from '@/components/LuxuryLoader';
import AudioCallModal from '@/components/AudioCallModal';
import IncomingCallDialog from '@/components/IncomingCallDialog';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { UserRecord, ChatMessage, ChatGroup, SUPER_ADMIN_EMAIL } from '@/lib/types';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  Send, 
  Plus, 
  Search, 
  Sparkles, 
  Radio, 
  Clock, 
  ShieldCheck, 
  UserPlus, 
  X,
  Volume2,
  Settings,
  MoreVertical,
  Crown,
  Shield,
  UserMinus,
  UserCheck,
  Trash2,
  Edit2,
  Check,
  ArrowLeft,
  Ban,
  AlertCircle,
  CheckCheck,
  UserX,
  LogOut
} from 'lucide-react';

function ChatHubContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Directory state
  const [activeTab, setActiveTab] = useState<'active' | 'members' | 'groups'>('active');
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
  const [sendError, setSendError] = useState<string | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Audio Call & Live Signaling state
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [callSessionData, setCallSessionData] = useState<{
    callId?: string;
    isCaller: boolean;
    targetName: string;
    targetAvatar?: string;
    targetRole?: string;
    targetDepartment?: string;
    targetUserId?: string;
    initialOffer?: any;
    isGroup?: boolean;
  } | null>(null);

  // Incoming Call State
  const [incomingCall, setIncomingCall] = useState<any>(null);

  // Create Group Modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group Details & Settings Drawer/Modal state
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMembersToAdd, setNewMembersToAdd] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [isDeleteGroupConfirmOpen, setIsDeleteGroupConfirmOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // User Actions dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [togglingBlock, setTogglingBlock] = useState(false);

  // Send periodic presence heartbeat (every 15s)
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
    const interval = setInterval(sendHeartbeat, 15000);

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
          // If a member is currently selected, update its record
          if (selectedMember) {
            const updated = uJson.data.find((m: UserRecord) => m.id === selectedMember.id);
            if (updated) setSelectedMember(updated);
          } else if (!selectedGroup && uJson.data.length > 0) {
            let targetFromUrl: UserRecord | undefined;
            if (typeof window !== 'undefined') {
              const sp = new URLSearchParams(window.location.search);
              const targetId = sp.get('memberId') || sp.get('userId') || sp.get('email');
              if (targetId) {
                targetFromUrl = uJson.data.find((u: UserRecord) => 
                  u.id === targetId || u.email.toLowerCase() === targetId.toLowerCase()
                );
              }
            }
            if (targetFromUrl) {
              setSelectedMember(targetFromUrl);
            } else {
              const others = uJson.data.filter((u: UserRecord) => u.email.toLowerCase() !== user?.email?.toLowerCase());
              if (others.length > 0) {
                setSelectedMember(others[0]);
              }
            }
          }
        }
      }

      if (gRes.ok) {
        const gJson = await gRes.json();
        if (gJson.success && gJson.data) {
          setGroups(gJson.data);
          // If a group is currently selected, update its state
          if (selectedGroup) {
            const updated = gJson.data.find((g: ChatGroup) => g.id === selectedGroup.id);
            if (updated) setSelectedGroup(updated);
          }
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
    const interval = setInterval(loadDirectory, 5000);
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
          const serverMsgs: ChatMessage[] = json.data;
          // Merge with any local pending optimistic messages so messages NEVER vanish
          setMessages(prev => {
            const pending = prev.filter(m => m.id.startsWith('temp-'));
            if (pending.length === 0) return serverMsgs;

            const combined = [...serverMsgs];
            for (const p of pending) {
              const alreadyExists = serverMsgs.some(
                s => s.senderId === p.senderId && s.text === p.text && Math.abs(new Date(s.createdAt).getTime() - new Date(p.createdAt).getTime()) < 15000
              );
              if (!alreadyExists) {
                combined.push(p);
              }
            }
            return combined;
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const msgInterval = setInterval(fetchMessages, 1500); // 1.5s realtime message sync
    return () => clearInterval(msgInterval);
  }, [selectedMember, selectedGroup, user]);

  // Contained auto-scroll to bottom inside message container without window scrolling
  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedMember, selectedGroup]);

  // Listen for incoming WebRTC calls in real-time
  useEffect(() => {
    if (!user) return;

    const checkIncomingCalls = async () => {
      if (isAudioCallOpen) return;

      try {
        const queryId = user.uid || '';
        const queryEmail = user.email || '';
        const res = await fetch(`/api/chat/call?userId=${encodeURIComponent(queryId)}&userEmail=${encodeURIComponent(queryEmail)}`);
        const json = await res.json();
        const session = json?.session;

        if (session && session.status === 'ringing') {
          const myId = (user.uid || '').toLowerCase();
          const myEmail = (user.email || '').toLowerCase();
          const isCaller = session.callerId?.toLowerCase() === myId || session.callerId?.toLowerCase() === myEmail;
          
          if (!isCaller) {
            setIncomingCall(session);
          }
        } else if (!session || session.status === 'ended' || session.status === 'rejected') {
          if (incomingCall) setIncomingCall(null);
        }
      } catch (e) {}
    };

    const callInterval = setInterval(checkIncomingCalls, 1500);
    return () => clearInterval(callInterval);
  }, [user, isAudioCallOpen, incomingCall]);

  const handleStartCall = (member?: UserRecord | null, group?: ChatGroup | null) => {
    const targetM = member || selectedMember;
    const targetG = group || selectedGroup;

    if (targetG) {
      setCallSessionData({
        isCaller: true,
        targetName: targetG.name,
        targetAvatar: targetG.avatar,
        targetRole: 'Group Channel',
        targetDepartment: 'Shopify Audio',
        isGroup: true,
        targetUserId: targetG.id
      });
      setIsAudioCallOpen(true);
      return;
    }

    if (targetM) {
      setCallSessionData({
        isCaller: true,
        targetName: targetM.name,
        targetAvatar: targetM.avatar,
        targetRole: targetM.role,
        targetDepartment: targetM.department,
        targetUserId: targetM.id,
        isGroup: false
      });
      setIsAudioCallOpen(true);
    }
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    setCallSessionData({
      callId: incomingCall.callId,
      isCaller: false,
      targetName: incomingCall.callerName,
      targetAvatar: incomingCall.callerAvatar,
      targetRole: 'Colleague',
      targetDepartment: 'Shopify Catering',
      initialOffer: incomingCall.offer,
      isGroup: !!incomingCall.isGroup,
    });
    setIncomingCall(null);
    setIsAudioCallOpen(true);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    const cId = incomingCall.callId;
    setIncomingCall(null);
    try {
      await fetch('/api/chat/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signal', callId: cId, status: 'rejected' })
      });
    } catch (e) {}
  };

  // Current user's DB record for blockedUsers checking
  const currentDbUser = members.find(
    m => m.id === user?.uid || m.email.toLowerCase() === user?.email?.toLowerCase()
  );

  const isCurrentMemberBlocked = Boolean(
    selectedMember && currentDbUser?.blockedUsers?.includes(selectedMember.id)
  );
  const amIBlockedByMember = Boolean(
    selectedMember && selectedMember.blockedUsers?.includes(user?.uid || '')
  );

  // Group permission helpers
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isGroupOwner = Boolean(
    selectedGroup && (selectedGroup.createdBy === user?.uid || isSuperAdmin)
  );
  const isGroupAdmin = Boolean(
    selectedGroup && (selectedGroup.admins?.includes(user?.uid || '') || isGroupOwner)
  );
  const isGroupMember = Boolean(
    selectedGroup && selectedGroup.members?.includes(user?.uid || '')
  );

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || sending) return;
    if (isCurrentMemberBlocked || amIBlockedByMember) {
      setSendError("Conversation is blocked. Unblock to continue chatting.");
      return;
    }

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    setSendError(null);

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
      const res = await fetch('/api/chat/messages', {
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        setSendError(json.error || 'Failed to send message');
      } else if (json.data) {
        // Swap temp ID with real persistent ID instantly
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? json.data : m));
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error');
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
          setMobileView('chat');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Save Group Settings (Name, Description)
  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !user || !editGroupName.trim()) return;
    setSavingGroupSettings(true);

    try {
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          requesterId: user.uid,
          name: editGroupName.trim(),
          description: editGroupDesc.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedGroup(json.data);
        setGroups(prev => prev.map(g => g.id === json.data.id ? json.data : g));
        setIsEditingGroup(false);
        toast.success('Group settings updated successfully!', 'Settings Saved');
      } else {
        toast.error(json.error || 'Failed to update group settings', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating settings', 'Error');
    } finally {
      setSavingGroupSettings(false);
    }
  };

  // Add Selected Members to Group
  const handleAddMembersToGroup = async () => {
    if (!selectedGroup || !user || newMembersToAdd.length === 0) return;
    setAddingMembers(true);

    try {
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_members',
          requesterId: user.uid,
          memberIds: newMembersToAdd,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedGroup(json.data);
        setGroups(prev => prev.map(g => g.id === json.data.id ? json.data : g));
        setIsAddMemberOpen(false);
        setNewMembersToAdd([]);
        toast.success('Members added to group successfully!', 'Members Added');
      } else {
        toast.error(json.error || 'Failed to add members', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding members', 'Error');
    } finally {
      setAddingMembers(false);
    }
  };

  // Remove / Kick Member from Group or Leave Group
  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedGroup || !user) return;
    const isSelf = targetUserId === user.uid;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this group?'
      : 'Are you sure you want to remove this member from the group?';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_member',
          requesterId: user.uid,
          targetUserId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (isSelf) {
          // If left self, unselect group
          setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
          setSelectedGroup(null);
          setIsGroupSettingsOpen(false);
          toast.info('You have left the group', 'Left Group');
        } else {
          setSelectedGroup(json.data);
          setGroups(prev => prev.map(g => g.id === json.data.id ? json.data : g));
          toast.success('Member removed from group', 'Removed');
        }
      } else {
        toast.error(json.error || 'Failed to remove member', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error removing member', 'Error');
    }
  };

  // Toggle Admin Status for a Member
  const handleToggleAdmin = async (targetUserId: string) => {
    if (!selectedGroup || !user) return;

    try {
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_admin',
          requesterId: user.uid,
          targetUserId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedGroup(json.data);
        setGroups(prev => prev.map(g => g.id === json.data.id ? json.data : g));
        toast.success('Admin privileges updated', 'Role Updated');
      } else {
        toast.error(json.error || 'Failed to update admin role', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating role', 'Error');
    }
  };

  // Delete Group Permanently
  const handleDeleteGroup = async () => {
    if (!selectedGroup || !user) return;
    setDeletingGroup(true);

    try {
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}?requesterId=${user.uid}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
        setSelectedGroup(null);
        setIsDeleteGroupConfirmOpen(false);
        setIsGroupSettingsOpen(false);
        toast.success('Group deleted permanently', 'Group Deleted');
      } else {
        toast.error(json.error || 'Failed to delete group', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting group', 'Error');
    } finally {
      setDeletingGroup(false);
    }
  };

  // Toggle Block / Unblock User
  const handleToggleBlock = async () => {
    if (!selectedMember || !user || togglingBlock) return;
    setTogglingBlock(true);

    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: user.uid,
          targetUserId: selectedMember.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        await loadDirectory();
        setIsUserMenuOpen(false);
        toast.success(json.message || 'User block status updated', 'Updated');
      } else {
        toast.error(json.error || 'Failed to change block status', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error toggling block', 'Error');
    } finally {
      setTogglingBlock(false);
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

  // Filtered members list (ALL registered users except current user)
  const otherMembers = members.filter(m => m.email.toLowerCase() !== user?.email?.toLowerCase());

  // Active members (online now or seen within 3 minutes)
  const activeMembers = otherMembers.filter(m => 
    Boolean(m.isOnline || (m.lastSeen && (Date.now() - new Date(m.lastSeen).getTime() < 3 * 60 * 1000)))
  );

  const filteredActiveMembers = activeMembers.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (m.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = otherMembers.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (m.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group members details
  const groupMemberList = selectedGroup
    ? members.filter(m => selectedGroup.members?.includes(m.id))
    : [];

  const nonGroupMembers = selectedGroup
    ? members.filter(m => !selectedGroup.members?.includes(m.id))
    : [];

  return (
    <div className="fixed inset-0 h-screen max-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Telegram-style Split: Directory Column (Left) + Chat Window (Right) */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left Column: Directory & Channels */}
          <div className={`w-full md:w-80 lg:w-96 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-emerald-900/40 flex flex-col shrink-0 h-full transition-all duration-200 z-10 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Telegram Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 space-y-3 bg-white dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-slate-900 dark:text-white text-base tracking-tight">Team Connect</h2>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Real-Time Messaging & Voice</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  title="Create New Team Group"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search members or groups..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              {/* Telegram-style 3 Segment Tabs: Active | Members | Groups */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'active'
                      ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>Active ({activeMembers.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'members'
                      ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3 shrink-0" />
                  <span>Members ({otherMembers.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'groups'
                      ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Groups ({groups.length})</span>
                </button>
              </div>
            </div>

            {/* Scrollable Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/80">
              {loading ? (
                <div className="py-12">
                  <LuxuryLoader message="Loading team directory..." size="sm" />
                </div>
              ) : activeTab === 'active' ? (
                filteredActiveMembers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No other colleagues online right now</p>
                    <p className="text-[11px] text-slate-500">Colleagues will automatically appear online here in real time.</p>
                  </div>
                ) : (
                  filteredActiveMembers.map(m => {
                    const isSelected = selectedMember?.id === m.id && !selectedGroup;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setSelectedGroup(null);
                          setMobileView('chat');
                        }}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-l-4 border-amber-500 dark:border-amber-400 text-slate-900 dark:text-white'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                              alt={m.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50"
                            />
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-950 animate-pulse" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{m.name}</p>
                              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-semibold truncate">
                                {m.username || `@${m.email.split('@')[0]}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.department}</p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active Now
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Message & Call Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(m);
                              setSelectedGroup(null);
                              setMobileView('chat');
                            }}
                            title={`Message ${m.name}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 dark:bg-slate-900 dark:hover:bg-emerald-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-slate-950 border border-slate-200/80 dark:border-slate-800 transition-all hover:scale-105 shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(m);
                              setSelectedGroup(null);
                              handleStartCall(m, null);
                            }}
                            title={`Audio Call ${m.name}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-amber-500 dark:bg-slate-900 dark:hover:bg-amber-500 text-amber-700 hover:text-white dark:text-amber-300 dark:hover:text-slate-950 border border-slate-200/80 dark:border-amber-500/40 transition-all hover:scale-105 shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeTab === 'members' ? (
                filteredMembers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No other members registered</p>
                    <p className="text-[11px] text-slate-500">Real users who log in will instantly appear here.</p>
                  </div>
                ) : (
                  filteredMembers.map(m => {
                    const isSelected = selectedMember?.id === m.id && !selectedGroup;
                    const isBlocked = currentDbUser?.blockedUsers?.includes(m.id);

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setSelectedGroup(null);
                          setMobileView('chat');
                        }}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-l-4 border-amber-500 dark:border-amber-400 text-slate-900 dark:text-white'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with status indicator */}
                          <div className="relative shrink-0">
                            <img
                              src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                              alt={m.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                            />
                            <span 
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${
                                m.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                              title={m.isOnline ? 'Active Online' : 'Offline'}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{m.name}</p>
                              {isBlocked && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-mono truncate font-semibold">
                              {m.username || `@${m.email.split('@')[0]}`}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.department}</p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                              {formatLastSeen(m.lastSeen, m.isOnline)}
                            </span>
                          </div>
                        </div>

                        {/* Call Icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(m);
                            setSelectedGroup(null);
                            handleStartCall(m, null);
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
                  <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-300">No team groups yet</p>
                    <p className="text-[11px] text-slate-500">Create the first group for catering discussions or department lunches!</p>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold shadow hover:bg-amber-300 transition-all mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Group</span>
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
                          setMobileView('chat');
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
                            handleStartCall(null, g);
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
          <div className={`flex-1 flex flex-col bg-slate-950 h-full overflow-hidden ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Telegram Chat Header */}
            {(selectedMember || selectedGroup) ? (
              <div className="p-3.5 border-b border-emerald-900/40 bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="p-2 -ml-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 md:hidden"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Avatar & Clickable Target for Settings / Profile */}
                  <div 
                    onClick={() => {
                      if (selectedGroup) {
                        setEditGroupName(selectedGroup.name);
                        setEditGroupDesc(selectedGroup.description || '');
                        setIsGroupSettingsOpen(true);
                      }
                    }}
                    className={`flex items-center gap-3 min-w-0 ${selectedGroup ? 'cursor-pointer hover:opacity-90' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          selectedGroup 
                            ? (selectedGroup.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGroup.name)}&background=d97706&color=fff`)
                            : (selectedMember?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember?.name || 'User')}&background=047857&color=fff`)
                        }
                        alt="Avatar"
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/40"
                      />
                      {!selectedGroup && selectedMember && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                          selectedMember.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                        }`} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-serif font-bold text-white text-sm sm:text-base truncate">
                          {selectedGroup ? selectedGroup.name : selectedMember?.name}
                        </h3>
                        {selectedGroup && (
                          <span className="p-1 text-slate-400 hover:text-amber-300">
                            <Settings className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        {selectedGroup ? (
                          <span className="text-amber-400/90 font-medium text-[11px]">
                            {selectedGroup.members?.length || 0} members • click for group info & settings
                          </span>
                        ) : (
                          <>
                            <span className="text-slate-400 text-[11px]">{selectedMember?.department}</span>
                            <span className="text-slate-600">•</span>
                            <span className={`font-mono text-[11px] font-medium ${selectedMember?.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {formatLastSeen(selectedMember?.lastSeen, selectedMember?.isOnline)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 relative">
                  {/* Start Audio Call */}
                  <button
                    onClick={() => handleStartCall(selectedMember, selectedGroup)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Call</span>
                  </button>

                  {/* Group Settings Button */}
                  {selectedGroup && (
                    <button
                      onClick={() => {
                        setEditGroupName(selectedGroup.name);
                        setEditGroupDesc(selectedGroup.description || '');
                        setIsGroupSettingsOpen(true);
                      }}
                      title="Group Info & Settings"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 transition-all hover:scale-105"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  {/* 1-on-1 User Menu (Block / Unblock) */}
                  {!selectedGroup && selectedMember && (
                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        title="Conversation Options"
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in">
                          <button
                            onClick={handleToggleBlock}
                            disabled={togglingBlock}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition-all ${
                              isCurrentMemberBlocked
                                ? 'text-emerald-400 hover:bg-emerald-950/40'
                                : 'text-rose-400 hover:bg-rose-950/40'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>
                              {togglingBlock
                                ? 'Updating...'
                                : isCurrentMemberBlocked
                                ? 'Unblock Member'
                                : 'Block Member'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-800 text-xs text-slate-400">
                Select a member or group to start chatting
              </div>
            )}

            {/* Block Warning Banner */}
            {isCurrentMemberBlocked && (
              <div className="bg-rose-950/70 border-b border-rose-900/60 p-2.5 px-4 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>You have blocked this member. You will not receive messages from them.</span>
                </div>
                <button
                  onClick={handleToggleBlock}
                  disabled={togglingBlock}
                  className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-[11px] font-bold"
                >
                  Unblock
                </button>
              </div>
            )}

            {amIBlockedByMember && (
              <div className="bg-amber-950/60 border-b border-amber-900/60 p-2.5 px-4 flex items-center gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You cannot send messages to this member as they have blocked incoming chats.</span>
              </div>
            )}

            {/* Message Bubble Feed (Self-contained scroll without outer window scrolling) */}
            <div 
              ref={chatScrollContainerRef} 
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5"
            >
              {(!selectedMember && !selectedGroup) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-emerald-900/60 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif font-bold text-white text-lg">Shopify Catering Team Chat</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Select a colleague or team group from the left panel to coordinate lunch, catering orders, and refreshment requests.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Radio className="w-8 h-8 mx-auto text-emerald-500 animate-pulse" />
                  <p className="text-xs text-slate-300 font-semibold">Start the conversation</p>
                  <p className="text-[11px]">Say hello or plan today's team lunch menu!</p>
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
            </div>

            {/* Error Message Toast */}
            {sendError && (
              <div className="mx-4 mb-2 p-2 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="text-rose-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat Message Input Form */}
            {(selectedMember || selectedGroup) && (
              <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800/80 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      required
                      disabled={isCurrentMemberBlocked || amIBlockedByMember}
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      placeholder={
                        isCurrentMemberBlocked || amIBlockedByMember
                          ? 'This conversation is blocked...'
                          : selectedGroup 
                          ? `Message #${selectedGroup.name}...` 
                          : `Message ${selectedMember?.name}...`
                      }
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim() || isCurrentMemberBlocked || amIBlockedByMember}
                    className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="w-4 h-4 text-slate-950" />
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Incoming WebRTC Call Dialog */}
      <IncomingCallDialog
        isOpen={!!incomingCall}
        callerName={incomingCall?.callerName || 'Colleague'}
        callerAvatar={incomingCall?.callerAvatar}
        callerRole={incomingCall?.isGroup ? 'Group Audio' : 'Colleague'}
        callerDepartment="Shopify Catering"
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* WebRTC Audio Call Modal */}
      <AudioCallModal
        isOpen={isAudioCallOpen}
        onClose={() => {
          setIsAudioCallOpen(false);
          setCallSessionData(null);
        }}
        callId={callSessionData?.callId}
        isCaller={callSessionData?.isCaller ?? true}
        targetName={callSessionData?.targetName || (selectedGroup ? selectedGroup.name : (selectedMember?.name || 'Colleague'))}
        targetAvatar={callSessionData?.targetAvatar || (selectedGroup ? selectedGroup.avatar : selectedMember?.avatar)}
        targetRole={callSessionData?.targetRole || selectedMember?.role}
        targetDepartment={callSessionData?.targetDepartment || selectedMember?.department}
        targetUserId={callSessionData?.targetUserId}
        currentUserId={user?.uid}
        currentUserName={user?.displayName || currentDbUser?.name || 'Member'}
        currentUserAvatar={user?.photoURL || currentDbUser?.avatar}
        initialOffer={callSessionData?.initialOffer}
        isGroup={callSessionData?.isGroup ?? !!selectedGroup}
      />

      {/* Telegram-style Group Info & Settings Drawer / Modal */}
      {isGroupSettingsOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">Group Settings & Members</h3>
              </div>
              <button
                onClick={() => {
                  setIsGroupSettingsOpen(false);
                  setIsEditingGroup(false);
                  setIsAddMemberOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Group Profile Card */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                <img
                  src={selectedGroup.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGroup.name)}&background=d97706&color=fff`}
                  alt={selectedGroup.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  {!isEditingGroup ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base truncate">{selectedGroup.name}</h4>
                        {isGroupAdmin && (
                          <button
                            onClick={() => {
                              setEditGroupName(selectedGroup.name);
                              setEditGroupDesc(selectedGroup.description || '');
                              setIsEditingGroup(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedGroup.description || 'No description provided'}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>Created by: {selectedGroup.createdByName || 'Admin'}</span>
                        <span>•</span>
                        <span>{selectedGroup.members?.length || 0} members</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveGroupSettings} className="space-y-2">
                      <input
                        type="text"
                        required
                        value={editGroupName}
                        onChange={e => setEditGroupName(e.target.value)}
                        placeholder="Group Name"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editGroupDesc}
                        onChange={e => setEditGroupDesc(e.target.value)}
                        placeholder="Group Description"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingGroupSettings || !editGroupName.trim()}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
                        >
                          {savingGroupSettings ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingGroup(false)}
                          className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Members ({groupMemberList.length})</span>
                  </h5>

                  {/* Add Member Button */}
                  {isGroupAdmin && (
                    <button
                      onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>

                {/* Add Member Panel */}
                {isAddMemberOpen && (
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-3">
                    <p className="text-xs font-bold text-amber-300">Invite Colleagues to Group</p>
                    {nonGroupMembers.length === 0 ? (
                      <p className="text-xs text-slate-400">All registered users are already in this group.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-800 space-y-1">
                        {nonGroupMembers.map(m => {
                          const isChecked = newMembersToAdd.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className="flex items-center justify-between p-2 hover:bg-slate-900 rounded-lg cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                                  alt={m.name}
                                  className="w-6 h-6 rounded-full object-cover"
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
                                    setNewMembersToAdd(prev => [...prev, m.id]);
                                  } else {
                                    setNewMembersToAdd(prev => prev.filter(id => id !== m.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsAddMemberOpen(false)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={addingMembers || newMembersToAdd.length === 0}
                        onClick={handleAddMembersToGroup}
                        className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs disabled:opacity-50"
                      >
                        {addingMembers ? 'Adding...' : `Add Selected (${newMembersToAdd.length})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Member List */}
                <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden">
                  {groupMemberList.map(m => {
                    const isOwner = m.id === selectedGroup.createdBy;
                    const isAdmin = selectedGroup.admins?.includes(m.id);
                    const isMe = m.id === user?.uid;

                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=047857&color=fff`}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{m.name}</p>
                              {isMe && <span className="text-[10px] text-slate-400 font-mono">(You)</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  Owner
                                </span>
                              ) : isAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                  <Shield className="w-3 h-3 text-emerald-400" />
                                  Admin
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Member</span>
                              )}
                              <span className="text-[10px] text-slate-600">•</span>
                              <span className="text-[10px] text-slate-400 truncate">{m.department}</span>
                            </div>
                          </div>
                        </div>

                        {/* Admin / Owner Member Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle Admin Role: Only Group Owner can promote/demote */}
                          {isGroupOwner && !isOwner && (
                            <button
                              onClick={() => handleToggleAdmin(m.id)}
                              title={isAdmin ? 'Demote from Admin' : 'Promote to Admin'}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isAdmin
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40 hover:bg-slate-800'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-amber-400 hover:bg-slate-800'
                              }`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Kick Member */}
                          {((isGroupOwner && !isOwner) || (isGroupAdmin && !isAdmin && !isOwner)) && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              title="Remove member from group"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Leave Group & Delete Group */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                {/* Leave Group Button */}
                {isGroupMember && !isGroupOwner && (
                  <button
                    onClick={() => handleRemoveMember(user?.uid || '')}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 text-xs font-semibold transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Group Channel</span>
                  </button>
                )}

                {/* Delete Group Button: Only Owner or Super Admin */}
                {isGroupOwner && (
                  <button
                    onClick={() => setIsDeleteGroupConfirmOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Group Permanently</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {isDeleteGroupConfirmOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-white text-base">Delete Group Channel?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong className="text-white">#{selectedGroup.name}</strong>? All chat messages and channel history will be wiped from database.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteGroupConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingGroup}
                onClick={handleDeleteGroup}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                {deletingGroup ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

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
