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
    / f'sidebar-collapsed-flyout-{datetime.now():%Y%m%d-%H%M%S}'
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

    import_line = (
        "import SidebarCollapsedFlyout from "
        "'../components/sidebar/SidebarCollapsedFlyout';\n"
    )

    if import_line in original:
        print('ERROR: AppSidebar ya usa SidebarCollapsedFlyout.')
        return 2

    BACKUP_ROOT.mkdir(parents=True, exist_ok=False)
    backup = BACKUP_ROOT / 'AppSidebar.tsx'
    shutil.copy2(SIDEBAR, backup)

    try:
        text = original

        text = replace_once(
            text,
            "import { createPortal } from 'react-dom';\n",
            '',
            'import createPortal',
        )

        text = replace_once(
            text,
            "import InstitutionMark from '../components/InstitutionMark';\n",
            "import InstitutionMark from '../components/InstitutionMark';\n"
            + import_line,
            'import SidebarCollapsedFlyout',
        )

        portal_start = text.find(
            "      {isCollapsed &&\n"
            "        hoveredItem?.children?.length &&\n"
            "        typeof document !== 'undefined' &&\n"
            "        createPortal("
        )

        component_end = text.rfind("\n    </>\n  );\n}")

        if portal_start < 0 or component_end < 0:
            raise RuntimeError(
                'flyout colapsado: no se encontraron los límites del bloque'
            )

        replacement = '''      {isCollapsed &&
        hoveredItem?.children?.length && (
          <SidebarCollapsedFlyout
            item={hoveredItem}
            position={flyoutPosition}
            optionCount={getChildPaths(hoveredItem).length}
            flyoutRef={flyoutRef}
            triggerRef={flyoutTriggerRef}
            onKeepOpen={clearFlyoutCloseTimer}
            onScheduleClose={scheduleFlyoutClose}
            onNavigate={handleNavigate}
            onKeyDown={handleFlyoutKeyDown}
            isChildActive={isChildActive}
          />
        )}'''

        text = text[:portal_start] + replacement + text[component_end:]

        forbidden = (
            'createPortal',
            'sidebar-hover-flyout__header',
            'sidebar-hover-flyout__content',
            'sidebar-hover-flyout__item',
        )
        remaining = [token for token in forbidden if token in text]
        if remaining:
            raise RuntimeError(
                'quedaron fragmentos antiguos: ' + ', '.join(remaining)
            )

        required = (
            import_line.strip(),
            '<SidebarCollapsedFlyout',
            'flyoutPosition',
            'flyoutCloseTimer',
            'openCollapsedFlyout',
            'handleFlyoutKeyDown',
            'scheduleFlyoutClose',
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
