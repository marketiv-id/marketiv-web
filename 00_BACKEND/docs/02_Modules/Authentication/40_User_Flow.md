# Authentication — User Flow

## Register → Verifikasi Email → Onboarding

### UMKM (manual)

```text
Landing Page
↓
Daftar UMKM (/register?role=umkm)
↓
Isi Email, Nomor WhatsApp, Password
↓
account.create → createEmailPasswordSession → updatePrefs({ role: "umkm", phone })
↓
create-user-profile (sinkron; gagal → profileProvisioned:false, tidak menggagalkan register)
↓
requestEmailOtp → layar "Kode Verifikasi 6 Digit" (EmailVerificationPending)
↓
confirmEmailOtp (account.createSession(userId, kode))
↓
/onboarding (Nama Usaha, Kategori, Kota, Deskripsi, Kontak, Logo)
↓
Dashboard UMKM
```

### Creator (manual)

```text
Landing Page
↓
Daftar Creator (/register?role=creator)
↓
Isi Nama Lengkap, Email, Password
↓
account.create(name) → createEmailPasswordSession → updatePrefs({ role: "creator", displayName })
↓
create-user-profile (sinkron)
↓
Verifikasi OTP email (sama seperti UMKM)
↓
/onboarding (Display Name, Niche, Kota, Bio, Avatar, TikTok)
↓
Dashboard Creator
```

### Google OAuth (UMKM & Creator, bila flag aktif)

```text
Klik "Google" di /login atau /register (role terpilih)
↓
account.createOAuth2Session → Google
↓
/auth/callback?role=<role>&next=<path>
↓
getSession()
  ├─ sukses, role cocok      → dashboard / next
  ├─ sukses, role beda       → logout → /login?role=..&error=role_mismatch&actualRole=..
  ├─ not_found + role        → setOAuthAccountPrefs(role) → create-user-profile → refresh → /onboarding
  │                              gagal → kartu recovery (coba lagi / keluar)
  ├─ not_found tanpa role    → /register?error=profile_missing
  └─ error lain              → /login?error=oauth
```

- Tidak ada form perantara: seluruh data usaha UMKM (termasuk Nomor WhatsApp) diisi sekali di wizard `/onboarding`.

## Login

```text
Login (/login?role=umkm|creator)
↓
Email + Password ATAU Google
↓
createEmailPasswordSession
↓
getSession() → baris users ditemukan?
  ├─ not_found → provisionUserProfile() sekali → getSession() lagi
↓
status = suspended? → deleteSession('current') → tampil "Akun Ditangguhkan"
↓
role akun = tab portal? tidak → logout + banner mismatch
↓
Dashboard (RoleGuard) → profil belum lengkap? → /onboarding
↓
TosConsentGate → needsConsent? → interstitial setuju T&C
```

- Appwrite Auth session saja belum cukup untuk masuk dashboard; `getSession()` wajib menemukan baris `users` berdasarkan kolom `userId`.
- `not_found` setelah login/OAuth berarti profil Marketiv belum selesai dibuat, bukan credential salah.
- Provisioning gagal menampilkan kartu recovery (coba ulang / keluar), bukan redirect diam-diam.
- Melewati onboarding berlaku per sesi browser; `login()` menghapus penanda skip sehingga wizard ditawarkan lagi.

## Forgot Password (OTP)

```text
Klik Lupa Password (/forgot-password)
↓
Input Email
↓
request-password-otp Function
↓ rate limit 3 request / 10 menit per email+IP (429 bila lewat)
↓ email terdaftar → Appwrite Email OTP dikirim; tidak terdaftar → tetap { success: true }
↓
Layar "Cek email kamu" → tombol ke /reset-password?email=<email>
↓
Input Email Akun, OTP 6 digit, password baru + konfirmasi
↓
reset-password-with-otp Function
↓ lookup user by email → account.createSession(userId, OTP) → users.updatePassword()
↓ hapus sesi OTP (best-effort)
↓
Logout sesi browser → /login
```

## Re-consent T&C

```text
Dashboard (RoleGuard → TosConsentGate)
↓
accept-tos { action: "status" }
↓ needsConsent?
  ├─ tidak → render dashboard
  └─ ya    → dialog T&C → accept-tos { action: "accept", tos_version } → render dashboard
```

## Lihat Juga

- [30_Business_Rules.md](30_Business_Rules.md) — aturan yang mengikat flow ini.
- [60_API.md](60_API.md) — fungsi yang dipanggil tiap langkah.
