"use client";

import { useState } from "react";
import { isRealStudentPhoto, studentInitials } from "@/lib/portalAvatar";

interface PortalAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export default function PortalAvatar({
  name,
  src,
  className = "h-11 w-11",
  style,
}: PortalAvatarProps) {
  const photo = isRealStudentPhoto(src) ? src?.trim() : null;
  return <PortalAvatarContent key={photo || "fallback"} name={name} src={photo} className={className} style={style} />;
}

function PortalAvatarContent({ name, src, className = "h-11 w-11", style }: PortalAvatarProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`${className} relative flex shrink-0 items-center justify-center overflow-hidden bg-accent-soft font-extrabold text-accent`}
      style={style}
      aria-hidden="true"
    >
      {src && !failed ? (
        // El filtro compartido excluye avatares legacy; onError cubre fotos no disponibles.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="block h-full w-full object-cover object-center"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-sm">{studentInitials(name)}</span>
      )}
    </span>
  );
}
