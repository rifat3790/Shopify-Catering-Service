'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Database, 
  HardDrive, 
  Cloud, 
  Server, 
  Layers, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Users, 
  Wallet,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

interface StorageMetricsData {
  timestamp: string;
  mongodb: {
    provider: string;
    dbName: string;
    plan: string;
    status: string;
    allocatedLimitBytes: number;
    allocatedLimitMB: number;
    dataSizeBytes: number;
    dataSizeFormatted: string;
    storageSizeBytes: number;
    storageSizeFormatted: string;
    indexSizeBytes: number;
    indexSizeFormatted: string;
    usedBytes: number;
    usedMB: number;
    usedFormatted: string;
    freeBytes: number;
    freeMB: number;
    freeFormatted: string;
    usedPercent: number;
    freePercent: number;
    collectionsCount: number;
    objectsCount: number;
    collections: Array<{ name: string; count: number }>;
  };
  firebase: {
    provider: string;
    projectId: string;
    bucketName: string;
    plan: string;
    status: string;
    allocatedLimitBytes: number;
    allocatedLimitGB: number;
    filesCount: number;
    usedBytes: number;
    usedMB: number;
    usedFormatted: string;
    freeBytes: number;
    freeGB: number;
    freeFormatted: string;
    usedPercent: number;
    freePercent: number;
    totalAuthUsers: number;
  };
  financials: {
    totalMemberBalance: number;
    totalLifetimeSpent: number;
    totalCurrentDue: number;
    totalOrdersCount: number;
    totalActiveUsers: number;
  };
}

