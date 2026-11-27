/**
 * Browser-side image preparation for the AI endpoints: any picked file (or an SVG data URL, like
 * the built-in samples) becomes a `data:image/jpeg|png;base64,…` URL, scaled down so it stays
 * well under the server's upload limit.
 */

const MAX_SIDE = 1600;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("READ_FAILED"));
    r.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("INVALID_IMAGE"));
    img.src = src;
  });
}

async function rasterize(src: string, type: "image/png" | "image/jpeg"): Promise<string> {
  const img = await loadImage(src);
  const w = img.naturalWidth || 800;
  const h = img.naturalHeight || 600;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("INVALID_IMAGE");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.9);
}

/** A file or data URL → a JPEG/PNG data URL the AI service accepts. */
export async function toImageDataUrl(input: Blob | string): Promise<string> {
  const src = typeof input === "string" ? input : await readAsDataUrl(input);
  if (/^data:image\/svg\+xml/.test(src)) return rasterize(src, "image/png");
  if (/^data:image\/(jpeg|png|webp|gif);base64,/.test(src) && src.length < 3_000_000) return src;
  return rasterize(src, "image/jpeg");
}
