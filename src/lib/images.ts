/** Side of a stored square profile photo, in pixels: sharp at 2x for a 128 px avatar. */
export const AVATAR_SIZE = 256;

/** Longest side of a stored cover photo, in pixels. */
export const COVER_MAX = 600;

/** The centred square crop of a width × height image, as source rectangle. */
export function centreSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    side,
  };
}

/** Scale width × height down (never up) so the longer side is at most `max`. */
export function containSize(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encode(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  let blob = await toBlob("image/webp");
  // Browsers that cannot encode WebP hand back PNG: use JPEG instead.
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("could not encode");
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${name}.${extension}`, { type: blob.type });
}

function draw(
  bitmap: ImageBitmap,
  source: { sx: number; sy: number; sw: number; sh: number },
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    source.sx,
    source.sy,
    source.sw,
    source.sh,
    0,
    0,
    width,
    height,
  );
  return canvas;
}

/**
 * Crop a picked photo to a centred square and shrink it to a small WebP (JPEG
 * where the browser cannot encode WebP), so only a few dozen KB are uploaded.
 */
export async function resizePhoto(file: Blob): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = centreSquare(bitmap.width, bitmap.height);
  const target = Math.min(AVATAR_SIZE, side);
  const canvas = draw(bitmap, { sx, sy, sw: side, sh: side }, target, target);
  bitmap.close();
  return encode(canvas, "avatar");
}

/** Shrink a cover photo, keeping its shape, so the longer side is `COVER_MAX`. */
export async function resizeCover(file: Blob): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = containSize(bitmap.width, bitmap.height, COVER_MAX);
  const canvas = draw(
    bitmap,
    { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height },
    width,
    height,
  );
  bitmap.close();
  return encode(canvas, "cover");
}
