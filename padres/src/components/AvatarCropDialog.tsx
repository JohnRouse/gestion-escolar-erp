"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Minus, Plus } from "lucide-react";
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  avatarCropKey,
  createCroppedAvatar,
  normalizeAvatarCrop,
  prepareAvatarSource,
  renderAvatarCrop,
  zoomAvatarCropAround,
  type AvatarCrop,
  type AvatarCropPosition,
  type CroppedAvatarResult,
  type PreparedAvatarSource,
} from "../lib/avatarCrop";

type AvatarCropDialogProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

type Point = { x: number; y: number };

function pointerDistance(points: PointerEvent[]) {
  return Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
}

function pointerCenter(points: PointerEvent[]): Point {
  return {
    x: (points[0].clientX + points[1].clientX) / 2,
    y: (points[0].clientY + points[1].clientY) / 2,
  };
}

export default function AvatarCropDialog({ file, busy = false, onCancel, onConfirm }: AvatarCropDialogProps) {
  const [source, setSource] = useState<PreparedAvatarSource | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, position: { x: 0, y: 0 } });
  const [result, setResult] = useState<CroppedAvatarResult | null>(null);
  const [loadingSource, setLoadingSource] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const blockedRef = useRef(true);
  const pointersRef = useRef(new Map<number, PointerEvent>());
  const lastPointRef = useRef<Point | null>(null);
  const pinchRef = useRef<{ distance: number; center: Point } | null>(null);
  const cropRef = useRef(crop);
  const resultRef = useRef(result);

  useEffect(() => {
    let active = true;
    void prepareAvatarSource(file)
      .then((nextSource) => {
        if (active) setSource(nextSource);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo leer la fotografía.");
      })
      .finally(() => {
        if (active) setLoadingSource(false);
      });
    return () => {
      active = false;
    };
  }, [file]);

  useEffect(() => {
    cropRef.current = crop;
    if (source && canvasRef.current) renderAvatarCrop(canvasRef.current, source, crop);
  }, [crop, source]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (!source) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void createCroppedAvatar(source, cropRef.current)
        .then((nextResult) => {
          if (active && nextResult.cropKey === avatarCropKey(cropRef.current)) setResult(nextResult);
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "No se pudo preparar la vista previa.");
        });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [crop, source]);

  useEffect(() => {
    onCancelRef.current = onCancel;
    blockedRef.current = busy || preparing || loadingSource;
  }, [busy, loadingSource, onCancel, preparing]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!blockedRef.current) onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      returnFocusRef.current?.focus();
    };
  }, []);

  const updateCrop = (next: AvatarCrop) => {
    if (!source) return;
    const safe = normalizeAvatarCrop(next, source);
    cropRef.current = safe;
    setCrop(safe);
    setResult(null);
  };

  const viewportAnchor = (point: Point): AvatarCropPosition => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (point.x - rect.left) / rect.width - 0.5,
      y: (point.y - rect.top) / rect.height - 0.5,
    };
  };

  const setZoom = (nextZoom: number, anchor = { x: 0, y: 0 }) => {
    if (!source) return;
    updateCrop(zoomAvatarCropAround(cropRef.current, nextZoom, anchor, source));
  };

  const moveBy = (deltaX: number, deltaY: number) => {
    const viewportSize = viewportRef.current?.clientWidth || 1;
    updateCrop({
      ...cropRef.current,
      position: {
        x: cropRef.current.position.x + deltaX / viewportSize,
        y: cropRef.current.position.y + deltaY / viewportSize,
      },
    });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, event.nativeEvent);
    const points = Array.from(pointersRef.current.values());
    if (points.length === 1) lastPointRef.current = { x: event.clientX, y: event.clientY };
    if (points.length === 2) pinchRef.current = { distance: pointerDistance(points), center: pointerCenter(points) };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, event.nativeEvent);
    const points = Array.from(pointersRef.current.values());
    if (points.length === 1 && lastPointRef.current) {
      moveBy(event.clientX - lastPointRef.current.x, event.clientY - lastPointRef.current.y);
      lastPointRef.current = { x: event.clientX, y: event.clientY };
    } else if (points.length === 2 && pinchRef.current) {
      const center = pointerCenter(points);
      moveBy(center.x - pinchRef.current.center.x, center.y - pinchRef.current.center.y);
      const nextDistance = pointerDistance(points);
      setZoom(cropRef.current.zoom * (nextDistance / pinchRef.current.distance), viewportAnchor(center));
      pinchRef.current = { distance: nextDistance, center };
    }
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const points = Array.from(pointersRef.current.values());
    lastPointRef.current = points[0] ? { x: points[0].clientX, y: points[0].clientY } : null;
    pinchRef.current = points.length === 2
      ? { distance: pointerDistance(points), center: pointerCenter(points) }
      : null;
  };

  const confirm = async () => {
    if (!source) return;
    setPreparing(true);
    setError("");
    try {
      const currentKey = avatarCropKey(cropRef.current);
      const finalResult = resultRef.current?.cropKey === currentKey
        ? resultRef.current
        : await createCroppedAvatar(source, cropRef.current);
      await onConfirm(finalResult.file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos preparar la foto. Prueba con otra imagen JPG, PNG o WEBP.");
    } finally {
      setPreparing(false);
    }
  };

  const waiting = busy || preparing || loadingSource;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center md:items-center md:p-6">
      <button type="button" aria-label="Cancelar edición de foto" className="portal-sheet-backdrop absolute inset-0" onClick={() => !waiting && onCancel()} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title" aria-describedby="avatar-crop-description" className="portal-sheet relative flex max-h-[96dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-b-none md:max-h-[92dvh] md:rounded-[var(--portal-radius-sheet)]">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <button type="button" onClick={onCancel} disabled={waiting} className="portal-button portal-button-secondary min-h-11 px-3">Cancelar</button>
          <div className="min-w-0 px-3 text-center">
            <h2 id="avatar-crop-title" className="text-base font-bold text-text">Ajustar foto</h2>
            <p id="avatar-crop-description" className="text-xs text-text-muted">Mueve y amplía la imagen</p>
          </div>
          <button type="button" onClick={() => void confirm()} disabled={waiting || !source || !result} className="portal-button min-h-11 px-3">
            {waiting ? <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Guardar
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div
            ref={viewportRef}
            className="relative mx-auto aspect-square w-full max-w-[360px] touch-none overflow-hidden rounded-xl bg-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            role="group"
            tabIndex={0}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 20 : 8;
              if (event.key === "ArrowLeft") moveBy(-step, 0);
              else if (event.key === "ArrowRight") moveBy(step, 0);
              else if (event.key === "ArrowUp") moveBy(0, -step);
              else if (event.key === "ArrowDown") moveBy(0, step);
              else if (event.key === "+" || event.key === "=") setZoom(cropRef.current.zoom + 0.1);
              else if (event.key === "-") setZoom(cropRef.current.zoom - 0.1);
              else return;
              event.preventDefault();
            }}
            onWheel={(event) => {
              event.preventDefault();
              setZoom(cropRef.current.zoom + (event.deltaY < 0 ? 0.08 : -0.08), viewportAnchor({ x: event.clientX, y: event.clientY }));
            }}
            aria-label="Área de recorte cuadrada. Arrastra o usa las flechas para mover; usa más y menos para ampliar."
          >
            <canvas ref={canvasRef} className="h-full w-full select-none" aria-hidden="true" />
            {loadingSource ? <span className="absolute inset-0 grid place-items-center text-white"><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /></span> : null}
            <span className="pointer-events-none absolute inset-[8%] rounded-full border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" aria-hidden="true" />
          </div>

          <div className="mx-auto mt-4 flex max-w-[420px] items-center gap-2">
            <button type="button" onClick={() => setZoom(crop.zoom - 0.1)} disabled={!source || crop.zoom <= AVATAR_MIN_ZOOM} className="portal-icon-button border border-border bg-white text-text" aria-label="Alejar"><Minus size={18} /></button>
            <label className="min-w-0 flex-1 text-center text-sm font-semibold text-text-secondary">
              <span className="sr-only">Zoom</span>
              <input type="range" min={AVATAR_MIN_ZOOM} max={AVATAR_MAX_ZOOM} step="0.01" value={crop.zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!source} className="w-full accent-accent" aria-label="Zoom de la fotografía" />
              <span aria-hidden="true">Alejar — Zoom — Acercar</span>
            </label>
            <button type="button" onClick={() => setZoom(crop.zoom + 0.1)} disabled={!source || crop.zoom >= AVATAR_MAX_ZOOM} className="portal-icon-button border border-border bg-white text-text" aria-label="Acercar"><Plus size={18} /></button>
          </div>

          <section className="mx-auto mt-5 max-w-[420px] rounded-xl border border-border bg-surface-alt p-4" aria-labelledby="avatar-preview-title">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 id="avatar-preview-title" className="text-sm font-bold text-text">Así se verá la foto</h3>
                <p className="mt-1 text-xs text-text-muted">Se guardará este cuadrado; el círculo es solo una referencia.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {result ? <img src={result.dataUrl} alt="" className="h-16 w-16 rounded-lg object-cover object-center" /> : <span className="h-16 w-16 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {result ? <img src={result.dataUrl} alt="" className="h-12 w-12 rounded-full object-cover object-center" /> : <span className="h-12 w-12 animate-pulse rounded-full bg-border motion-reduce:animate-none" />}
              </div>
            </div>
          </section>
          {error ? <p role="alert" className="mx-auto mt-3 max-w-[420px] rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
