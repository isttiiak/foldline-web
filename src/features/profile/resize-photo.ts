/** Side of the stored square photo, in pixels: sharp at 2x for a 128 px avatar. */
export const AVATAR_SIZE = 256;

/** The centred square crop of a width × height image, as source rectangle. */
export function centreSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    side,
  };
}

/**
 * Crop a picked photo to a centred square and shrink it to a small WebP (JPEG
 * where the browser cannot encode WebP), so only a few dozen KB are uploaded.
 */
export async function resizePhoto(file: Blob): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = centreSquare(bitmap.width, bitmap.height);
  const target = Math.min(AVATAR_SIZE, side);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  let blob = await encode("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new Error("could not encode");

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `avatar.${extension}`, { type: blob.type });
}
