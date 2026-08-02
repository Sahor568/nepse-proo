import 'dotenv/config';
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dns from 'node:dns';
import { getDb } from '../db.js';
import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nepse_pro_jwt_super_secret_2026';
const JWT_EXPIRES = '7d';
const OTP_EXPIRES = 10 * 60 * 1000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'https://api.momoflix.xyz/api/auth/google/callback';

console.log('[Google OAuth] Checking config...');
console.log('[Google OAuth] CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
console.log('[Google OAuth] CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
  }, async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
    const db = await getDb();
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) return done(null, false);

    let user = await db.get('SELECT * FROM users WHERE googleId = ?', [profile.id]);
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (user) {
        await db.run(
          'UPDATE users SET googleId = ?, provider = ?, isVerified = 1, emailOTP = NULL, emailOTPExpiry = NULL WHERE id = ?',
          [profile.id, 'google', (user as any).id]
        );
        (user as any).googleId = profile.id;
        (user as any).provider = 'google';
        (user as any).isVerified = 1;
        (user as any).emailOTP = null;
        (user as any).emailOTPExpiry = null;
      } else {
        const result = await db.run(
          'INSERT INTO users (name, email, googleId, provider, isVerified) VALUES (?, ?, ?, ?, ?)',
          [profile.displayName || email.split('@')[0], email, profile.id, 'google', 1]
        );
        (user as any) = {
          id: result.lastID,
          name: profile.displayName || email.split('@')[0],
          email,
          googleId: profile.id,
          provider: 'google',
          isVerified: 1,
          emailOTP: null,
          emailOTPExpiry: null,
        };
      }
    }
    return done(null, user);
  }));

  passport.serializeUser((user: any, done: any) => done(null, user?.id));
  passport.deserializeUser(async (id: any, done: any) => {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  });
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildOtpHtml(otp: string): string {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">NEPSE Pro Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `;
}

