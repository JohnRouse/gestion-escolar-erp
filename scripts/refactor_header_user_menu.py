#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import sys


ROOT = Path(__file__).resolve().parents[1]
HEADER = ROOT / "intranet/src/layout/AppHeader.tsx"
BACKUP_ROOT = (
    Path.home()
    / ".local/state/gestion-escolar-erp/code-backups"
    / f"header-user-menu-{datetime.now():%Y%m%d-%H%M%S}"
)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: se esperaba una coincidencia y se encontraron {count}"
        )
    return text.replace(old, new, 1)


def remove_section(text: str, start: str, end: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f"{label}: no se encontró el inicio")

    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"{label}: no se encontró el final")

    return text[:start_index] + text[end_index:]


def main() -> int:
    if not HEADER.is_file():
        print(f"ERROR: no existe {HEADER}")
        return 2

    original = HEADER.read_text(encoding="utf-8")

    if "HeaderUserMenu" in original:
        print("ERROR: AppHeader ya contiene HeaderUserMenu.")
        return 2

    BACKUP_ROOT.mkdir(parents=True, exist_ok=False)
    backup = BACKUP_ROOT / "AppHeader.tsx"
    shutil.copy2(HEADER, backup)

    try:
        text = original

        text = replace_once(
            text,
            "import { useNavigate } from 'react-router-dom';\n",
            "",
            "import useNavigate",
        )

        for icon in ("HelpCircle", "LogOut", "Settings", "User", "Zap"):
            text = replace_once(
                text,
                f"  {icon},\n",
                "",
                f"icono {icon}",
            )

        text = replace_once(
            text,
            "import { assetUrl } from '../utils/assets';\n",
            "",
            "import assetUrl",
        )

        text = replace_once(
            text,
            "import HeaderGlobalSearch from '../components/header/HeaderGlobalSearch';\n",
            "import HeaderGlobalSearch from '../components/header/HeaderGlobalSearch';\n"
            "import HeaderUserMenu from '../components/header/HeaderUserMenu';\n",
            "import HeaderUserMenu",
        )

        text = remove_section(
            text,
            "function obtenerPartesNombre",
            "const iconButtonClass",
            "funciones auxiliares del usuario",
        )

        text = replace_once(
            text,
            "  const { user, logout, token, refreshUser } = useAuth();",
            "  const { user, token, refreshUser } = useAuth();",
            "useAuth",
        )

        text = replace_once(
            text,
            "  const navigate = useNavigate();\n",
            "",
            "useNavigate",
        )

        text = replace_once(
            text,
            "  const [dropdownOpen, setDropdownOpen] = useState(false);\n",
            "",
            "estado dropdownOpen",
        )

        user_data_start = text.find("  const userName =")
        user_data_end = text.find("  const canShowSchoolSelector", user_data_start)
        if user_data_start < 0 or user_data_end < 0:
            raise RuntimeError("datos del usuario: no se encontraron los límites")

        text = (
            text[:user_data_start]
            + "  const userRole = user?.rol || 'Admin';\n\n"
            + text[user_data_end:]
        )

        text = remove_section(
            text,
            "  const handleLogout = () => {",
            "useEffect(() =>",
            "handleLogout",
        )

        right_start = text.rfind(
            '        <div className="flex items-center gap-2">'
        )
        right_end_marker = "\n\n      </div>\n    </header>"
        right_end = text.find(right_end_marker, right_start)

        if right_start < 0 or right_end < 0:
            raise RuntimeError("bloque derecho del encabezado: límites no encontrados")

        right_content = '''        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Ver notificaciones"
            className={`${iconButtonClass} relative`}
          >
            <Bell size={18} strokeWidth={2} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <HeaderUserMenu
            onOpen={() => setSchoolDropdownOpen(false)}
          />
        </div>'''

        text = text[:right_start] + right_content + text[right_end:]

        text = text.replace("                  setDropdownOpen(false);\n", "")
        text = text.replace("              setDropdownOpen(false);\n", "")
        text = text.replace("        setDropdownOpen(false);\n", "")

        forbidden = (
            "useNavigate",
            "assetUrl",
            "dropdownOpen",
            "setDropdownOpen",
            "handleLogout",
            "alert(",
            "obtenerInicialesUsuario",
            "obtenerNombreCortoUsuario",
        )
        remaining = [token for token in forbidden if token in text]
        if remaining:
            raise RuntimeError(
                "quedaron referencias antiguas: " + ", ".join(remaining)
            )

        if text.count("HeaderUserMenu") != 2:
            raise RuntimeError(
                "HeaderUserMenu debe aparecer exactamente en el import y en el JSX"
            )

        HEADER.write_text(text, encoding="utf-8")

    except Exception as error:
        shutil.copy2(backup, HEADER)
        print(f"ERROR: {error}")
        print(f"AppHeader fue restaurado desde {backup}")
        return 2

    print("TRANSFORMACIÓN CORRECTA")
    print(f"Respaldo: {backup}")
    print(f"Archivo: {HEADER}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
