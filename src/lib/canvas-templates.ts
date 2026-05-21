// Canvas-based ad template renderer.
// All drawing is client-side only — never import this in a server component.

export type FontPair = 'modern-luxury' | 'clean-premium' | 'bold-impact' | 'classic-elegant';
export type BrandVoice = 'luxury-sophisticated' | 'friendly-local' | 'bold-confident' | 'warm-trustworthy';
export type TemplateType = 'before-after' | 'showcase' | 'promotion' | 'testimonial' | 'service' | 'print-flyer';
export type StyleVariant = 'luxury-dark' | 'clean-modern' | 'bold-impact';

export interface BrandConfig {
  businessName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  fontPair: FontPair;
  logoUrl?: string | null;
}

export interface TemplateConfig {
  type: TemplateType;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  ctaText: string;
  phone: string;
  styleVariant: StyleVariant;
  photoUrl?: string | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  testimonialText?: string;
  rating?: number;
  qrUrl?: string | null;
}

export const FONT_PAIRS: Record<FontPair, { display: string; body: string; googleUrl: string }> = {
  'modern-luxury':   { display: 'Playfair Display', body: 'Lato',              googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap' },
  'clean-premium':   { display: 'Montserrat',        body: 'Open Sans',         googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Open+Sans:wght@300;400;600&display=swap' },
  'bold-impact':     { display: 'Bebas Neue',         body: 'Raleway',           googleUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Raleway:wght@300;400;600;700&display=swap' },
  'classic-elegant': { display: 'Cormorant Garamond', body: 'Jost',              googleUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500;600&display=swap' },
};

export const PLATFORM_SIZES = [
  { id: 'instagram-feed',  label: 'Instagram Feed',    width: 1080, height: 1080 },
  { id: 'instagram-story', label: 'Instagram Story',   width: 1080, height: 1920 },
  { id: 'facebook-feed',   label: 'Facebook Feed',     width: 1200, height: 628  },
  { id: 'google-banner',   label: 'Google Banner',     width: 728,  height: 90   },
  { id: 'google-square',   label: 'Google Square',     width: 300,  height: 250  },
  { id: 'google-skyscraper', label: 'Google Skyscraper', width: 160, height: 600 },
  { id: 'whatsapp',        label: 'WhatsApp Image',    width: 800,  height: 800  },
  { id: 'print-flyer',     label: 'Print Flyer',       width: 2550, height: 3300 }, // 8.5×11 @ 300dpi
] as const;

export const CAMPAIGN_SIZES = [
  { id: 'instagram-feed',  label: 'Instagram Feed',   width: 1080, height: 1080, filename: 'instagram-feed.png'  },
  { id: 'instagram-story', label: 'Instagram Story',  width: 1080, height: 1920, filename: 'story.png'           },
  { id: 'facebook-feed',   label: 'Facebook Feed',    width: 1200, height: 628,  filename: 'facebook.png'        },
  { id: 'google-square',   label: 'Google 300×250',   width: 300,  height: 250,  filename: 'google-300x250.png'  },
  { id: 'whatsapp',        label: 'WhatsApp',         width: 800,  height: 800,  filename: 'whatsapp.png'        },
];

// ── Image loading ─────────────────────────────────────────────────────────────

export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => {
      // Second attempt without crossOrigin (for data URLs and same-origin)
      const img2 = new Image();
      img2.onload  = () => resolve(img2);
      img2.onerror = () => resolve(null);
      img2.src = url;
    };
    img.src = url;
  });
}

export async function ensureFontsLoaded(fontPair: FontPair): Promise<void> {
  if (typeof document === 'undefined') return;
  // Inject Google Fonts link if not already present
  const { googleUrl } = FONT_PAIRS[fontPair];
  const existingLink = document.querySelector(`link[href="${googleUrl}"]`);
  if (!existingLink) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleUrl;
    document.head.appendChild(link);
  }
  await document.fonts.ready;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(hex: string, amount = 0.3): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextWithShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur  = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  if (maxWidth) ctx.fillText(text, x, y, maxWidth);
  else          ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineHeight; }
  return curY;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export async function renderTemplate(
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig
): Promise<void> {
  canvas.width  = tmpl.width;
  canvas.height = tmpl.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  await ensureFontsLoaded(brand.fontPair);
  const fonts = FONT_PAIRS[brand.fontPair];

  // Pre-load all images in parallel
  const [logo, photo, beforePhoto, afterPhoto] = await Promise.all([
    brand.logoUrl ? loadImage(brand.logoUrl) : Promise.resolve(null),
    tmpl.photoUrl ? loadImage(tmpl.photoUrl) : Promise.resolve(null),
    tmpl.beforePhotoUrl ? loadImage(tmpl.beforePhotoUrl) : Promise.resolve(null),
    tmpl.afterPhotoUrl  ? loadImage(tmpl.afterPhotoUrl)  : Promise.resolve(null),
  ]);

  switch (tmpl.type) {
    case 'before-after':  drawBeforeAfter(ctx, canvas, brand, tmpl, fonts, logo, beforePhoto, afterPhoto); break;
    case 'showcase':      drawShowcase(ctx, canvas, brand, tmpl, fonts, logo, photo); break;
    case 'promotion':     drawPromotion(ctx, canvas, brand, tmpl, fonts, logo, photo); break;
    case 'testimonial':   drawTestimonial(ctx, canvas, brand, tmpl, fonts, logo, photo); break;
    case 'service':       drawServiceHighlight(ctx, canvas, brand, tmpl, fonts, logo, photo); break;
    case 'print-flyer':   await drawPrintFlyer(ctx, canvas, brand, tmpl, fonts, logo, beforePhoto, afterPhoto); break;
    default:              drawShowcase(ctx, canvas, brand, tmpl, fonts, logo, photo);
  }
}