function buildGoogleUsageHtml(name: string, email: string): string {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">NEPSE Pro account used</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>This email address (<strong>${email}</strong>) is now being used in the <strong>NEPSE Pro</strong> app via Google sign-in.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Login Method:</strong> Google Sign-In</p>
          </div>
          <p>You can now access your dashboard and start tracking NEPSE stocks.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you did not try to sign in, you can safely ignore this message.
          </p>
        </div>
      `;
}

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 587;

function sanitizeEmailAddress(value: string): string {
  return value.replace(/^\"|\"$/g, '').trim();
}

function isValidEmailAddress(value: string): boolean {
  const emailOnlyRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameEmailRe = /^.+\s<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
  return emailOnlyRe.test(value) || nameEmailRe.test(value);
}

function getGmailFromAddress(): string {
  const rawFrom = sanitizeEmailAddress(process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@gmail.com');
  if (isValidEmailAddress(rawFrom)) {
    return rawFrom;
  }

  console.warn('[Email] Invalid EMAIL_FROM format, falling back to SMTP_USER');
  const smtpUser = process.env.SMTP_USER ? sanitizeEmailAddress(process.env.SMTP_USER) : 'no-reply@gmail.com';
  return isValidEmailAddress(smtpUser) ? smtpUser : 'no-reply@gmail.com';
}

function getGmailSmtpConfig() {
  const smtpUser = process.env.SMTP_USER ? sanitizeEmailAddress(process.env.SMTP_USER) : '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || String(DEFAULT_SMTP_PORT), 10);

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are missing. Set SMTP_USER and SMTP_PASS for Gmail SMTP.');
  }

  return {
    host: GMAIL_SMTP_HOST,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
    family: 4,
    lookup: (hostname: string, options: dns.LookupOneOptions, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || '15000'),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || '15000'),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000'),
  };
}

function getFallbackGmailSmtpConfig() {
  const baseConfig = getGmailSmtpConfig();
  if (baseConfig.port === 465) {
    return null;
  }

  return {
    ...baseConfig,
    port: 465,
    secure: true,
    family: 4,
    lookup: (hostname: string, options: dns.LookupOneOptions, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
      dns.lookup(hostname, { ...options, family: 4 }, callback);
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || '15000'),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || '15000'),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000'),
  };
}

async function sendGmailSmtpEmail(email: string, subject: string, html: string): Promise<{ success: boolean; previewUrl?: string | undefined }> {
  try {
    const nodemailer = await import('nodemailer');
    const attempts = [getGmailSmtpConfig(), getFallbackGmailSmtpConfig()].filter(Boolean) as Array<ReturnType<typeof getGmailSmtpConfig>>;
    let lastError: unknown;

    for (const smtpConfig of attempts) {
      try {
        const transporter = nodemailer.createTransport(smtpConfig);
        const info = await transporter.sendMail({
          from: getGmailFromAddress(),
          to: email,
          subject,
          html,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        if (previewUrl) {
          console.log('[Email] Preview URL:', previewUrl);
        }
        return { success: true, previewUrl };
      } catch (error: any) {
        lastError = error;
        const shouldRetry = error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET' || error?.code === 'ECONNREFUSED';
        if (!shouldRetry || smtpConfig.port === 465) {
          break;
        }

        console.warn(`[Email] SMTP port ${smtpConfig.port} failed (${error?.code || 'unknown'}), retrying on 465...`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Gmail SMTP send failed');
  } catch (error) {
    console.error('[Email OTP Error]:', error);
    return { success: false };
  }
}

async function sendTransactionalEmail(email: string, subject: string, html: string): Promise<{ success: boolean; previewUrl?: string | undefined }> {
  return sendGmailSmtpEmail(email, subject, html);
}

async function sendEmailOtp(email: string, otp: string): Promise<{ success: boolean; previewUrl?: string | undefined }> {
  const result = await sendTransactionalEmail(email, 'Your NEPSE Pro Verification Code', buildOtpHtml(otp));
  if (!result.success && process.env.NODE_ENV !== 'production') {
    console.log('[Email OTP] Development mode - OTP:', otp);
  }
  return result;
}

async function sendGoogleUsageEmail(email: string, name: string): Promise<void> {
  try {
    await sendTransactionalEmail(email, 'Your NEPSE Pro account is active', buildGoogleUsageHtml(name, email));
    console.log(`[Google Usage Email] Sent to ${email}`);
  } catch (error) {
    console.error('[Google Usage Email Error]:', error);
  }
}

async function sendSmsOtp(mobile: string, otp: string): Promise<{ success: boolean; message?: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'NEPSEPRO';

  if (!authKey) {
    console.log(`[SMS OTP] MSG91 not configured - OTP for ${mobile}: ${otp}`);
    return { success: true, message: 'SMS OTP: ' + otp };
  }

  try {
    const cleanMobile = mobile.replace(/\D/g, '');
    const fullMobile = cleanMobile.startsWith('977') ? cleanMobile : '977' + cleanMobile;

    const message = `Your NEPSE Pro verification code is ${otp}`;

    const response = await fetch(`https://api.msg91.com/api/sendotp.php?authkey=${authKey}&mobile=${fullMobile}&message=${encodeURIComponent(message)}&sender=${senderId}&otp=${otp}`, {
      method: 'GET',
    });

    const responseText = await response.text();
    console.log('[SMS OTP MSG91 Response]:', responseText);

    if (response.ok && responseText.includes('success')) {
      console.log(`[SMS OTP] Sent to ${mobile}: ${otp}`);
      return { success: true };
    } else {
      console.error('[SMS OTP Error]:', responseText);
      return { success: false, message: responseText };
    }
  } catch (error: any) {
    console.error('[SMS OTP Error]:', error.message);
    console.log(`[SMS OTP] Fallback - OTP for ${mobile}: ${otp}`);
    return { success: true, message: 'SMS OTP: ' + otp };
  }
}

