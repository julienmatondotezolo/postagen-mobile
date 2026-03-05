/**
 * Compress an image file to a maximum dimension and quality.
 * Returns the original file if it's already small enough.
 */
async function compressImage(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.8
): Promise<File> {
  // Skip if file is already small (<1MB)
  if (file.size < 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip if image is already small enough
      if (
        img.width <= maxDimension &&
        img.height <= maxDimension &&
        file.size < 3 * 1024 * 1024
      ) {
        resolve(file);
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      // Draw to canvas and export
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
          });
          console.log(
            `📷 Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB (${width}x${height})`
          );
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Convert HEIC/HEIF to JPEG
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const convertedBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
  const newFileName = file.name.replace(/\.heic$/i, ".jpg");
  return new File([blob], newFileName, { type: "image/jpeg" });
}

/**
 * Compress an array of files: convert HEIC, compress images, pass videos through.
 */
export async function compressFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const result: File[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    onProgress?.(i + 1, total);
    // Convert HEIC/HEIF
    const isHeic =
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif") ||
      file.type === "image/heic" ||
      file.type === "image/heif";

    if (isHeic) {
      try {
        file = await convertHeicToJpeg(file);
      } catch (error) {
        console.error(`Failed to convert HEIC ${file.name}:`, error);
        continue;
      }
    }

    // Skip non-media files
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      continue;
    }

    // Reject >50MB
    if (file.size > 50 * 1024 * 1024) {
      continue;
    }

    // Compress images
    if (file.type.startsWith("image/")) {
      try {
        file = await compressImage(file, 1920, 0.8);
      } catch {
        // Use original on error
      }
    }

    result.push(file);
  }

  return result;
}
