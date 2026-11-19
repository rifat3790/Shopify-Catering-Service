import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || 'shopify-catering-service';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@shopify-catering-service.iam.gserviceaccount.com';

const FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzsBzTdoYupFcV
KozLUkvlH9WfU3tuNfKDGWlTbn5ImRPvbPtLVz9VjfoansgyO3YiWkejHvo9dAAi
VT+Q5pf3Gk8dxQAWrW13T5RUB5zQCtgJU4KoSM3GfOTyU/B/J5cN1czTpZSioMtJ
ABos/b+5UtxlV3A4f9Sx0Dx0ioxpXDybx+82UAgd3NcF9jF7oqi+fOBm7TfNrOEE
D+XVfI/1A0HZvGvig7hF3HgNdqdQS5B3alqnDx837USIQw/iDCMCZOj2BJmDr9fd
8WLLgWPAp064YynuJe4UzYiEpswhBZjr4AhNnRzkY5j1oH/xraW19iHeYo5mmEp+
KfhBIdTHAgMBAAECggEARgDKeiemxu0HcBuPlnaNUspAMz4WzC0AOcrgmbxmPmpE
tfZDQGrRJceWNGC/pbI8p818MzSSUPasRrPne9AaTA5X3EUvb6ZJCz5ZjxMYKITQ
/XEnaeBTKozltPK2sxL9akps7deIPINgLyR3DigdVVnOuzyBX8GNX2i85LpFUZYS
eVYQFo1c7vRNE7wo7GRfezF245rkbX+GVav42oVqwrDRMiLG2fAg8kq1jUDTDmwS
etUjuIX6wBuZh1FcSJ4+cMGQZLX86rE8MlyFvMH/Kg9tYCHXbPnPk7Zqs55Q9sKI
r7d3/47koQ4WhRu6enBB/wuxW/lnhfKu85KoIGtvAQKBgQDWofi8EzrmtMBhpc0h
ZxpQZw58uDtdI0U4XygftPJlGjiJATB/oivfJ30Pg3P4R2cBsknCKbPLlsvYsiyd
IpJyi8W8aG8/is3K3bpyvYqc2y+ZwDH6ibLoDEpp1niM7VI4mXyPMq0rombrpdr9
EXGIrvCcF6T5Y9yrUNHTbpnjYQKBgQDWUfVJY9cM/kFGprIFICaGygvTpiyes9SW
/Dv46sYxq/OhwUj5o8cI3Hsp5KCewlBlJoKCnWzHwcs3RHjVY+MEvLpa0C0tsBFt
gE7Cj5dIuHtxRirFw31JCTbQIaMcigPV5EElDTthhDc8nsyItbHIFrn1MhP6AWMj
Q/LB7c7RJwKBgGGO+/2ZDBPjovJ/p68AK2DShy4/m5QpPQRzlExdNjSoZ3w20zGg
qCply52qlaML6ZFG1enwhK4MnBmiW08NcN2qFLYgDjkmwYXtpRsUdpX3tzo+tzj3
MB/zvjs/ZkpAcTgS5CA+26HSzs9b8x9Gt4F2ax24TZ+iOaKRON7PDhnhAoGAUaJo
Pusjp9RVAtdN6bvkUOU2+ghK6Kxw5o3vPhIXKiZoJ43bARPMJWjuFPf74lz7iHvR
rHTQUYpUoJmZORbSCyTkCuFOxB9TlBUSavOM2WtDwdLLSgb7es1iroaRfbZoXZmS
4s0WeD+HVrTaDZy/ugpGDMplZ44NuAoStqGhbHMCgYBAukuQhOIRe6IN258tGzPr
FGtQVVLANoc2t2A/N9hIGEGPDb5Wd+8YGFcImypBv54+d+CUjGCZz+p6cz7+WuPm
2WzFhJrJmN/lGzYXFfwwn7LIFNyBWmp+TrlcTOx14+BG/FY0ik5iS/mWSHqiaUrF
xy0ZThFNDNSK5kKRFFTF8Q==
-----END PRIVATE KEY-----`;

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : FALLBACK_PRIVATE_KEY;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;

export async function getFirebaseUsersList(): Promise<Array<{
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  lastLoginAt?: string;
}>> {
  if (!adminAuth) {
    console.warn("adminAuth is not initialized");
    return [];
  }
  try {
    const listResult = await adminAuth.listUsers(1000);
    return listResult.users.map(u => ({
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || u.email?.split('@')[0] || 'Member',
      photoURL: u.photoURL || undefined,
      createdAt: u.metadata?.creationTime,
      lastLoginAt: u.metadata?.lastSignInTime,
    })).filter(u => !!u.email);
  } catch (err) {
    console.warn("Failed to fetch Firebase Auth users:", err);
    return [];
  }
}

export default admin;
