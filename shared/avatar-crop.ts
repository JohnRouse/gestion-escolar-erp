export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_OUTPUT_MIME = 'image/webp';
export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 4;

export type AvatarCropPosition = {
  x: number;
  y: number;
};

export type AvatarCrop = {
  zoom: number;
  position: AvatarCropPosition;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

export type PreparedAvatarSource = ImageDimensions & {
  dataUrl: string;
  image: HTMLImageElement;
};

export type CroppedAvatarResult = {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  cropKey: string;
};

export function clampAvatarCrop(
  position: AvatarCropPosition,
  zoom: number,
  image: ImageDimensions,
): AvatarCropPosition {
  if (!image.width || !image.height) return { x: 0, y: 0 };

  const safeZoom = Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, zoom));
  const coverScale = Math.max(1 / image.width, 1 / image.height);
  const renderedWidth = image.width * coverScale * safeZoom;
  const renderedHeight = image.height * coverScale * safeZoom;
  const maxX = Math.max(0, (renderedWidth - 1) / 2);
  const maxY = Math.max(0, (renderedHeight - 1) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, position.x)),
    y: Math.min(maxY, Math.max(-maxY, position.y)),
  };
}

export function normalizeAvatarCrop(crop: AvatarCrop, image: ImageDimensions): AvatarCrop {
  const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, crop.zoom));
  return {
    zoom,
    position: clampAvatarCrop(crop.position, zoom, image),
  };
}

export function calculateAvatarDraw(
  image: ImageDimensions,
  crop: AvatarCrop,
  outputSize = AVATAR_OUTPUT_SIZE,
) {
  if (!image.width || !image.height) {
    return { x: 0, y: 0, width: 0, height: 0, scale: 0, crop: normalizeAvatarCrop(crop, image) };
  }

  const safeCrop = normalizeAvatarCrop(crop, image);
  const baseScale = Math.max(outputSize / image.width, outputSize / image.height);
  const scale = baseScale * safeCrop.zoom;
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: (outputSize - width) / 2 + safeCrop.position.x * outputSize,
    y: (outputSize - height) / 2 + safeCrop.position.y * outputSize,
    width,
    height,
    scale,
    crop: safeCrop,
  };
}

export function calculateAvatarSourceRect(
  image: ImageDimensions,
  crop: AvatarCrop,
  outputSize = AVATAR_OUTPUT_SIZE,
) {
  const draw = calculateAvatarDraw(image, crop, outputSize);
  if (!draw.scale) return { x: 0, y: 0, width: 0, height: 0 };
  const x = -draw.x / draw.scale;
  const y = -draw.y / draw.scale;
  return {
    x: Object.is(x, -0) ? 0 : x,
    y: Object.is(y, -0) ? 0 : y,
    width: outputSize / draw.scale,
    height: outputSize / draw.scale,
  };
}

export function avatarCropKey(crop: AvatarCrop) {
  return `${crop.zoom.toFixed(6)}:${crop.position.x.toFixed(6)}:${crop.position.y.toFixed(6)}`;
}

export function zoomAvatarCropAround(
  crop: AvatarCrop,
  nextZoom: number,
  anchor: AvatarCropPosition,
  image: ImageDimensions,
): AvatarCrop {
  const boundedZoom = Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, nextZoom));
  const ratio = boundedZoom / crop.zoom;
  const position = {
    x: anchor.x - (anchor.x - crop.position.x) * ratio,
    y: anchor.y - (anchor.y - crop.position.y) * ratio,
  };
  return normalizeAvatarCrop({ zoom: boundedZoom, position }, image);
}

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('No se pudo leer la fotografía.'));
    reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decodeOriginal(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // El fallback usa el decoder del navegador y la misma fuente data URL sin object URLs.
    }
  }
  return loadImage(await readAsDataUrl(file));
}

export async function prepareAvatarSource(file: File): Promise<PreparedAvatarSource> {
  const decoded = await decodeOriginal(file);
  const width = decoded.width;
  const height = decoded.height;
  if (!width || !height) throw new Error('La fotografía no tiene dimensiones válidas.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    if ('close' in decoded && typeof decoded.close === 'function') decoded.close();
    throw new Error('El navegador no pudo preparar la fotografía.');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(decoded, 0, 0, width, height);
  if ('close' in decoded && typeof decoded.close === 'function') decoded.close();

  const normalizedBlob = await canvasBlob(canvas, 'image/jpeg', 0.94);
  if (!normalizedBlob) throw new Error('No se pudo normalizar la fotografía.');
  const dataUrl = await readAsDataUrl(normalizedBlob);
  return { dataUrl, image: await loadImage(dataUrl), width, height };
}

export function renderAvatarCrop(
  canvas: HTMLCanvasElement,
  source: PreparedAvatarSource,
  crop: AvatarCrop,
) {
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no pudo preparar el recorte.');
  const draw = calculateAvatarDraw(source, crop);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  context.drawImage(source.image, draw.x, draw.y, draw.width, draw.height);
  return draw.crop;
}

export async function createCroppedAvatar(
  source: PreparedAvatarSource,
  crop: AvatarCrop,
): Promise<CroppedAvatarResult> {
  const canvas = document.createElement('canvas');
  const safeCrop = renderAvatarCrop(canvas, source, crop);
  let outputMime = AVATAR_OUTPUT_MIME;
  let blob = await canvasBlob(canvas, outputMime, 0.88);
  if (!blob || blob.type !== AVATAR_OUTPUT_MIME) {
    outputMime = 'image/jpeg';
    blob = await canvasBlob(canvas, outputMime, 0.9);
  }
  if (!blob) throw new Error('No se pudo generar la fotografía final.');

  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const extension = outputMime === AVATAR_OUTPUT_MIME ? 'webp' : 'jpg';
  const file = new File([blob], `avatar-${suffix}.${extension}`, {
    type: outputMime,
    lastModified: Date.now(),
  });

  return {
    file,
    dataUrl: await readAsDataUrl(blob),
    width: AVATAR_OUTPUT_SIZE,
    height: AVATAR_OUTPUT_SIZE,
    cropKey: avatarCropKey(safeCrop),
  };
}
