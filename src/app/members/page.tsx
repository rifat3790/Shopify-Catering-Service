'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import QuickOrderModal from '@/components/QuickOrderModal';
import { useLanguage } from '@/context/LanguageContext';
import { UserRecord } from '@/lib/types';
import { 
  Users, 
  Search, 
  Plus, 
  Wallet, 
  Building, 
  Utensils, 
  TrendingUp, 
  RefreshCw 
} from 'lucide-react';

function MembersPageContent() {
  const { language } = useLanguage();
  const [members, setMembers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedOrderMember, setSelectedOrderMember] = useState<string | null>(null);

  // Form states for new member
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Development');
  const [newBalance, setNewBalance] = useState<number>(0);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setMembers(json.data);
      }
    } catch (e) {
      console.warn('Error fetching members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && newBalance > 0) {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: json.data.id,
              balanceDelta: newBalance,
              action: 'add'
            })
          });
        }
        fetchMembers();
        setIsAddMemberOpen(false);
        setNewName('');
        setNewEmail('');
        setNewBalance(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const departments = ['All', 'Development', 'Marketing', 'Design & UX', 'Engineering', 'Operations', 'Support', 'Logistics'];

  const filteredMembers = members.filter(m => {
    const matchSearch = (m.name || '').toLowerCase().includes(search.toLowerCase()) || (m.email || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = departmentFilter === 'All' ? true : (m.department || '').toLowerCase().includes(departmentFilter.toLowerCase());
    return matchSearch && matchDept;
  });

  const totalMembersBalance = members.reduce((sum, m) => sum + (m.balance || 0), 0);
  const totalLifetimeSpent = members.reduce((sum, m) => sum + (m.totalSpent || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar onOpenNewOrder={() => setSelectedOrderMember('Member')} />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 p-[2px] shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  {language === 'bn' ? 'মেম্বার তালিকা ও ক্যাটারিং হিসাব' : 'Team Member Directory & Balances'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {members.length} Members
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn' 
                  ? 'সকল মেম্বারের রিয়েল-টাইম ব্যালেন্স, ডিপার্টমেন্ট ও সরাসরি খাবারের অর্ডার ম্যানেজমেন্ট' 
                  : 'Manage all team members, individual meal balances, and quick order logging'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMembers}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>{language === 'bn' ? '+ নতুন মেম্বার যুক্ত করুন' : '+ Add New Member'}</span>
            </button>
          </div>
        </div>

        {/* Member Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-600/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{language === 'bn' ? 'মোট মেম্বার ব্যালেন্স' : 'Total Member Wallet Funds'}</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-400">৳{totalMembersBalance.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-400/80 mt-1">Available for refreshments</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{language === 'bn' ? 'মোট ক্যাটারিং খরচ' : 'Total Lifetime Food Spent'}</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-amber-300">৳{totalLifetimeSpent.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Settled Catering Orders</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>{language === 'bn' ? 'ডিপার্টমেন্ট সংখ্যা' : 'Active Teams'}</span>
              <Building className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-white">Shopify Operations</p>
            <p className="text-[11px] text-slate-400 mt-1">Real Team Balances</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'মেম্বার নাম বা ইমেইল খুঁজুন...' : 'Search member name or email...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  departmentFilter === dept
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Member Grid Cards */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            মেম্বার লোড হচ্ছে...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            কোনো মেম্বার পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-600/70 shadow-xl transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=047857&color=fff`}
                      alt={member.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-white text-base leading-snug">
                        {member.name}
                      </h3>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {member.department}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'ব্যালেন্স:' : 'Balance:'}</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">৳{member.balance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'মোট খরচ:' : 'Total Spent:'}</span>
                      <span className="font-mono font-medium text-amber-200">৳{member.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Order for this Member */}
                <button
                  onClick={() => setSelectedOrderMember(member.name)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'খাবার অর্ডার দিন' : 'Order for Member'}</span>
                </button>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-serif font-bold text-white text-base">
                {language === 'bn' ? 'নতুন মেম্বার যুক্ত করুন' : 'Register New Team Member'}
              </h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  মেম্বারের পূর্ণ নাম *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  ইমেইল অ্যাড্রেস *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="tanvir@shopify.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    ডিপার্টমেন্ট
                  </label>
                  <select
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="Development">Development</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Design & UX">Design & UX</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Support">Support</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    প্রাথমিক ব্যালেন্স (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBalance}
                    onChange={e => setNewBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs"
                >
                  মেম্বার সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {selectedOrderMember && (
        <QuickOrderModal
          isOpen={true}
          prefillCustomer={selectedOrderMember}
          onClose={() => setSelectedOrderMember(null)}
          onSubmit={async (data) => {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...data,
                customerName: selectedOrderMember,
              }),
            });
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <AuthGuard allowedRoles={['super_admin', 'admin']}>
      <MembersPageContent />
    </AuthGuard>
  );
}
