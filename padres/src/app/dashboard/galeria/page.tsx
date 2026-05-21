"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";

interface Album {
  id_album: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  portada_url: string | null;
  docente: string;
  seccion: string;
  nivel: string;
  total_fotos: number;
}

interface Foto {
  id_foto: number;
  url: string;
  titulo: string | null;
}

interface Comentario {
  id_comentario: number;
  texto: string;
  creado_en: string;
  apoderado: {
    id_persona: number;
    persona: {
      nombres: string;
      apellido_paterno: string;
      avatar_url?: string | null;
    };
  };
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin > 1 ? "s" : ""}`;
  if (diffHrs < 24) return `Hace ${diffHrs} hora${diffHrs > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

const NIVELES_FILTRO = [
  { key: "todas", label: "Todas" },
  { key: "Inicial", label: "Inicial" },
  { key: "Primaria", label: "Primaria" },
  { key: "Secundaria", label: "Secundaria" },
];

export default function GaleriaPage() {
  const router = useRouter();
  const [albumes, setAlbumes] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const [albumSeleccionado, setAlbumSeleccionado] = useState<Album | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalFotos, setTotalFotos] = useState(0);
  const [cargandoFotos, setCargandoFotos] = useState(false);

  const [fotoActiva, setFotoActiva] = useState<Foto | null>(null);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // Comentarios
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [totalComentarios, setTotalComentarios] = useState(0);
  const [editandoComentario, setEditandoComentario] = useState<number | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");

  // Reacciones (me gusta)
  const [liked, setLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  // Menú de opciones (tres puntos)
  const [menuOpcionesAbierto, setMenuOpcionesAbierto] = useState(false);

  // Menú contextual para comentarios (long press)
  const [menuContextual, setMenuContextual] = useState<{ id: number; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ID persona del apoderado actual
  const [idPersona, setIdPersona] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setIdPersona(payload.personaId);
      } catch {}
    }
  }, []);

  // Cargar álbumes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    axios
      .get("/api/albumes", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const unicos = res.data.filter(
          (a: Album, i: number, arr: Album[]) => arr.findIndex((x) => x.id_album === a.id_album) === i
        );
        setAlbumes(unicos);
      })
      .catch(() => setAlbumes([]))
      .finally(() => setLoading(false));
  }, [router]);

  const albumesFiltrados = albumes.filter((a) => {
    if (filtroNivel !== "todas" && a.nivel !== filtroNivel) return false;
    if (busqueda && !a.titulo.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const abrirAlbum = (album: Album) => {
    setAlbumSeleccionado(album);
    setPagina(1);
    setFotos([]);
    cargarFotosAlbum(album.id_album, 1);
  };

  const cargarFotosAlbum = async (idAlbum: number, page: number) => {
    setCargandoFotos(true);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`/api/albumes/${idAlbum}/fotos?page=${page}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFotos((prev) => (page === 1 ? res.data.fotos : [...prev, ...res.data.fotos]));
      setTotalFotos(res.data.total);
      setPagina(page);
    } catch {
      setFotos([]);
    } finally {
      setCargandoFotos(false);
    }
  };

  const cargarMasFotos = () => {
    if (albumSeleccionado && fotos.length < totalFotos) {
      cargarFotosAlbum(albumSeleccionado.id_album, pagina + 1);
    }
  };

  // ── Lightbox ──
  const abrirLightbox = async (foto: Foto, indice: number) => {
    setFotoActiva(foto);
    setIndiceActivo(indice);
    setMostrarComentarios(false);
    setComentarios([]);
    setMenuOpcionesAbierto(false);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await axios.get(`/api/albumes/fotos/${foto.id_foto}/comentarios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setComentarios(res.data);
        setTotalComentarios(res.data.length);
      } catch {
        setComentarios([]);
        setTotalComentarios(0);
      }
      cargarReacciones(foto.id_foto);
    }
  };

  const cerrarLightbox = () => {
    setFotoActiva(null);
    setMostrarComentarios(false);
    setComentarios([]);
    setTotalComentarios(0);
    setMenuOpcionesAbierto(false);
  };

  const navegarFoto = async (direccion: "prev" | "next") => {
    const nuevoIndice = direccion === "prev" ? indiceActivo - 1 : indiceActivo + 1;
    if (nuevoIndice >= 0 && nuevoIndice < fotos.length) {
      const nuevaFoto = fotos[nuevoIndice];
      setFotoActiva(nuevaFoto);
      setIndiceActivo(nuevoIndice);
      setMostrarComentarios(false);
      setComentarios([]);
      setMenuOpcionesAbierto(false);
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await axios.get(`/api/albumes/fotos/${nuevaFoto.id_foto}/comentarios`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setComentarios(res.data);
          setTotalComentarios(res.data.length);
        } catch {
          setComentarios([]);
          setTotalComentarios(0);
        }
        cargarReacciones(nuevaFoto.id_foto);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Si el modal de comentarios está abierto, NO propagamos el swipe de cerrar
    if (mostrarComentarios) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (mostrarComentarios) return;
    touchEndX.current = e.changedTouches[0].clientX;
    touchEndY.current = e.changedTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 50) {
      cerrarLightbox();
    } else if (Math.abs(diffX) > 50) {
      if (diffX > 0) navegarFoto("next");
      else navegarFoto("prev");
    }
  };

  // Long press para comentarios propios
  const handleTouchStartComentario = (e: React.TouchEvent, comentario: Comentario) => {
    if (idPersona !== comentario.apoderado.id_persona) return;
    longPressTimer.current = setTimeout(() => {
      setMenuContextual({
        id: comentario.id_comentario,
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    }, 500);
  };

  const handleTouchEndComentario = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ── Reacciones ──
  const cargarReacciones = async (idFoto: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`/api/albumes/fotos/${idFoto}/reacciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLiked(res.data.liked);
      setTotalLikes(res.data.total);
    } catch {}
  };

  const toggleReaccion = async () => {
    if (!fotoActiva) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.post(`/api/albumes/fotos/${fotoActiva.id_foto}/reaccionar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLiked(res.data.liked);
      setTotalLikes((prev) => (res.data.liked ? prev + 1 : prev - 1));
    } catch {}
  };

  // ── Comentarios ──
  const cargarComentarios = async (idFoto: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`/api/albumes/fotos/${idFoto}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComentarios(res.data);
      setTotalComentarios(res.data.length);
    } catch {
      setComentarios([]);
    }
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim() || !fotoActiva) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.post(`/api/albumes/fotos/${fotoActiva.id_foto}/comentarios`, { texto: nuevoComentario }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNuevoComentario("");
      cargarComentarios(fotoActiva.id_foto);
    } catch (err) {
      console.error("Error al comentar", err);
    }
  };

  const editarComentario = async (idComentario: number) => {
    if (!textoEdicion.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.put(`/api/albumes/fotos/${fotoActiva?.id_foto}/comentarios/${idComentario}`, { texto: textoEdicion }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditandoComentario(null);
      setTextoEdicion("");
      if (fotoActiva) cargarComentarios(fotoActiva.id_foto);
    } catch (err) {
      console.error("Error al editar", err);
    }
  };

  const eliminarComentario = async (idComentario: number) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.delete(`/api/albumes/fotos/${fotoActiva?.id_foto}/comentarios/${idComentario}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fotoActiva) cargarComentarios(fotoActiva.id_foto);
    } catch (err) {
      console.error("Error al eliminar", err);
    }
  };

  // ── Opciones (Descargar, Compartir, Reportar) ──
  const descargarFoto = () => {
    if (!fotoActiva) return;
    window.open(fotoActiva.url, "_blank");
  };

  const compartirFoto = async () => {
    if (!fotoActiva) return;
    const url = fotoActiva.url;
    if (navigator.share) {
      try {
        await navigator.share({ title: fotoActiva.titulo || "Foto del colegio", url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Enlace copiado al portapapeles. También puedes compartirlo manualmente.");
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
      }
    }
  };

  const reportarFoto = () => {
    if (!fotoActiva) return;
    alert("Gracias por tu reporte. Revisaremos esta imagen.");
  };

  // ── LIGHTBOX ──
  if (fotoActiva) {
    return (
      <main className="fixed inset-0 bg-black/95 z-50" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="relative h-full flex flex-col">
          {/* Botones superiores */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <button onClick={cerrarLightbox} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center">
              <span className="material-symbols-rounded">close</span>
            </button>

            {/* Menú de tres puntos */}
            <div className="relative">
              <button onClick={() => setMenuOpcionesAbierto(!menuOpcionesAbierto)} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center">
                <span className="material-symbols-rounded">more_vert</span>
              </button>
              {menuOpcionesAbierto && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden z-30">
                  <button onClick={descargarFoto} className="w-full text-left px-4 py-3 text-sm text-text hover:bg-surface-alt flex items-center gap-2">
                    <span className="material-symbols-rounded text-lg">download</span> Descargar
                  </button>
                  <button onClick={compartirFoto} className="w-full text-left px-4 py-3 text-sm text-text hover:bg-surface-alt flex items-center gap-2">
                    <span className="material-symbols-rounded text-lg">share</span> Compartir
                  </button>
                  <button onClick={reportarFoto} className="w-full text-left px-4 py-3 text-sm text-text hover:bg-surface-alt flex items-center gap-2">
                    <span className="material-symbols-rounded text-lg">flag</span> Reportar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Imagen */}
          <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
            <button onClick={() => navegarFoto("prev")} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hidden md:flex items-center justify-center">
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <img src={fotoActiva.url} alt={fotoActiva.titulo || ""} className="max-h-[60vh] max-w-full object-contain" />
            <button onClick={() => navegarFoto("next")} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hidden md:flex items-center justify-center">
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
          </div>
          <div className="text-white text-center text-xs py-1">
            {indiceActivo + 1} / {fotos.length}
          </div>

          {/* Barra de acciones */}
          <div className="bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-around">
            <button onClick={toggleReaccion} className={`flex items-center gap-2 font-bold text-sm ${liked ? "text-accent" : "text-white"}`}>
              <span className="material-symbols-rounded text-xl">{liked ? "favorite" : "favorite_border"}</span>
              <span>Me gusta</span>
            </button>

            <button onClick={() => setMostrarComentarios(true)} className="flex items-center gap-2 text-white font-bold text-sm">
              <span className="material-symbols-rounded text-xl">chat_bubble_outline</span>
              <span>Comentar</span>
            </button>

            <button onClick={compartirFoto} className="flex items-center gap-2 text-white font-bold text-sm">
              <span className="material-symbols-rounded text-xl">share</span>
              <span>Compartir</span>
            </button>
          </div>

          {/* Modal de comentarios */}
          {mostrarComentarios && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMostrarComentarios(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-4 animate-slide-up" style={{ maxHeight: "60vh" }}>
                <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-4" />
                <h3 className="text-lg font-extrabold text-text mb-3">Comentarios</h3>
                <div className="overflow-y-auto space-y-3 mb-4" style={{ maxHeight: "40vh" }}>
                  {comentarios.map((c) => (
                    <div
  key={c.id_comentario}
  className="flex items-start gap-3 p-2 rounded-xl bg-white"
  onTouchStart={(e) => handleTouchStartComentario(e, c)}
  onTouchEnd={handleTouchEndComentario}
>
  <img
  src={
    c.apoderado.persona.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
      `${c.apoderado.persona.nombres} ${c.apoderado.persona.apellido_paterno}`
    )}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
  }
  alt=""
  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
/>
  <div className="flex-1">
    <div className="flex justify-between items-center">
      <p className="text-xs font-bold text-text">
        {c.apoderado.persona.nombres} {c.apoderado.persona.apellido_paterno}
      </p>
      <span className="text-[10px] text-text-muted">{timeAgo(c.creado_en)}</span>
    </div>
    <p className="text-xs text-text-secondary mt-0.5">{c.texto}</p>
  </div>
</div>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 input-underline text-sm"
                  />
                  <button onClick={enviarComentario} className="bg-accent text-white px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0">
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Menú contextual de comentarios (editar/eliminar) */}
          {menuContextual && (
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuContextual(null)}>
              <div
                className="absolute bg-white rounded-xl shadow-2xl border border-border p-2 flex flex-col gap-1"
                style={{ top: menuContextual.y, left: menuContextual.x }}
              >
                <button
                  onClick={() => {
                    setEditandoComentario(menuContextual.id);
                    const comentario = comentarios.find((c) => c.id_comentario === menuContextual.id);
                    if (comentario) setTextoEdicion(comentario.texto);
                    setMenuContextual(null);
                  }}
                  className="text-xs text-text px-3 py-1 hover:bg-surface-alt rounded-lg"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    eliminarComentario(menuContextual.id);
                    setMenuContextual(null);
                  }}
                  className="text-xs text-danger px-3 py-1 hover:bg-danger-soft rounded-lg"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── VISTA DE ÁLBUM ──
  if (albumSeleccionado) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title={albumSeleccionado.titulo} />
        <PageTransition>
          <div className="px-5 pt-4 pb-28">
            <button onClick={() => { setAlbumSeleccionado(null); setFotos([]); }} className="text-accent font-semibold text-sm mb-4 flex items-center gap-1">
              <span className="material-symbols-rounded">arrow_back</span> Volver
            </button>
            <p className="text-xs text-text-muted mb-4">{albumSeleccionado.docente} · {albumSeleccionado.seccion} · {albumSeleccionado.total_fotos} fotos</p>
            <div className="columns-2 md:columns-3 gap-2 space-y-2">
              {fotos.map((foto, idx) => (
                <button key={foto.id_foto} onClick={() => abrirLightbox(foto, idx)} className="w-full break-inside-avoid mb-2 press">
                  <img src={foto.url} alt={foto.titulo || ""} className="w-full h-auto rounded-xl shadow-sm" loading="lazy" />
                </button>
              ))}
            </div>
            {fotos.length < totalFotos && (
              <button onClick={cargarMasFotos} className="mt-4 w-full py-3 rounded-xl bg-accent-soft text-accent font-bold">
                {cargandoFotos ? "Cargando..." : "Ver más fotos"}
              </button>
            )}
          </div>
        </PageTransition>
        <BottomNav />
      </main>
    );
  }

  // ── VISTA PRINCIPAL ──
  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Momentos Victoria" />
        <div className="px-5 pt-4 pb-28 grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skel rounded-xl h-36" />
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Momentos Victoria" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          <button onClick={() => router.push("/dashboard?open=servicios")} className="text-accent text-sm font-bold hover:underline mb-4 flex items-center gap-1">
            <span className="material-symbols-rounded text-lg">arrow_back</span> Servicios
          </button>
          <div className="relative mb-4">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
            <input type="text" placeholder="Buscar álbumes..." className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-accent" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {NIVELES_FILTRO.map((n) => (
              <button key={n.key} onClick={() => setFiltroNivel(n.key)} className={`press px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filtroNivel === n.key ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-white text-text-secondary border border-border hover:bg-surface-alt"}`}>
                {n.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skel rounded-xl h-36" />
              ))}
            </div>
          ) : albumesFiltrados.length === 0 ? (
            <p className="text-center text-text-secondary py-10">No se encontraron álbumes</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {albumesFiltrados.map((album) => (
                <button key={album.id_album} onClick={() => abrirAlbum(album)} className="press m-card overflow-hidden text-left">
                  <img src={album.portada_url || "https://picsum.photos/300/200"} alt={album.titulo} className="w-full h-32 object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-extrabold text-text line-clamp-2">{album.titulo}</p>
                    <p className="text-[10px] text-text-muted mt-1">{new Date(album.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} · {album.docente}</p>
                    <p className="text-[10px] text-text-muted">{album.seccion} · {album.total_fotos} fotos</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}