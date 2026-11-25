'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  X, 
  User, 
  AtSign, 
  Image as ImageIcon, 
  Building, 
  Phone, 
  Check, 
  Save, 
  Sparkles, 
  Camera, 
  AlertCircle 
} from 'lucide-react';
import LuxurySelect from '@/components/LuxurySelect';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

export default function ProfileModal({ isOpen, onClose, onSaved }: ProfileModalProps) {
  const { user, updateLocalUserProfile } = useAuth();
  const { language } = useLanguage();

  const [name, setName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || (user?.email ? `@${user.email.split('@')[0]}` : '@user'));
  const [avatar, setAvatar] = useState(user?.photoURL || '');
  const [department, setDepartment] = useState(user?.department || 'Development');
  const [phone, setPhone] = useState(user?.phone || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync state whenever modal opens or user updates
  React.useEffect(() => {
    if (isOpen && user) {
      setName(user.displayName || '');
      const rawUser = user.username || (user.email ? `@${user.email.split('@')[0]}` : '@user');
      setUsername(rawUser.startsWith('@') ? rawUser : `@${rawUser}`);
      setAvatar(user.photoURL || '');
      setDepartment(user.department || 'Development');
      setPhone(user.phone || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleUsernameChange = (val: string) => {
    let clean = val.replace(/\s+/g, '');
    if (!clean.startsWith('@')) {
      clean = '@' + clean.replace(/@/g, '');
    }
    setUsername(clean.toLowerCase());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError(language === 'bn' ? 'ছবি সাইজ ২ মেগাবাইটের কম হতে হবে' : 'Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'bn' ? 'নাম দেওয়া আবশ্যক' : 'Full name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const formattedUsername = username.startsWith('@') ? username : `@${username}`;
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          name: name.trim(),
          username: formattedUsername.trim().toLowerCase(),
          avatar: avatar.trim() || user.photoURL || '',
          department: department.trim(),
          phone: phone.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Update client auth context state instantly
        updateLocalUserProfile({
          displayName: name.trim(),
          name: name.trim(),
          username: formattedUsername.trim().toLowerCase(),
          photoURL: avatar.trim() || user.photoURL || '',
          avatar: avatar.trim() || user.photoURL || '',
          department: department.trim(),
          phone: phone.trim(),
        });

        setSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(json.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 p-[1.5px] flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <User className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-white">
                {language === 'bn' ? 'প্রোফাইল সেটিংস' : 'Edit Profile Settings'}
              </h2>
              <p className="text-[10px] text-emerald-400">
                {language === 'bn' ? 'নাম, ছবি, ইউজারনেম ও তথ্য আপডেট করুন' : 'Customize your name, avatar, @username and details'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{language === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট হয়েছে!' : 'Profile updated successfully!'}</span>
            </div>
          )}

          {/* Live Profile Preview Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-900 border border-emerald-800/60 flex items-center gap-3 shadow-inner">
            <div className="relative shrink-0">
              <img
                src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Member')}&background=047857&color=fff`}
                alt="Avatar Preview"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400/60 shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-white truncate">{name || 'Your Name'}</p>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {user.role}
                </span>
              </div>
              <p className="text-xs font-mono text-emerald-400 font-semibold truncate">
                {username || '@username'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {department} • {user.email}
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              {language === 'bn' ? 'পূর্ণ নাম *' : 'Full Name *'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Md Refayet Hossen"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* @Username Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {language === 'bn' ? 'ইউজারনেম (@username) *' : 'Handle / Username (@username) *'}
              </label>
              <span className="text-[10px] text-slate-400">
                {language === 'bn' ? 'সার্চে পাওয়া যাবে' : 'Searchable in chat & directory'}
              </span>
            </div>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                required
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="@username"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Avatar Selection & Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {language === 'bn' ? 'প্রোফাইল ছবি / অবতার' : 'Profile Picture / Avatar'}
              </label>
              <label className="cursor-pointer text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ডিভাইস থেকে আপলোড' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(preset)}
                  className={`relative rounded-full overflow-hidden aspect-square transition-all ${
                    avatar === preset ? 'ring-2 ring-amber-400 scale-105 shadow-md' : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Custom URL Input */}
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="url"
                value={customAvatarUrl}
                onChange={e => {
                  setCustomAvatarUrl(e.target.value);
                  if (e.target.value.trim()) setAvatar(e.target.value.trim());
                }}
                placeholder={language === 'bn' ? 'অথবা ছবির ডিরেক্ট লিঙ্ক পেস্ট করুন (URL)' : 'Or paste direct image URL'}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Department & Phone (Two Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {language === 'bn' ? 'ডিপার্টমেন্ট / বিভাগ' : 'Department'}
              </label>
              <LuxurySelect
                value={department}
                direction="up"
                onChange={setDepartment}
                options={[
                  ...(department && !['Executive Management', 'Development', 'Marketing', 'Design & UX', 'Engineering', 'Operations', 'Support', 'Logistics'].includes(department)
                    ? [{ value: department, label: department }]
                    : []),
                  { value: 'Executive Management', label: 'Executive Management' },
                  { value: 'Development', label: 'Development' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Design & UX', label: 'Design & UX' },
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Support', label: 'Support' },
                  { value: 'Logistics', label: 'Logistics' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'প্রোফাইল সেভ করুন' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
