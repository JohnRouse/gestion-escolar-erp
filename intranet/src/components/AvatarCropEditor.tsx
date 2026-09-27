import { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
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
} from '../lib/avatarCrop';

type AvatarCropEditorProps = {
  file: File;
  value: AvatarCrop;
  onChange: (crop: AvatarCrop) => void;
  onResultChange: (result: CroppedAvatarResult | null) => void;
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

export default function AvatarCropEditor({ file, value, onChange, onResultChange }: AvatarCropEditorProps) {
  const [source, setSource] = useState<PreparedAvatarSource | null>(null);
  const [result, setResult] = useState<CroppedAvatarResult | null>(null);
  const [error, setError] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef(value);
  const pointersRef = useRef(new Map<number, PointerEvent>());
  const lastPointRef = useRef<Point | null>(null);
  const pinchRef = useRef<{ distance: number; center: Point } | null>(null);

  useEffect(() => {
    cropRef.current = value;
    if (source && canvasRef.current) renderAvatarCrop(canvasRef.current, source, value);
  }, [source, value]);

  useEffect(() => {
    let active = true;
    void prepareAvatarSource(file)
      .then((nextSource) => {
        if (!active) return;
        setSource(nextSource);
        const nextCrop = normalizeAvatarCrop(cropRef.current, nextSource);
        cropRef.current = nextCrop;
        onChange(nextCrop);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo leer la fotografía.');
      });
    return () => {
      active = false;
    };
  }, [file, onChange, onResultChange]);

  useEffect(() => {
    if (!source) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void createCroppedAvatar(source, cropRef.current)
        .then((nextResult) => {
          if (!active || nextResult.cropKey !== avatarCropKey(cropRef.current)) return;
          setResult(nextResult);
          onResultChange(nextResult);
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : 'No se pudo preparar la vista previa.');
        });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [source, value, onResultChange]);

  const updateCrop = (crop: AvatarCrop) => {
    if (!source) return;
    const next = normalizeAvatarCrop(crop, source);
    cropRef.current = next;
    setResult(null);
    onResultChange(null);
    onChange(next);
  };

  const viewportAnchor = (point: Point): AvatarCropPosition => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (point.x - rect.left) / rect.width - 0.5,
      y: (point.y - rect.top) / rect.height - 0.5,
    };
  };

  const setZoom = (zoom: number, anchor = { x: 0, y: 0 }) => {
    if (!source) return;
    updateCrop(zoomAvatarCropAround(cropRef.current, zoom, anchor, source));
  };

  const moveBy = (deltaX: number, deltaY: number) => {
    const size = viewportRef.current?.clientWidth || 1;
    updateCrop({
      ...cropRef.current,
      position: {
        x: cropRef.current.position.x + deltaX / size,
        y: cropRef.current.position.y + deltaY / size,
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

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(260px,360px)_minmax(240px,1fr)]">
      <div
        ref={viewportRef}
        className="relative mx-auto aspect-square w-full max-w-[360px] touch-none overflow-hidden rounded-2xl bg-slate-950 shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-200"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        role="group"
        tabIndex={0}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 20 : 8;
          if (event.key === 'ArrowLeft') moveBy(-step, 0);
          else if (event.key === 'ArrowRight') moveBy(step, 0);
          else if (event.key === 'ArrowUp') moveBy(0, -step);
          else if (event.key === 'ArrowDown') moveBy(0, step);
          else if (event.key === '+' || event.key === '=') setZoom(cropRef.current.zoom + 0.1);
          else if (event.key === '-') setZoom(cropRef.current.zoom - 0.1);
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
        {!source ? <span className="absolute inset-0 grid place-items-center text-white"><Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /></span> : null}
        <span className="pointer-events-none absolute inset-[8%] rounded-full border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" aria-hidden="true" />
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          Arrastra para mover. Usa el control, la rueda o el gesto de pinza para acercar.
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setZoom(value.zoom - 0.1)} disabled={!source || value.zoom <= AVATAR_MIN_ZOOM} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-40" aria-label="Alejar"><Minus size={18} /></button>
          <label className="min-w-0 flex-1 text-center text-sm font-bold text-slate-700">
            <span className="sr-only">Zoom</span>
            <input type="range" min={AVATAR_MIN_ZOOM} max={AVATAR_MAX_ZOOM} step="0.01" value={value.zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!source} className="w-full accent-blue-600" aria-label="Zoom de la fotografía" />
            <span aria-hidden="true">Alejar — Zoom — Acercar</span>
          </label>
          <button type="button" onClick={() => setZoom(value.zoom + 0.1)} disabled={!source || value.zoom >= AVATAR_MAX_ZOOM} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-40" aria-label="Acercar"><Plus size={18} /></button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="student-avatar-preview-title">
          <h3 id="student-avatar-preview-title" className="text-sm font-black text-slate-950">Así se verá la foto</h3>
          <p className="mt-1 text-xs font-medium text-slate-600">Se guarda este cuadrado. El círculo es solo una referencia.</p>
          <div className="mt-4 flex items-end gap-4" aria-hidden="true">
            {result ? <img src={result.dataUrl} alt="" className="h-24 w-24 rounded-2xl object-cover object-center" /> : <span className="h-24 w-24 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />}
            {result ? <img src={result.dataUrl} alt="" className="h-14 w-14 rounded-full object-cover object-center" /> : <span className="h-14 w-14 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />}
          </div>
        </section>
        {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