// ── Before & After ────────────────────────────────────────────────────────────

function drawBeforeAfter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  beforeImg: HTMLImageElement | null,
  afterImg: HTMLImageElement | null,
) {
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.037);
  const barH = Math.round(H * 0.18);
  const photoH = H - barH;
  const half = W / 2;

  // ── Background ──
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // ── Left: before photo ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, half, photoH);
  ctx.clip();
  if (beforeImg) {
    drawCoverImage(ctx, beforeImg, 0, 0, half, photoH);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, photoH);
    g.addColorStop(0, '#2a2a2a'); g.addColorStop(1, '#111');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, half, photoH);
  }
  // Dark overlay on before side (emphasise "before" feel)
  ctx.fillStyle = tmpl.styleVariant === 'luxury-dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, half, photoH);
  ctx.restore();

  // ── Right: after photo ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(half, 0, half, photoH);
  ctx.clip();
  if (afterImg) {
    drawCoverImage(ctx, afterImg, half, 0, half, photoH);
  } else {
    const g = ctx.createLinearGradient(half, 0, half, photoH);
    g.addColorStop(0, '#1a1a1a'); g.addColorStop(1, '#333');
    ctx.fillStyle = g;
    ctx.fillRect(half, 0, half, photoH);
  }
  ctx.fillStyle = hexToRgba(brand.primaryColor, 0.12);
  ctx.fillRect(half, 0, half, photoH);
  ctx.restore();

  // ── Center divider ──
  ctx.strokeStyle = brand.secondaryColor;
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half, photoH);
  ctx.stroke();

  // ── BEFORE label ──
  const labelFontSize = Math.round(W * 0.032);
  ctx.font = `700 ${labelFontSize}px ${fonts.body}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '3px';
  ctx.textBaseline = 'top';
  ctx.fillText('BEFORE', pad, pad + labelFontSize * 0.3);

  // ── AFTER label ──
  ctx.fillText('AFTER', half + pad, pad + labelFontSize * 0.3);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';

  // ── Gradient into bottom bar ──
  const fadeH = Math.round(photoH * 0.25);
  const fade = ctx.createLinearGradient(0, photoH - fadeH, 0, photoH);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, brand.primaryColor);
  ctx.fillStyle = fade;
  ctx.fillRect(0, photoH - fadeH, W, fadeH);

  // ── Bottom bar ──
  const barGrad = ctx.createLinearGradient(0, photoH, W, photoH + barH);
  barGrad.addColorStop(0, brand.primaryColor);
  barGrad.addColorStop(1, darken(brand.primaryColor, 0.2));
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, photoH, W, barH);

  // ── Logo in bar ──
  const logoH = Math.round(barH * 0.32);
  const logoY = photoH + Math.round(barH * 0.12);
  if (logo) {
    const logoW = Math.round(logo.width * (logoH / logo.height));
    ctx.drawImage(logo, pad, logoY, Math.min(logoW, W * 0.2), logoH);
  } else {
    ctx.font = `700 ${Math.round(barH * 0.14)}px ${fonts.body}`;
    ctx.fillStyle = brand.secondaryColor;
    ctx.textBaseline = 'top';
    ctx.fillText(brand.businessName, pad, logoY);
  }

  // ── Headline ──
  const hlSize = Math.round(barH * 0.19);
  ctx.font = `700 ${hlSize}px ${fonts.display}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  const hlY = photoH + Math.round(barH * 0.5);
  drawTextWithShadow(ctx, tmpl.headline, pad, hlY, W - pad * 2);

  // ── Phone ──
  if (tmpl.phone) {
    const phSize = Math.round(barH * 0.13);
    ctx.font = `400 ${phSize}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tmpl.phone, pad, photoH + barH - Math.round(barH * 0.1));
  }

  // ── "Free Estimate" badge ──
  const badgePad = Math.round(W * 0.024);
  const badgeFontSize = Math.round(W * 0.026);
  ctx.font = `700 ${badgeFontSize}px ${fonts.body}`;
  const badgeText = 'FREE ESTIMATE';
  const badgeTW = ctx.measureText(badgeText).width;
  const badgeW = badgeTW + badgePad * 2.5;
  const badgeH = badgeFontSize * 1.8;
  const badgeX = W - badgeW - pad;
  const badgeY = pad;

  ctx.fillStyle = brand.secondaryColor;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgePad, badgeY + badgeH / 2);

  // ── Decorative accent line ──
  ctx.strokeStyle = brand.secondaryColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(pad, photoH + barH - Math.round(barH * 0.18));
  ctx.lineTo(W * 0.35, photoH + barH - Math.round(barH * 0.18));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ── Single Photo Showcase ─────────────────────────────────────────────────────

function drawShowcase(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  photo: HTMLImageElement | null,
) {
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.037);

  // Full-bleed photo or gradient background
  if (photo) {
    drawCoverImage(ctx, photo, 0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, brand.primaryColor);
    g.addColorStop(1, darken(brand.primaryColor, 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Brand-color overlay gradient from bottom
  const overlay = ctx.createLinearGradient(0, H * 0.35, 0, H);
  overlay.addColorStop(0, 'rgba(0,0,0,0)');
  overlay.addColorStop(0.6, hexToRgba(brand.primaryColor, 0.55));
  overlay.addColorStop(1, hexToRgba(brand.primaryColor, 0.9));
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // Top-right logo
  const logoH = Math.round(H * 0.06);
  if (logo) {
    const logoW = Math.round(logo.width * (logoH / logo.height));
    ctx.drawImage(logo, W - logoW - pad, pad, logoW, logoH);
  } else {
    ctx.font = `600 ${Math.round(H * 0.035)}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(brand.businessName, W - pad, pad);
    ctx.textAlign = 'left';
  }

  // Decorative accent line above text
  const lineY = Math.round(H * 0.62);
  ctx.strokeStyle = brand.secondaryColor;
  ctx.lineWidth = Math.max(1, W * 0.003);
  ctx.beginPath();
  ctx.moveTo(pad, lineY);
  ctx.lineTo(pad + W * 0.12, lineY);
  ctx.stroke();

  // Headline
  const hlSize = Math.round(W * 0.065);
  ctx.font = `900 ${hlSize}px ${fonts.display}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  const hlY = lineY + Math.round(H * 0.025);
  const hlBottom = wrapText(ctx, tmpl.headline, pad, hlY, W - pad * 2, hlSize * 1.2);

  // Subheadline
  if (tmpl.subheadline) {
    const shSize = Math.round(W * 0.032);
    ctx.font = `300 ${shSize}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    wrapText(ctx, tmpl.subheadline, pad, hlBottom + Math.round(H * 0.015), W - pad * 2, shSize * 1.4);
  }

  // CTA button
  if (tmpl.ctaText) {
    const ctaFontSize = Math.round(W * 0.033);
    ctx.font = `700 ${ctaFontSize}px ${fonts.body}`;
    const ctaTW = ctx.measureText(tmpl.ctaText).width;
    const ctaPadX = Math.round(W * 0.035);
    const ctaPadY = Math.round(H * 0.018);
    const ctaW = ctaTW + ctaPadX * 2;
    const ctaH = ctaFontSize + ctaPadY * 2;
    const ctaX = pad;
    const ctaY = H - ctaH - Math.round(H * 0.06);

    ctx.fillStyle = brand.secondaryColor;
    drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, 8);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(tmpl.ctaText, ctaX + ctaPadX, ctaY + ctaH / 2);
  }

  // Phone
  if (tmpl.phone) {
    ctx.font = `400 ${Math.round(W * 0.028)}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tmpl.phone, pad, H - Math.round(H * 0.035));
  }
}

// ── Promotion ─────────────────────────────────────────────────────────────────

function drawPromotion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  photo: HTMLImageElement | null,
) {
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.05);
  const splitX = Math.round(W * 0.48);

  // Left: photo half
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, splitX, H);
  ctx.clip();
  if (photo) {
    drawCoverImage(ctx, photo, 0, 0, splitX, H);
    ctx.fillStyle = hexToRgba(brand.primaryColor, 0.15);
    ctx.fillRect(0, 0, splitX, H);
  } else {
    ctx.fillStyle = darken(brand.primaryColor, 0.2);
    ctx.fillRect(0, 0, splitX, H);
  }
  ctx.restore();

  // Right: brand color panel
  const rightGrad = ctx.createLinearGradient(splitX, 0, W, H);
  rightGrad.addColorStop(0, brand.primaryColor);
  rightGrad.addColorStop(1, darken(brand.primaryColor, 0.25));
  ctx.fillStyle = rightGrad;
  ctx.fillRect(splitX, 0, W - splitX, H);

  // Diagonal divider accent
  ctx.fillStyle = brand.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(splitX - Math.round(W * 0.02), 0);
  ctx.lineTo(splitX + Math.round(W * 0.02), 0);
  ctx.lineTo(splitX + Math.round(W * 0.02), H);
  ctx.lineTo(splitX - Math.round(W * 0.02), H);
  ctx.fill();

  // Logo top of right panel
  const logoH = Math.round(H * 0.07);
  const logoX = splitX + pad;
  if (logo) {
    const logoW = Math.round(logo.width * (logoH / logo.height));
    ctx.drawImage(logo, logoX, Math.round(H * 0.06), logoW, logoH);
  } else {
    ctx.font = `700 ${Math.round(logoH * 0.7)}px ${fonts.body}`;
    ctx.fillStyle = brand.secondaryColor;
    ctx.textBaseline = 'top';
    ctx.fillText(brand.businessName, logoX, Math.round(H * 0.06));
  }

  // Accent line
  ctx.strokeStyle = brand.secondaryColor;
  ctx.lineWidth = 1;
  const accentY = Math.round(H * 0.32);
  ctx.beginPath();
  ctx.moveTo(logoX, accentY);
  ctx.lineTo(W - pad, accentY);
  ctx.stroke();

  // Headline
  const hlSize = Math.round(W * 0.07);
  ctx.font = `900 ${hlSize}px ${fonts.display}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  const hlY = accentY + Math.round(H * 0.03);
  const hlBottom = wrapText(ctx, tmpl.headline, logoX, hlY, W - splitX - pad * 1.5, hlSize * 1.15);

  // Subheadline
  if (tmpl.subheadline) {
    const shSize = Math.round(W * 0.033);
    ctx.font = `300 ${shSize}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    wrapText(ctx, tmpl.subheadline, logoX, hlBottom + Math.round(H * 0.02), W - splitX - pad * 1.5, shSize * 1.4);
  }

  // CTA
  if (tmpl.ctaText) {
    const ctaSize = Math.round(W * 0.032);
    ctx.font = `700 ${ctaSize}px ${fonts.body}`;
    const ctaTW = ctx.measureText(tmpl.ctaText).width;
    const cpx = Math.round(W * 0.032); const cpy = Math.round(H * 0.018);
    const cW = ctaTW + cpx * 2; const cH = ctaSize + cpy * 2;
    const cX = logoX; const cY = H - cH - Math.round(H * 0.1);
    ctx.fillStyle = brand.secondaryColor;
    drawRoundedRect(ctx, cX, cY, cW, cH, 8);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.fillText(tmpl.ctaText, cX + cpx, cY + cH / 2);
  }

  if (tmpl.phone) {
    ctx.font = `400 ${Math.round(W * 0.026)}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textBaseline = 'bottom';
    ctx.fillText(tmpl.phone, logoX, H - Math.round(H * 0.04));
  }
}

