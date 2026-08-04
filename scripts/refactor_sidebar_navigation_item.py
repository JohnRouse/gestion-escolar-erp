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
    / f'sidebar-navigation-item-{datetime.now():%Y%m%d-%H%M%S}'
)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f'{label}: se esperaba una coincidencia y se encontraron {count}'
        )
    return text.replace(old, new, 1)


def main() -> int:
    if not SIDEBAR.is_file():
        print(f'ERROR: no existe {SIDEBAR}')
        return 2

    original = SIDEBAR.read_text(encoding='utf-8')

    if 'SidebarNavigationItem' in original:
        print('ERROR: AppSidebar ya usa SidebarNavigationItem.')
        return 2

    BACKUP_ROOT.mkdir(parents=True, exist_ok=False)
    backup = BACKUP_ROOT / 'AppSidebar.tsx'
    shutil.copy2(SIDEBAR, backup)

    try:
        text = original

        text = replace_once(
            text,
            "import SidebarCollapsedFlyout from '../components/sidebar/SidebarCollapsedFlyout';\n",
            "import SidebarCollapsedFlyout from '../components/sidebar/SidebarCollapsedFlyout';\n"
            "import SidebarNavigationItem from '../components/sidebar/SidebarNavigationItem';\n",
            'import SidebarNavigationItem',
        )

        text = replace_once(
            text,
            "import { ChevronDown, PanelLeft, Sparkles } from 'lucide-react';",
            "import { PanelLeft, Sparkles } from 'lucide-react';",
            'import de lucide-react',
        )

        render_start = text.find('  const Tooltip =')
        return_start = text.find('\n  return (\n    <>', render_start)

        if render_start < 0 or return_start < 0:
            raise RuntimeError(
                'renderizado de ítems: no se encontraron los límites esperados'
            )

        text = text[:render_start] + text[return_start + 1:]

        old_map = (
            '                <div className="space-y-1">'
            '{categoria.items.map(renderItem)}</div>'
        )

        new_map = '''                <div className="space-y-1">
                  {categoria.items.map((item) => (
                    <SidebarNavigationItem
                      key={item.title}
                      item={item}
                      isCollapsed={isCollapsed}
                      isExpanded={expanded === item.title}
                      isActive={
                        isRouteActive(item.path) ||
                        getChildPaths(item).some((path) =>
                          isRouteActive(path),
                        )
                      }
                      isFlyoutOpen={
                        hoveredItem?.title === item.title
                      }
                      flyoutRef={flyoutRef}
                      onNavigate={handleNavigate}
                      onToggleExpanded={() =>
                        setExpanded(
                          expanded === item.title
                            ? null
                            : item.title,
                        )
                      }
                      onOpenCollapsedFlyout={
                        openCollapsedFlyout
                      }
                      onScheduleFlyoutClose={
                        scheduleFlyoutClose
                      }
                      onCloseCollapsedFlyout={
                        closeCollapsedFlyout
                      }
                      isChildActive={isChildActive}
                    />
                  ))}
                </div>'''

        text = replace_once(
            text,
            old_map,
            new_map,
            'mapa de elementos del sidebar',
        )

        forbidden = (
            'const Tooltip =',
            'const renderItem =',
            'categoria.items.map(renderItem)',
            'ChevronDown',
        )
        remaining = [token for token in forbidden if token in text]
        if remaining:
            raise RuntimeError(
                'quedaron fragmentos antiguos: ' + ', '.join(remaining)
            )

        required = (
            "import SidebarNavigationItem from '../components/sidebar/SidebarNavigationItem';",
            '<SidebarNavigationItem',
            'onOpenCollapsedFlyout=',
            'onScheduleFlyoutClose=',
            'onCloseCollapsedFlyout=',
            'isChildActive={isChildActive}',
        )
        missing = [token for token in required if token not in text]
        if missing:
            raise RuntimeError(
                'faltan referencias requeridas: ' + ', '.join(missing)
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
