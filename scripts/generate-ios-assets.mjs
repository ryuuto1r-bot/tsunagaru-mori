import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconPath = path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const splashDir = path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset");
const pwaDir = path.join(root, "public/pwa");

const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="158" y1="90" x2="846" y2="934" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F2F5E9"/>
      <stop offset="0.46" stop-color="#DDE9D2"/>
      <stop offset="1" stop-color="#9DBB85"/>
    </linearGradient>
    <linearGradient id="trunk" x1="451" y1="720" x2="569" y2="365" gradientUnits="userSpaceOnUse">
      <stop stop-color="#513325"/>
      <stop offset="0.55" stop-color="#84604A"/>
      <stop offset="1" stop-color="#5D3D2C"/>
    </linearGradient>
    <radialGradient id="leaf" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(438 294) rotate(45) scale(384 304)">
      <stop stop-color="#C7E5B3"/>
      <stop offset="0.46" stop-color="#6FA45B"/>
      <stop offset="1" stop-color="#2F6B36"/>
    </radialGradient>
    <filter id="shadow" x="192" y="174" width="640" height="690" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="38" stdDeviation="42" flood-color="#1E331F" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bg)"/>
  <circle cx="168" cy="162" r="126" fill="white" opacity="0.38"/>
  <circle cx="866" cy="822" r="168" fill="#3F7B3B" opacity="0.12"/>
  <g filter="url(#shadow)">
    <ellipse cx="512" cy="766" rx="248" ry="46" fill="#63725B" opacity="0.18"/>
    <ellipse cx="512" cy="728" rx="188" ry="44" fill="#FFFDF2" stroke="#D6CEBB" stroke-width="9"/>
    <path d="M502 716C480 615 494 490 520 365" stroke="url(#trunk)" stroke-width="82" stroke-linecap="round"/>
    <path d="M518 512C430 466 374 416 326 350" stroke="#6B4A38" stroke-width="40" stroke-linecap="round"/>
    <path d="M531 492C626 439 690 389 736 318" stroke="#73513D" stroke-width="40" stroke-linecap="round"/>
    <path d="M524 386C506 304 527 248 580 176" stroke="#7A5742" stroke-width="34" stroke-linecap="round"/>
    <ellipse cx="344" cy="360" rx="164" ry="122" transform="rotate(-15 344 360)" fill="url(#leaf)"/>
    <ellipse cx="510" cy="280" rx="184" ry="136" transform="rotate(8 510 280)" fill="url(#leaf)"/>
    <ellipse cx="681" cy="362" rx="162" ry="118" transform="rotate(17 681 362)" fill="url(#leaf)"/>
    <ellipse cx="472" cy="462" rx="176" ry="124" transform="rotate(13 472 462)" fill="url(#leaf)"/>
    <ellipse cx="622" cy="470" rx="146" ry="104" transform="rotate(-11 622 470)" fill="url(#leaf)"/>
    <circle cx="684" cy="312" r="38" fill="#F2C84C"/>
    <circle cx="338" cy="458" r="28" fill="#D98B3E"/>
    <circle cx="602" cy="540" r="31" fill="#D98B3E"/>
  </g>
</svg>`;

const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#F6F4EC"/>
  <circle cx="725" cy="578" r="384" fill="#DCE8D0" opacity="0.65"/>
  <circle cx="2180" cy="2140" r="520" fill="#E8E0C9" opacity="0.42"/>
  <g transform="translate(854 772) scale(1)">
    ${iconSvg
      .replace(/<svg[^>]*>/, "")
      .replace("</svg>", "")
      .replace('<rect width="1024" height="1024" rx="224" fill="url(#bg)"/>', '<rect width="1024" height="1024" rx="224" fill="#EAF1E1"/>')}
  </g>
  <text x="1366" y="2050" text-anchor="middle" font-size="96" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif" font-weight="800" fill="#253126">つながる森</text>
  <text x="1366" y="2160" text-anchor="middle" font-size="44" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif" font-weight="700" fill="#6C7868">todoが実になる庭</text>
</svg>`;

await fs.mkdir(path.dirname(iconPath), { recursive: true });
await fs.mkdir(splashDir, { recursive: true });
await fs.mkdir(pwaDir, { recursive: true });

await sharp(Buffer.from(iconSvg)).png().resize(1024, 1024).toFile(iconPath);
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await sharp(Buffer.from(splashSvg)).png().resize(2732, 2732).toFile(path.join(splashDir, name));
}

await sharp(Buffer.from(iconSvg)).png().resize(180, 180).toFile(path.join(pwaDir, "apple-touch-icon.png"));
await sharp(Buffer.from(iconSvg)).png().resize(192, 192).toFile(path.join(pwaDir, "icon-192.png"));
await sharp(Buffer.from(iconSvg)).png().resize(512, 512).toFile(path.join(pwaDir, "icon-512.png"));
await sharp(Buffer.from(iconSvg)).png().resize(512, 512).toFile(path.join(pwaDir, "icon-maskable-512.png"));
await sharp(Buffer.from(iconSvg)).png().resize(48, 48).toFile(path.join(pwaDir, "favicon-48.png"));

console.log("Generated iOS and PWA app assets.");
