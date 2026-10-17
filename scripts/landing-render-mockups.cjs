// Usage: node scripts/landing-render-mockups.cjs <projectRoot> <shotsDir> <outDir>
// shotsDir holds 1170x2532 PNG screenshots of the app at 390x844@3x (mock mode), named as in the calls at the bottom.
// Builds device renders from real mobile screenshots: a phone frame drawn as SVG, the screen masked into it,
// then rotated compositions with soft shadows. Screens are used as captured (owner asked for no blur).
const path = require("path");
const fs = require("fs");
const sharp = require(path.resolve(process.argv[2], "node_modules/sharp"));
const [, , , shots, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const SW = 1170;
const SH = 2532;
const BEZEL = 44;
const W = SW + BEZEL * 2;
const H = SH + BEZEL * 2;
const R_OUT = 190;
const R_IN = 150;
const STATUS = 150;

function svg(body, w = W, h = H) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
}

async function screen(name) {
  const cleaned = await sharp(path.join(shots, `${name}.png`)).png().toBuffer();
  // The app header starts at y=0, so the top of the screen gets a status bar and the bottom is trimmed to keep the 390x844 ratio.
  const body = await sharp(cleaned).extract({ left: 0, top: 0, width: SW, height: SH - STATUS }).toBuffer();
  const status = svg(
    `<rect width="${SW}" height="${STATUS}" fill="#ffffff"/>
     <text x="96" y="104" font-family="Segoe UI, Arial" font-size="52" font-weight="700" fill="#102033">9:41</text>
     <rect x="${SW / 2 - 175}" y="34" width="350" height="104" rx="52" fill="#05080d"/>
     <rect x="${SW - 250}" y="70" width="44" height="30" rx="6" fill="#102033"/>
     <rect x="${SW - 190}" y="66" width="86" height="38" rx="11" fill="none" stroke="#102033" stroke-width="5"/>
     <rect x="${SW - 182}" y="74" width="62" height="22" rx="5" fill="#102033"/>`,
    SW,
    STATUS,
  );
  const full = await sharp({ create: { width: SW, height: SH, channels: 4, background: "#ffffff" } })
    .composite([
      { input: await sharp(status).png().toBuffer(), left: 0, top: 0 },
      { input: body, left: 0, top: STATUS },
    ])
    .png()
    .toBuffer();
  const mask = svg(`<rect width="${SW}" height="${SH}" rx="${R_IN}" ry="${R_IN}" fill="#fff"/>`, SW, SH);
  return sharp(full).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function phone(name) {
  const frame = svg(`
    <defs>
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b4a5e"/><stop offset="0.45" stop-color="#121c2b"/><stop offset="1" stop-color="#2c3a4d"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" rx="${R_OUT}" fill="url(#rim)"/>
    <rect x="7" y="7" width="${W - 14}" height="${H - 14}" rx="${R_OUT - 7}" fill="#0b121c"/>`);
  const glare = svg(`
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="${BEZEL}" y="${BEZEL}" width="${SW}" height="${SH}" rx="${R_IN}" fill="url(#g)"/>`);
  return sharp(frame)
    .composite([
      { input: await screen(name), left: BEZEL, top: BEZEL },
      { input: glare, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// Rotates a phone and places it on a transparent canvas with a navy-tinted drop shadow.
async function placed(buf, angle, scale) {
  const scaled = await sharp(buf).resize({ width: Math.round(W * scale) }).png().toBuffer();
  const rotated = await sharp(scaled).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(rotated).metadata();
  const shadow = await sharp(rotated)
    .ensureAlpha()
    .extractChannel("alpha")
    .toColourspace("b-w")
    .toBuffer()
    .then((alpha) =>
      sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: "#102033" } })
        .joinChannel(alpha)
        .png()
        .toBuffer(),
    )
    .then((s) => sharp(s).blur(40).ensureAlpha(0.32).png().toBuffer());
  return { img: rotated, shadow, w: meta.width, h: meta.height };
}

async function single(name, angle, out, width = 900) {
  const p = await placed(await phone(name), angle, 1);
  const pad = 140;
  const cw = p.w + pad * 2;
  const ch = p.h + pad * 2;
  const canvas = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: p.shadow, left: pad + 10, top: pad + 70 },
      { input: p.img, left: pad, top: pad },
    ])
    .png()
    .toBuffer();
  const info = await sharp(canvas).resize({ width }).webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(outDir, out));
  console.log(out, info.width, info.height, info.size);
}


(async () => {
  await single("buat", -4, "phone-buat.webp");
  await single("nego", 4, "phone-nego.webp");
  await single("keuangan", -5, "phone-keuangan.webp");
  await single("kreator", 5, "phone-kreator.webp");
})();