// ─── POST /api/auth/signup/init ───────────────────────────────────────────────
router.post('/signup/init', async (req: Request, res: Response) => {
  try {
    const { name, email, password, mobile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = await getDb();

    const existing = await db.get('SELECT id, isVerified FROM users WHERE email = ?', [email]);
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailOTP = generateOTP();
    const emailOTPExpiry = new Date(Date.now() + OTP_EXPIRES).toISOString();

    const result = await db.run(
      'INSERT INTO users (name, email, password, mobile, emailOTP, emailOTPExpiry, provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), passwordHash, mobile || '', emailOTP, emailOTPExpiry, 'email']
    );

    // Fire‑and‑forget email OTP – do not await to speed up response
    sendEmailOtp(email, emailOTP).catch(err => {
      console.error('[signup/init] failed to send email OTP:', err);
    });

    return res.status(201).json({
      message: 'Verification code sent to your email.',
      userId: result.lastID,
      email,
      requiresVerification: true,
      devOtp: process.env.NODE_ENV !== 'production' ? emailOTP : undefined,
      // previewUrl not available when sending async; omit in production
      devPreviewUrl: undefined,
    });
  } catch (e: any) {
    console.error('[signup/init]', e.message);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/verify/email ─────────────────────────────────────────────
router.post('/verify/email', async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, provider, emailOTP, emailOTPExpiry, isVerified FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    if (new Date(user.emailOTPExpiry) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (user.emailOTP !== otp) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await db.run('UPDATE users SET isVerified = 1, emailOTP = NULL, emailOTPExpiry = NULL WHERE id = ?', [userId]);

    if (user.provider === 'google') {
      sendWelcomeEmail(user.email, user.name || user.email).catch(err => {
        console.error('[verify/email] failed to send welcome email:', err);
      });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      message: 'Email verified successfully!',
      token,
      user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile || '' },
    });
  } catch (e: any) {
    console.error('[verify/email]', e.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/resend/email-otp ───────────────────────────────────────────
router.post('/resend/email-otp', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const db = await getDb();
    const user = await db.get('SELECT id, email, isVerified FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    const emailOTP = generateOTP();
    const emailOTPExpiry = new Date(Date.now() + OTP_EXPIRES).toISOString();

    await db.run('UPDATE users SET emailOTP = ?, emailOTPExpiry = ? WHERE id = ?', [emailOTP, emailOTPExpiry, userId]);
    await sendEmailOtp(user.email, emailOTP);

    return res.json({ message: 'New verification code sent to your email.' });
  } catch (e: any) {
    console.error('[resend/email-otp]', e.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/send/sms-otp ──────────────────────────────────────────────
router.post('/send/sms-otp', async (req: Request, res: Response) => {
  try {
    const { userId, mobile } = req.body;
    if (!userId && !mobile) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    const db = await getDb();
    let user;
    if (userId) {
      user = await db.get('SELECT id, mobile, isVerified FROM users WHERE id = ?', [userId]);
    } else {
      user = await db.get('SELECT id, mobile, isVerified FROM users WHERE mobile = ?', [mobile]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const smsOTP = generateOTP();
    const smsOTPExpiry = new Date(Date.now() + OTP_EXPIRES).toISOString();

    await db.run('UPDATE users SET smsOTP = ?, smsOTPExpiry = ? WHERE id = ?', [smsOTP, smsOTPExpiry, user.id]);
    await sendSmsOtp(user.mobile, smsOTP);

    return res.json({ message: `SMS verification code sent to ${user.mobile}.`, userId: user.id });
  } catch (e: any) {
    console.error('[send/sms-otp]', e.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/verify/sms ────────────────────────────────────────────────
router.post('/verify/sms', async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT id, mobile, smsOTP, smsOTPExpiry, isVerified FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (new Date(user.smsOTPExpiry) < new Date()) {
      return res.status(400).json({ error: 'SMS OTP has expired. Please request a new one.' });
    }

    if (user.smsOTP !== otp) {
      return res.status(400).json({ error: 'Invalid SMS verification code.' });
    }

    await db.run('UPDATE users SET smsOTP = NULL, smsOTPExpiry = NULL WHERE id = ?', [userId]);

    return res.json({ message: 'Mobile number verified successfully!' });
  } catch (e: any) {
    console.error('[verify/sms]', e.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, password, mobile, bio, isVerified FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let passwordMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = user.password === password;
      if (passwordMatch) {
        const newHash = await bcrypt.hash(password, 12);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email first.',
        requiresVerification: true,
        userId: user.id,
        email: user.email,
      });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile || '', bio: user.bio || '' },
    });
  } catch (e: any) {
    console.error('[login]', e.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

  async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  try {
    await sendTransactionalEmail(email, 'Your NEPSE Pro account is active', buildGoogleUsageHtml(name, email));
    console.log(`[Google Usage Email] Sent to ${email}`);
  } catch (error) {
    console.error('[Google Usage Email Error]:', error);
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1]!;
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: number; email: string };

    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, mobile, bio, provider, isVerified FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ user });
  } catch (e: any) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── Google OAuth Routes ──────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google login is not configured. Please contact admin.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect('https://momoflix.xyz/login?error=google_not_configured');
    }
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' })(req, res, next);
  },
  async (req: Request, res: Response) => {
    const user = (req as Request & { user?: any }).user;
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    sendGoogleUsageEmail(user.email, user.name);

    const frontendUrl = process.env.FRONTEND_URL || 'https://momoflix.xyz';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&userId=${user.id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&provider=${user.provider || 'google'}`);
  }
);

router.get('/google/failure', (_req, res) => {
  res.status(401).json({ error: 'Google authentication failed.' });
});

export default router;