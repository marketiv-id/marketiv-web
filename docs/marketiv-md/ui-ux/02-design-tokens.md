# 02 — Design Tokens Marketiv Light OS

> Dokumen ini mendefinisikan token visual resmi untuk UI baru Marketiv.
> Semua implementasi Tailwind, React component, dan AI-generated UI wajib mengikuti token ini.

## 1. Token Philosophy

Design token dibuat agar UI Marketiv konsisten dari landing page sampai dashboard.
Token ini menghindari hardcoded color, spacing, radius, font, dan shadow.
Semua komponen harus mengambil nilai dari sistem token, bukan membuat style spontan.
Token harus cocok untuk light mode, mobile-first, dan dashboard SaaS marketplace.

## 2. Primary Color — Marketiv Orange

Primary orange adalah warna identitas utama Marketiv.
Orange digunakan untuk CTA utama, active state, progress penting, icon accent, dan highlight campaign.
Orange tidak boleh dipakai sebagai background besar di dashboard karena dapat mengurangi readability.

```ts
primary: {
  50:  '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
}
```

## 3. Secondary Color — Deep Navy

Secondary navy digunakan untuk teks premium, sidebar, heading tertentu, dan elemen trust.
Navy memberi rasa aman dan profesional pada sistem escrow, keuangan, dan dashboard.
Navy tidak boleh terlalu banyak dipakai untuk surface besar pada light mode.

```ts
secondary: {
  50:  '#eef6ff',
  100: '#d9ecff',
  200: '#b7dcff',
  300: '#85c4ff',
  400: '#4aa3ff',
  500: '#1f7fd4',
  600: '#315677',
  700: '#24425f',
  800: '#18324a',
  900: '#102033',
}
```

## 4. Neutral Colors

Neutral color dipakai untuk background, text, border, divider, disabled state, dan table.
Gunakan neutral warm agar UI tidak terasa dingin atau terlalu enterprise.

```ts
neutral: {
  0:   '#ffffff',
  25:  '#fffdf9',
  50:  '#fafaf7',
  100: '#f8f5ef',
  200: '#eee8dd',
  300: '#e8e2d8',
  400: '#c9c1b4',
  500: '#9a9185',
  600: '#737373',
  700: '#525252',
  800: '#2f2f2f',
  900: '#171717',
}
```

## 5. Semantic Colors

Semantic color harus konsisten agar user cepat mengenali status sistem.
Gunakan versi soft untuk badge dan alert background.
Gunakan versi solid untuk icon, border emphasis, dan destructive actions.

```ts
semantic: {
  success: { soft: '#dcfce7', DEFAULT: '#16a34a', strong: '#166534' },
  warning: { soft: '#fef3c7', DEFAULT: '#d97706', strong: '#92400e' },
  danger:  { soft: '#fee2e2', DEFAULT: '#dc2626', strong: '#991b1b' },
  info:    { soft: '#dbeafe', DEFAULT: '#2563eb', strong: '#1e40af' },
}
```

## 6. Role Colors

Role color membantu membedakan UMKM, Kreator, dan Admin secara cepat.
Role color hanya dipakai untuk badge dan metadata kecil.
Jangan membuat seluruh dashboard role berubah warna total.

```ts
role: {
  umkm:    { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  kreator: { bg: '#eef6ff', text: '#24425f', border: '#b7dcff' },
  admin:   { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
}
```

## 7. Background Tokens

Background base digunakan untuk halaman utama.
Surface digunakan untuk card, modal, table container, dan panel.
Muted surface digunakan untuk nested container dan inactive state.

```ts
background: {
  base: '#fffdf9',
  soft: '#f8f5ef',
  card: '#ffffff',
  muted: '#fafaf7',
  overlay: 'rgba(16, 32, 51, 0.48)',
}
```

## 8. Text Tokens

Text primary digunakan untuk title dan data penting.
Text secondary digunakan untuk body dan metadata.
Text muted digunakan untuk helper text, placeholder, dan empty state.

```ts
text: {
  primary: '#171717',
  secondary: '#525252',
  muted: '#737373',
  inverse: '#ffffff',
  brand: '#c2410c',
  trust: '#102033',
}
```

## 9. Typography

Gunakan Plus Jakarta Sans sebagai font utama.
Inter boleh digunakan sebagai fallback jika project ingin dashboard data-heavy.
Rekomendasi final untuk MVP adalah satu font: Plus Jakarta Sans.

```ts
fontFamily: {
  sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
}
```

## 10. Font Size Scale

```ts
fontSize: {
  xs: ['12px', { lineHeight: '16px' }],
  sm: ['14px', { lineHeight: '20px' }],
  base: ['16px', { lineHeight: '24px' }],
  lg: ['18px', { lineHeight: '28px' }],
  xl: ['20px', { lineHeight: '30px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['30px', { lineHeight: '38px' }],
  '4xl': ['36px', { lineHeight: '44px' }],
  '5xl': ['48px', { lineHeight: '56px' }],
  '6xl': ['60px', { lineHeight: '68px' }],
}
```

## 11. Font Weight

```ts
fontWeight: {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
}
```

## 12. Spacing Scale

Gunakan 4px base grid.
Spacing harus konsisten untuk layout, card, form, gap, dan padding.

```ts
spacing: {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
}
```

## 13. Radius Scale

Radius Marketiv harus modern dan lembut.
Gunakan radius besar untuk card dan modal.
Gunakan radius sedang untuk input dan button.

```ts
borderRadius: {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
}
```

## 14. Shadow Scale

Shadow harus sangat halus.
Jangan gunakan shadow berat seperti ecommerce lama.

```ts
boxShadow: {
  xs: '0 1px 2px rgba(16, 32, 51, 0.04)',
  sm: '0 4px 12px rgba(16, 32, 51, 0.06)',
  md: '0 12px 28px rgba(16, 32, 51, 0.08)',
  lg: '0 20px 48px rgba(16, 32, 51, 0.10)',
}
```

## 15. Border Tokens

```ts
borderColor: {
  subtle: '#e8e2d8',
  strong: '#c9c1b4',
  focus: '#f97316',
}
```

## 16. Breakpoints

Mobile-first wajib menjadi standar.
Viewport 375px harus selalu diuji pertama.

```ts
screens: {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

## 17. Z-Index Scale

```ts
zIndex: {
  base: '0',
  dropdown: '20',
  sticky: '30',
  overlay: '40',
  modal: '50',
  toast: '60',
}
```

## 18. Motion Tokens

Motion harus singkat dan tidak mengganggu.
Gunakan motion untuk feedback, bukan dekorasi berlebihan.

```ts
transitionDuration: {
  fast: '120ms',
  base: '180ms',
  slow: '240ms',
}
```

### Landing Motion Tokens

Khusus landing page `/` (GSAP). Token dashboard di atas tidak berubah.

```txt
ease enter      expo.out / power3.out
reveal          0.9s sampai 1.1s, offset y 32px
word stagger    0.04s
card stagger    0.08s
trigger         start "top 85%", once: true
scrub           0.6 sampai 1.2
hover           0.35s sampai 0.6s
```

Tidak memakai ease elastic atau bounce. Animasi saat scroll hanya `transform`, `opacity`, dan `clip-path`.

## 19. Tailwind Implementation Note

Semua token di atas harus dimasukkan ke `tailwind.config.ts`.
Gunakan class token seperti `bg-primary-500`, `text-secondary-900`, dan `border-neutral-300`.
Jangan menulis color hex langsung di komponen React.
Jika harus membuat warna baru, update dokumen ini terlebih dahulu.
