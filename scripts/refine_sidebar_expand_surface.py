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
    / f'sidebar-expand-surface-{datetime.now():%Y%m%d-%H%M%S}'
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

    if 'handleCollapsedPanelClick' in original:
        print('ERROR: AppSidebar ya contiene la mejora de expansión por fondo.')
        return 2

    if 'SidebarCollapsedFlyout' not in original:
        print('ERROR: primero debe aplicarse la extracción del flyout colapsado.')
        return 2

    BACKUP_ROOT.mkdir(parents=True, exist_ok=False)
    backup = BACKUP_ROOT / 'AppSidebar.tsx'
    shutil.copy2(SIDEBAR, backup)

    try:
        text = original

        text = replace_once(
            text,
            '  type KeyboardEvent as ReactKeyboardEvent,\n',
            '  type KeyboardEvent as ReactKeyboardEvent,\n'
            '  type MouseEvent as ReactMouseEvent,\n',
            'import ReactMouseEvent',
        )

        navigate_block = '''  const handleNavigate = (path?: string) => {
    if (!path) return;

    setHoveredItem(null);
    navigate(path);
    close();
  };
'''

        navigate_with_handler = navigate_block + '''
  const handleCollapsedPanelClick = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!isCollapsed) return;

    const target = event.target as HTMLElement;
    const interactive = target.closest(
      'button, a, input, label, select, textarea, [role="menuitem"]',
    );

    if (interactive) return;

    toggleCollapse();
  };
'''

        text = replace_once(
            text,
            navigate_block,
            navigate_with_handler,
            'control de clic en fondo colapsado',
        )

        old_panel = '''        <div className="flex h-[calc(100vh-24px)] flex-col rounded-[1.75rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl overflow-hidden">'''

        new_panel = '''        <div
          data-sidebar-expand-surface={isCollapsed ? 'true' : undefined}
          onClick={handleCollapsedPanelClick}
          className={cx(
            'flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl',
            isCollapsed &&
              'cursor-col-resize [&_button]:cursor-pointer',
          )}
        >'''

        text = replace_once(
            text,
            old_panel,
            new_panel,
            'superficie expandible del sidebar',
        )

        collapsed_button = '''          {isCollapsed && (

            <div className="flex justify-center border-b border-slate-100 py-2">
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                title="Expandir menú"
                aria-label="Expandir menú lateral"
              >
                <PanelLeft size={18} className="rotate-180" />
              </button>
            </div>
          )}

'''

        text = replace_once(
            text,
            collapsed_button,
            '',
            'botón inferior de expansión',
        )

        forbidden = (
            'title="Expandir menú"',
            'aria-label="Expandir menú lateral"',
            '<PanelLeft size={18} className="rotate-180" />',
        )
        remaining = [token for token in forbidden if token in text]
        if remaining:
            raise RuntimeError(
                'quedaron referencias al botón eliminado: ' + ', '.join(remaining)
            )

        required = (
            'handleCollapsedPanelClick',
            'data-sidebar-expand-surface',
            'cursor-col-resize',
            '[&_button]:cursor-pointer',
        )
        missing = [token for token in required if token not in text]
        if missing:
            raise RuntimeError(
                'faltan elementos de la interacción nueva: ' + ', '.join(missing)
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