// ── Testimonial ───────────────────────────────────────────────────────────────

function drawTestimonial(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  photo: HTMLImageElement | null,
) {
  const W = canvas.width, H = canvas.height;
  const pad = Math.round(W * 0.06);

  if (photo) {
    drawCoverImage(ctx, photo, 0, 0, W, H);
    ctx.fillStyle = hexToRgba(brand.primaryColor, 0.82);
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, brand.primaryColor); g.addColorStop(1, darken(brand.primaryColor, 0.35));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // Quote mark
  const qSize = Math.round(W * 0.22);
  ctx.font = `900 ${qSize}px Georgia, serif`;
  ctx.fillStyle = hexToRgba(brand.secondaryColor, 0.25);
  ctx.textBaseline = 'top';
  ctx.fillText('"', pad - qSize * 0.12, Math.round(H * 0.1) - qSize * 0.2);

  // Stars
  const rating = tmpl.rating ?? 5;
  const starSize = Math.round(W * 0.045);
  const starY = Math.round(H * 0.22);
  ctx.font = `${starSize}px serif`;
  ctx.fillStyle = brand.secondaryColor;
  ctx.textBaseline = 'top';
  ctx.fillText('★'.repeat(rating) + '☆'.repeat(5 - rating), pad, starY);

  // Testimonial text
  const tSize = Math.round(W * 0.05);
  ctx.font = `300 ${tSize}px ${fonts.display}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  const tBottom = wrapText(
    ctx, `"${tmpl.testimonialText ?? tmpl.headline}"`, pad,
    starY + starSize + Math.round(H * 0.03), W - pad * 2, tSize * 1.5
  );

  // Customer name / headline
  ctx.font = `600 ${Math.round(W * 0.033)}px ${fonts.body}`;
  ctx.fillStyle = brand.secondaryColor;
  ctx.fillText(`— ${tmpl.subheadline || 'Happy Customer'}`, pad, tBottom + Math.round(H * 0.03));

  // Bottom: logo + phone
  if (logo) {
    const lH = Math.round(H * 0.05);
    const lW = Math.round(logo.width * (lH / logo.height));
    ctx.drawImage(logo, pad, H - lH - Math.round(H * 0.05), lW, lH);
  }
  if (tmpl.phone) {
    ctx.font = `400 ${Math.round(W * 0.028)}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillText(tmpl.phone, W - pad, H - Math.round(H * 0.05));
    ctx.textAlign = 'left';
  }
}

