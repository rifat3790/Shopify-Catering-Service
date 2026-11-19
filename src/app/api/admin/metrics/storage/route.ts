import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { adminAuth, adminStorage, getFirebaseUsersList } from '@/lib/firebaseAdmin';
import { getAllUsers, getAllOrders } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    // 1. Fetch Real-time MongoDB Atlas Metrics via dbStats command
    let mongoStats: any = {};
    let collectionsList: Array<{ name: string; count: number }> = [];

    if (db) {
      try {
        mongoStats = await db.command({ dbStats: 1 });
        const colls = await db.listCollections().toArray();
        collectionsList = await Promise.all(
          colls
            .filter(c => !c.name.startsWith('system.'))
            .map(async c => {
              const count = await db.collection(c.name).countDocuments().catch(() => 0);
              return { name: c.name, count };
            })
        );
      } catch (err: any) {
        console.warn('Could not run MongoDB dbStats command:', err);
      }
    }

    // 512 MB Atlas Free Tier Limit (M0 cluster)
    const MONGO_LIMIT_BYTES = 512 * 1024 * 1024; // 536,870,912 bytes
    const mongoDataSize = Number(mongoStats.dataSize) || 0;
    const mongoStorageSize = Number(mongoStats.storageSize) || 0;
    const mongoIndexSize = Number(mongoStats.indexSize) || 0;
    const mongoUsedBytes = mongoStorageSize + mongoIndexSize;
    const mongoFreeBytes = Math.max(0, MONGO_LIMIT_BYTES - mongoUsedBytes);
    const mongoUsedMB = Number((mongoUsedBytes / (1024 * 1024)).toFixed(2));
    const mongoFreeMB = Number((mongoFreeBytes / (1024 * 1024)).toFixed(2));
    const mongoUsedPercent = Number(((mongoUsedBytes / MONGO_LIMIT_BYTES) * 100).toFixed(2));
    const mongoFreePercent = Number((100 - mongoUsedPercent).toFixed(2));

    // 2. Fetch Real-time Firebase Storage & Auth Metrics
    // 5 GB Firebase Spark Free Tier limit
    const FIREBASE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5,368,709,120 bytes
    let fbFilesCount = 0;
    let fbUsedBytes = 0;
    let fbBucketStatus = 'active';
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'shopify-catering-service.firebasestorage.app';

    if (adminStorage) {
      try {
        const bucket = adminStorage.bucket();
        const [files] = await bucket.getFiles({ maxResults: 1000 }).catch(() => [[]]);
        fbFilesCount = files.length;
        files.forEach(f => {
          fbUsedBytes += Number(f.metadata?.size) || 0;
        });
      } catch (err: any) {
        fbBucketStatus = 'bucket_standby';
      }
    }

    const fbFreeBytes = Math.max(0, FIREBASE_LIMIT_BYTES - fbUsedBytes);
    const fbUsedMB = Number((fbUsedBytes / (1024 * 1024)).toFixed(2));
    const fbFreeGB = Number((fbFreeBytes / (1024 * 1024 * 1024)).toFixed(3));
    const fbUsedPercent = Number(((fbUsedBytes / FIREBASE_LIMIT_BYTES) * 100).toFixed(4));
    const fbFreePercent = Number((100 - fbUsedPercent).toFixed(2));

    // 3. User & Financial Aggregates
    const [allUsers, allOrders] = await Promise.all([
      getAllUsers().catch(() => []),
      getAllOrders().catch(() => [])
    ]);

    let totalMemberBalance = 0;
    let totalLifetimeSpent = 0;
    let totalCurrentDue = 0;

    for (const u of (allUsers as any[])) {
      totalMemberBalance += Number(u.balance) || 0;
      totalLifetimeSpent += Number(u.totalSpent) || 0;
      totalCurrentDue += Number(u.currentDue) || 0;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      mongodb: {
        provider: 'MongoDB Atlas Cloud',
        dbName: mongoStats.db || 'shopify_catering',
        plan: 'Atlas M0 Shared Cluster (Free Tier)',
        status: db ? 'connected' : 'connecting',
        allocatedLimitBytes: MONGO_LIMIT_BYTES,
        allocatedLimitMB: 512,
        dataSizeBytes: mongoDataSize,
        dataSizeFormatted: formatBytes(mongoDataSize),
        storageSizeBytes: mongoStorageSize,
        storageSizeFormatted: formatBytes(mongoStorageSize),
        indexSizeBytes: mongoIndexSize,
        indexSizeFormatted: formatBytes(mongoIndexSize),
        usedBytes: mongoUsedBytes,
        usedMB: mongoUsedMB,
        usedFormatted: formatBytes(mongoUsedBytes),
        freeBytes: mongoFreeBytes,
        freeMB: mongoFreeMB,
        freeFormatted: formatBytes(mongoFreeBytes),
        usedPercent: mongoUsedPercent,
        freePercent: mongoFreePercent,
        collectionsCount: mongoStats.collections || collectionsList.length,
        objectsCount: mongoStats.objects || 0,
        collections: collectionsList,
      },
      firebase: {
        provider: 'Firebase Cloud Storage & Auth',
        projectId: process.env.FIREBASE_PROJECT_ID || 'shopify-catering-service',
        bucketName: bucketName,
        plan: 'Spark (Free Tier)',
        status: fbBucketStatus,
        allocatedLimitBytes: FIREBASE_LIMIT_BYTES,
        allocatedLimitGB: 5,
        filesCount: fbFilesCount,
        usedBytes: fbUsedBytes,
        usedMB: fbUsedMB,
        usedFormatted: formatBytes(fbUsedBytes),
        freeBytes: fbFreeBytes,
        freeGB: fbFreeGB,
        freeFormatted: `${fbFreeGB} GB`,
        usedPercent: fbUsedPercent,
        freePercent: fbFreePercent,
        totalAuthUsers: allUsers.length,
      },
      financials: {
        totalMemberBalance,
        totalLifetimeSpent,
        totalCurrentDue,
        totalOrdersCount: allOrders.length,
        totalActiveUsers: allUsers.length,
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch storage metrics' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