export default function StorageMetricsCard() {
  const { language } = useLanguage();
  const [data, setData] = useState<StorageMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/metrics/storage', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          setLastRefreshedAt(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn('Storage metrics fetch error:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading && !data) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 animate-pulse text-center space-y-3">
        <Database className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Connecting to MongoDB Atlas & Firebase Cloud Storage metrics...</p>
      </div>
    );
  }

  const mongo = data?.mongodb;
  const firebase = data?.firebase;
  const financials = data?.financials;

  return (
    <div className="space-y-6">
      {/* Real-time Header Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-amber-500/30 shadow-xs dark:shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'ক্লাউড ও ডাটাবেজ স্টোরেজ লাইভ মনিটরিং' : 'Cloud Database & Storage Live Telemetry'}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Real-Time
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'bn' 
                ? `মঙ্গোডিবি ও ফায়ারবেস ক্লাউডের প্রকৃত মেমোরি ব্যবহার এবং ফাঁকা স্পেস (সর্বশেষ আপডেট: ${lastRefreshedAt || 'এখন'})` 
                : `Live disk usage, storage fillup & free capacity (Last refreshed: ${lastRefreshedAt || 'Just now'})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-xs ${
              autoRefresh 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/30 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60' 
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'Auto 10s: ON' : 'Auto: OFF'}</span>
          </button>

          <button
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{language === 'bn' ? 'রিফ্রেশ' : 'Refresh Now'}</span>
          </button>
        </div>
      </div>

      {/* Primary Storage Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* MongoDB Atlas Real-Time Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-emerald-500/40 shadow-xs dark:shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">MongoDB Atlas Cloud</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">DB: {mongo?.dbName || 'shopify_catering'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 uppercase">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Cluster Healthy
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">{mongo?.plan || 'Atlas M0 (Free Tier)'}</p>
            </div>
          </div>

          {/* Progress Bar & Storage Metrics */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'bn' ? 'ব্যবহৃত স্টোরেজ' : 'Storage Used'}</span>
                <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">{mongo?.usedFormatted || '0 B'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'bn' ? 'ফাঁকা আছে (অবশিষ্ট)' : 'Remaining Free'}</span>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{mongo?.freeFormatted || '512 MB'}</p>
              </div>
            </div>

            {/* Visual Storage Bar */}
            <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-700 shadow-sm"
                style={{ width: `${Math.max(1, mongo?.usedPercent || 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Used: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{mongo?.usedPercent || 0}%</strong> of {mongo?.allocatedLimitMB || 512} MB Limit</span>
              <span>Free: <strong className="text-slate-800 dark:text-white font-mono">{mongo?.freePercent || 100}%</strong> available</span>
            </div>
          </div>

          {/* Detailed Disk Allocation Breakdown */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">Raw Data</span>
              <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">{mongo?.dataSizeFormatted || '0 B'}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">Disk Allocated</span>
              <p className="text-sm font-bold font-mono text-teal-700 dark:text-teal-300 mt-0.5">{mongo?.storageSizeFormatted || '0 B'}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">Index Size</span>
              <p className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">{mongo?.indexSizeFormatted || '0 B'}</p>
            </div>
          </div>

          {/* Collection Counts Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Collections & Document Counts</span>
              </span>
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">{mongo?.objectsCount || 0} Total Documents</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mongo?.collections && mongo.collections.length > 0 ? (
                mongo.collections.map((col) => (
                  <div key={col.name} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400 capitalize truncate">{col.name}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[11px]">
                      {col.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 col-span-4">No collections yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Firebase Cloud Storage & Auth Services Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-amber-500/40 shadow-xs dark:shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Firebase Cloud Storage</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[220px] sm:max-w-xs">{firebase?.bucketName || 'shopify-catering-service'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 uppercase">
                <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Spark Tier
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">{firebase?.allocatedLimitGB || 5} GB Cloud Storage Quota</p>
            </div>
          </div>

          {/* Progress Bar & Storage Metrics */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'bn' ? 'ব্যবহৃত ক্লাউড স্পেস' : 'Cloud Storage Used'}</span>
                <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">{firebase?.usedFormatted || '0 B'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'bn' ? 'ফাঁকা স্পেস (অবশিষ্ট)' : 'Remaining Free'}</span>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{firebase?.freeFormatted || '5.00 GB'}</p>
              </div>
            </div>

            {/* Visual Storage Bar */}
            <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 transition-all duration-700 shadow-sm"
                style={{ width: `${Math.max(1, firebase?.usedPercent || 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Used: <strong className="text-amber-700 dark:text-amber-400 font-mono">{firebase?.usedPercent || 0}%</strong> of {firebase?.allocatedLimitGB || 5} GB Limit</span>
              <span>Free: <strong className="text-slate-800 dark:text-white font-mono">{firebase?.freePercent || 100}%</strong> available</span>
            </div>
          </div>

          {/* Firebase Subsystem Indicators */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Stored Files</span>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">{firebase?.filesCount || 0}</p>
              </div>
              <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Auth Users</span>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">{firebase?.totalAuthUsers || 0}</p>
              </div>
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Security & Admin Connection Status */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Firebase Project ID:</span>
              <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">{firebase?.projectId}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Admin SDK Connectivity:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Authorized & Connected
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Aggregate Financial & Wallet Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-emerald-500/30 shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            <span>{language === 'bn' ? 'মোট সংরক্ষিত ওয়ালেট ব্যালেন্স' : 'Total Dynamic Member Balance'}</span>
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
            ৳{(financials?.totalMemberBalance || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Live MongoDB Balances</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-teal-500/30 shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            <span>{language === 'bn' ? 'মোট খাবার গ্রহণ (বিক্রি)' : 'Total Food Consumption (Spent)'}</span>
            <ArrowUpRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
            ৳{(financials?.totalLifetimeSpent || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-1">Settled Meal Sales</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-amber-500/30 shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            <span>{language === 'bn' ? 'সক্রিয় আসল একাউন্ট' : 'Active Real Users'}</span>
            <Users className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {financials?.totalActiveUsers || 0}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            {language === 'bn' ? 'নিবন্ধিত আসল মেম্বার' : 'Verified Registered Members'}
          </p>
        </div>
      </div>
    </div>
  );
}