// ── Service Highlight ─────────────────────────────────────────────────────────

function drawServiceHighlight(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  photo: HTMLImageElement | null,
) {
  // Reuse showcase layout — the differentiation comes from copy
  drawShowcase(ctx, canvas, brand, { ...tmpl, type: 'showcase' }, fonts, logo, photo);
}

// ── Print Flyer ───────────────────────────────────────────────────────────────

async function drawPrintFlyer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brand: BrandConfig,
  tmpl: TemplateConfig,
  fonts: { display: string; body: string },
  logo: HTMLImageElement | null,
  beforeImg: HTMLImageElement | null,
  afterImg: HTMLImageElement | null,
) {
  const W = canvas.width, H = canvas.height; // 2550 × 3300
  const pad = Math.round(W * 0.06);

  // White background
  ctx.fillStyle = brand.bgColor || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = brand.primaryColor;
  ctx.fillRect(0, 0, W, Math.round(H * 0.008));
  ctx.fillStyle = brand.secondaryColor;
  ctx.fillRect(0, Math.round(H * 0.008), W, Math.round(H * 0.004));

  // ── Before/After hero photo ──
  const heroH = Math.round(H * 0.35);
  const heroY = Math.round(H * 0.025);

  if (beforeImg || afterImg) {
    const half = W / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, heroY, half, heroH); ctx.clip();
    if (beforeImg) drawCoverImage(ctx, beforeImg, 0, heroY, half, heroH);
    else { ctx.fillStyle = '#eee'; ctx.fillRect(0, heroY, half, heroH); }
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, heroY, half, heroH);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(half, heroY, half, heroH); ctx.clip();
    if (afterImg) drawCoverImage(ctx, afterImg, half, heroY, half, heroH);
    else { ctx.fillStyle = '#ddd'; ctx.fillRect(half, heroY, half, heroH); }
    ctx.fillStyle = hexToRgba(brand.primaryColor, 0.1);
    ctx.fillRect(half, heroY, half, heroH);
    ctx.restore();

    ctx.strokeStyle = brand.secondaryColor; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(half, heroY); ctx.lineTo(half, heroY + heroH); ctx.stroke();

    // Labels
    const lSize = Math.round(W * 0.025); ctx.font = `700 ${lSize}px ${fonts.body}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textBaseline = 'top';
    ctx.fillText('BEFORE', pad, heroY + pad);
    ctx.fillText('AFTER', half + pad, heroY + pad);
  } else if (tmpl.photoUrl) {
    const singleImg = await loadImage(tmpl.photoUrl);
    if (singleImg) drawCoverImage(ctx, singleImg, 0, heroY, W, heroH);
  }

  let currentY = heroY + heroH + Math.round(H * 0.04);

  // ── Logo + business name ──
  if (logo) {
    const lH = Math.round(H * 0.055);
    const lW = Math.round(logo.width * (lH / logo.height));
    ctx.drawImage(logo, pad, currentY, lW, lH);
    currentY += lH + Math.round(H * 0.015);
  } else {
    const bSize = Math.round(W * 0.055);
    ctx.font = `900 ${bSize}px ${fonts.display}`;
    ctx.fillStyle = brand.primaryColor;
    ctx.textBaseline = 'top';
    ctx.fillText(brand.businessName, pad, currentY);
    currentY += bSize + Math.round(H * 0.015);
  }

  // Divider
  ctx.strokeStyle = brand.secondaryColor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad, currentY); ctx.lineTo(W - pad, currentY); ctx.stroke();
  currentY += Math.round(H * 0.02);

  // ── Headline ──
  const hlSize = Math.round(W * 0.065);
  ctx.font = `900 ${hlSize}px ${fonts.display}`;
  ctx.fillStyle = brand.primaryColor;
  ctx.textBaseline = 'top';
  currentY = wrapText(ctx, tmpl.headline, pad, currentY, W - pad * 2, hlSize * 1.2);
  currentY += Math.round(H * 0.01);

  // ── Subheadline ──
  if (tmpl.subheadline) {
    const shSize = Math.round(W * 0.033);
    ctx.font = `300 ${shSize}px ${fonts.body}`;
    ctx.fillStyle = brand.textColor || '#333';
    currentY = wrapText(ctx, tmpl.subheadline, pad, currentY, W - pad * 2, shSize * 1.5);
    currentY += Math.round(H * 0.025);
  }

  // ── 3 Service bullets ──
  const bullets = [
    '✦  Custom Kitchens & Cabinet Installations',
    '✦  Bathroom Vanities & Remodels',
    '✦  Free In-Home Estimates · South Florida',
  ];
  const bSize = Math.round(W * 0.03);
  ctx.font = `400 ${bSize}px ${fonts.body}`;
  ctx.fillStyle = brand.textColor || '#333';
  for (const b of bullets) {
    ctx.fillText(b, pad, currentY);
    currentY += Math.round(bSize * 1.8);
  }
  currentY += Math.round(H * 0.015);

  // ── CTA banner ──
  const ctaBannerH = Math.round(H * 0.065);
  const ctaGrad = ctx.createLinearGradient(0, currentY, W, currentY + ctaBannerH);
  ctaGrad.addColorStop(0, brand.primaryColor);
  ctaGrad.addColorStop(1, darken(brand.primaryColor, 0.2));
  ctx.fillStyle = ctaGrad;
  ctx.fillRect(0, currentY, W, ctaBannerH);

  const ctaSize = Math.round(W * 0.04);
  ctx.font = `700 ${ctaSize}px ${fonts.body}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(tmpl.ctaText || 'Call for Your FREE Estimate Today', W / 2, currentY + ctaBannerH / 2);
  ctx.textAlign = 'left';
  currentY += ctaBannerH + Math.round(H * 0.025);

  // ── Phone + QR ──
  const phoneSize = Math.round(W * 0.07);
  ctx.font = `700 ${phoneSize}px ${fonts.display}`;
  ctx.fillStyle = brand.primaryColor;
  ctx.textBaseline = 'top';
  if (tmpl.phone) ctx.fillText(tmpl.phone, pad, currentY);

  // QR code
  if (tmpl.qrUrl) {
    const qrSize = Math.round(H * 0.1);
    const qrImg = await loadImage(tmpl.qrUrl);
    if (qrImg) ctx.drawImage(qrImg, W - qrSize - pad, currentY - Math.round(qrSize * 0.1), qrSize, qrSize);
  }

  // Bottom accent bar
  ctx.fillStyle = brand.primaryColor;
  ctx.fillRect(0, H - Math.round(H * 0.008), W, Math.round(H * 0.008));
  ctx.fillStyle = brand.secondaryColor;
  ctx.fillRect(0, H - Math.round(H * 0.012), W, Math.round(H * 0.004));
}

// ── Export helpers ────────────────────────────────────────────────────────────

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png', quality);
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png');
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
}
