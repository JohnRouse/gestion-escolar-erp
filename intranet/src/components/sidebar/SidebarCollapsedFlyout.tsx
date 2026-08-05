import { createPortal } from 'react-dom';
import type {
  KeyboardEventHandler,
  RefObject,
} from 'react';
import type { NavItem } from '../../config/sidebarNavigation';

type FlyoutPosition = {
  top: number;
  left: number;
};

type SidebarCollapsedFlyoutProps = {
  item: NavItem;
  position: FlyoutPosition;
  optionCount: number;
  flyoutRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onKeepOpen: () => void;
  onScheduleClose: () => void;
  onNavigate: (path: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  isChildActive: (path: string) => boolean;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export default function SidebarCollapsedFlyout({
  item,
  position,
  optionCount,
  flyoutRef,
  triggerRef,
  onKeepOpen,
  onScheduleClose,
  onNavigate,
  onKeyDown,
  isChildActive,
}: SidebarCollapsedFlyoutProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <aside
      ref={flyoutRef}
      id="sidebar-collapsed-flyout"
      role="menu"
      tabIndex={-1}
      className="sidebar-hover-flyout"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onScheduleClose}
      onFocus={onKeepOpen}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (
          nextTarget &&
          (
            flyoutRef.current?.contains(nextTarget) ||
            triggerRef.current?.contains(nextTarget)
          )
        ) {
          return;
        }

        onScheduleClose();
      }}
      onKeyDown={onKeyDown}
      aria-label={`Opciones de ${item.title}`}
    >
      <div className="sidebar-hover-flyout__header">
        <div>
          <p className="sidebar-hover-flyout__eyebrow">
            Menú
          </p>

          <h3>{item.title}</h3>
        </div>

        <span>
          {optionCount} opciones
        </span>
      </div>

      <div className="sidebar-hover-flyout__content">
        {item.children?.map((child) => {
          const nestedChildren = child.children || [];

          if (nestedChildren.length > 0) {
            return (
              <section
                key={child.title}
                className="sidebar-hover-flyout__group"
              >
                <p className="sidebar-hover-flyout__group-title">
                  {child.title}
                </p>

                <div>
                  {nestedChildren.map((nestedChild) => {
                    const active = isChildActive(nestedChild.path);

                    return (
                      <button
                        key={nestedChild.title}
                        type="button"
                        role="menuitem"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onNavigate(nestedChild.path)}
                        className={cx(
                          'sidebar-hover-flyout__item',
                          active &&
                            'sidebar-hover-flyout__item--active',
                        )}
                      >
                        <span>{nestedChild.title}</span>

                        <span
                          aria-hidden="true"
                          className="sidebar-hover-flyout__arrow"
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (!child.path) {
            return null;
          }

          const active = isChildActive(child.path);

          return (
            <button
              key={child.title}
              type="button"
              role="menuitem"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(child.path!)}
              className={cx(
                'sidebar-hover-flyout__item',
                active && 'sidebar-hover-flyout__item--active',
              )}
            >
              <span>{child.title}</span>

              <span
                aria-hidden="true"
                className="sidebar-hover-flyout__arrow"
              >
                →
              </span>
            </button>
          );
        })}
      </div>
    </aside>,
    document.body,
  );
}
