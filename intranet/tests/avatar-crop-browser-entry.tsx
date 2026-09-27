/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AvatarCropEditor from '../src/components/AvatarCropEditor';
import { prepareAvatarSource, type AvatarCrop, type CroppedAvatarResult } from '../src/lib/avatarCrop';
import '../src/index.css';

declare global {
  interface Window {
    __avatarResult?: {
      bytesMatch: boolean;
      cropKey: string;
      height: number;
      mime: string;
      previewCount: number;
      width: number;
    };
    __avatarSource?: { height: number; width: number };
  }
}

async function exposeSource(file: File) {
  const source = await prepareAvatarSource(file);
  window.__avatarSource = { height: source.height, width: source.width };
}

async function exposeResult(result: CroppedAvatarResult | null) {
  if (!result) {
    delete window.__avatarResult;
    return;
  }
  const fileBytes = new Uint8Array(await result.file.arrayBuffer());
  const dataBytes = new Uint8Array(await (await fetch(result.dataUrl)).arrayBuffer());
  const bytesMatch = fileBytes.length === dataBytes.length
    && fileBytes.every((byte, index) => byte === dataBytes[index]);
  window.__avatarResult = {
    bytesMatch,
    cropKey: result.cropKey,
    height: result.height,
    mime: result.file.type,
    previewCount: Array.from(document.querySelectorAll('img')).filter((image) => image.src === result.dataUrl).length,
    width: result.width,
  };
}

function Harness() {
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, position: { x: 0, y: 0 } });
  return (
    <main>
      <label htmlFor="photo">Fotografía vertical</label>
      <input
        id="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const nextFile = event.currentTarget.files?.[0] ?? null;
          setCrop({ zoom: 1, position: { x: 0, y: 0 } });
          setFile(nextFile);
          if (nextFile) void exposeSource(nextFile);
        }}
      />
      {file ? (
        <AvatarCropEditor
          file={file}
          value={crop}
          onChange={setCrop}
          onResultChange={(result) => void exposeResult(result)}
        />
      ) : null}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
