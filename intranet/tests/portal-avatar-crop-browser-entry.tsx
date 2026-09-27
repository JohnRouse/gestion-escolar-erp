/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AvatarCropDialog from '../../padres/src/components/AvatarCropDialog';
import '../src/index.css';

declare global {
  interface Window {
    __portalUpload?: {
      bytesMatch: boolean;
      height: number;
      mime: string;
      width: number;
    };
  }
}

async function exposeUpload(file: File) {
  const previews = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
  const previewSource = previews[0]?.src;
  const previewBytes = previewSource
    ? new Uint8Array(await (await fetch(previewSource)).arrayBuffer())
    : new Uint8Array();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const bitmap = await createImageBitmap(file);
  window.__portalUpload = {
    bytesMatch: fileBytes.length === previewBytes.length
      && fileBytes.every((byte, index) => byte === previewBytes[index]),
    height: bitmap.height,
    mime: file.type,
    width: bitmap.width,
  };
  bitmap.close();
}

function Harness() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <main>
      <label htmlFor="portal-photo">Fotografía Portal</label>
      <input
        id="portal-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
      />
      {file ? (
        <AvatarCropDialog
          file={file}
          onCancel={() => setFile(null)}
          onConfirm={exposeUpload}
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
