#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SIDEBAR = ROOT / 'intranet/src/layout/AppSidebar.tsx'
BACKUP_ROOT = (
    Path.home()
    / '.local/state/gestion-escolar-erp/code-backups'
    / f'sidebar-navigation-{datetime.now():%Y%m%d-%H%M%S}'
)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f'{label}: se esperaba una coincidencia y se encontraron {count}'
        )
    return text.replace(old, new, 1)


def remove_between(text: str, start: str, end: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f'{label}: no se encontró el inicio')

    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{label}: no se encontró el final')

    return text[:start_index] + text[end_index:]


def main() -> int:
    if not SIDEBAR.is_file():
        print(f'ERROR: no existe {SIDEBAR}')
        return 2

    original = SIDEBAR.read_text(encoding='utf-8')

    if 'sidebarMenuGroups' in original:
        print('ERROR: AppSidebar ya usa sidebarMenuGroups.')
        return 2

    BACKUP_ROOT.mkdir(parents=True, exist_ok=False)
    backup = BACKUP_ROOT / 'AppSidebar.tsx'
    shutil.copy2(SIDEBAR, backup)

    try:
        text = original

        text = replace_once(
            text,
            '  type ElementType,\n',
            '',
            'tipo ElementType',
        )

        lucide_start = text.find("import {\n  ChevronDown,")
        lucide_end = text.find("} from 'lucide-react';", lucide_start)
        if lucide_start < 0 or lucide_end < 0:
            raise RuntimeError('import de lucide-react: límites no encontrados')

        lucide_end += len("} from 'lucide-react';")
        text = (
            text[:lucide_start]
            + "import { ChevronDown, PanelLeft, Sparkles } from 'lucide-react';"
            + text[lucide_end:]
        )

        text = replace_once(
            text,
            "import { canAccessTutoria } from '../config/accessRules';\n",
            "import { canAccessTutoria } from '../config/accessRules';\n"
            "import {\n"
            "  sidebarMenuGroups,\n"
            "  type NavItem,\n"
            "} from '../config/sidebarNavigation';\n",
            'import sidebarNavigation',
        )

        text = remove_between(
            text,
            'interface NavLeaf {',
            'const cx =',
            'configuración estática del sidebar',
        )

        old_categories = '''    return [
      { titulo: 'Principal', items: filterByRole(menuPrincipal) },
      { titulo: 'Académico', items: filterByRole(menuAcademico) },
      { titulo: 'Tutoría', items: filterByRole(menuTutoria) },
      { titulo: 'Comunidad escolar', items: filterByRole(menuComunidad) },
      { titulo: 'Personal', items: filterByRole(menuPersonal) },
      { titulo: 'Bienestar', items: filterByRole(menuBienestar) },
      { titulo: 'Comunicación', items: filterByRole(menuComunicacion) },
      { titulo: 'Finanzas', items: filterByRole(menuFinanzas) },
      { titulo: 'Reportes', items: filterByRole(menuReportes) },
      { titulo: 'Configuración', items: filterByRole(menuConfiguracion) },
    ].filter((cat) => cat.items.length > 0);'''

        new_categories = '''    return sidebarMenuGroups
      .map((group) => ({
        ...group,
        items: filterByRole(group.items),
      }))
      .filter((group) => group.items.length > 0);'''

        text = replace_once(
            text,
            old_categories,
            new_categories,
            'construcción de categorías',
        )

        forbidden = (
            'interface NavLeaf',
            'interface NavChild',
            'const menuPrincipal',
            'const menuAcademico',
            'const menuTutoria',
            'const menuComunidad',
            'const menuPersonal',
            'const menuBienestar',
            'const menuComunicacion',
            'const menuFinanzas',
            'const menuReportes',
            'const menuConfiguracion',
            'type ElementType',
            'LayoutDashboard',
            'UserPlus',
            'Wallet',
        )
        remaining = [token for token in forbidden if token in text]
        if remaining:
            raise RuntimeError(
                'quedaron referencias antiguas: ' + ', '.join(remaining)
            )

        if text.count('sidebarMenuGroups') != 2:
            raise RuntimeError(
                'sidebarMenuGroups debe aparecer en el import y en useMemo'
            )

        SIDEBAR.write_text(text, encoding='utf-8')

    except Exception as error:
        shutil.copy2(backup, SIDEBAR)
        print(f'ERROR: {error}')
        print(f'AppSidebar fue restaurado desde {backup}')
        return 2

    print('TRANSFORMACIÓN CORRECTA')
    print(f'Respaldo: {backup}')
    print(f'Archivo: {SIDEBAR}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
