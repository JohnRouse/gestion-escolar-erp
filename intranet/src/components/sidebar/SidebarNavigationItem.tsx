import {
  ChevronDown,
} from 'lucide-react';
import type {
  RefObject,
} from 'react';
import type {
  NavItem,
} from '../../config/sidebarNavigation';

type SidebarNavigationItemProps = {
  item: NavItem;
  isCollapsed: boolean;
  isExpanded: boolean;
  isActive: boolean;
  isFlyoutOpen: boolean;
  flyoutRef: RefObject<HTMLElement | null>;
  onNavigate: (path?: string) => void;
  onToggleExpanded: () => void;
  onOpenCollapsedFlyout: (
    item: NavItem,
    target: HTMLButtonElement,
    focusFirst?: boolean,
  ) => void;
  onScheduleFlyoutClose: () => void;
  onCloseCollapsedFlyout: (
    returnFocus?: boolean,
  ) => void;
  isChildActive: (path: string) => boolean;
};

const cx = (
  ...classes: Array<
    string | false | null | undefined
  >
) => classes.filter(Boolean).join(' ');

function SidebarTooltip({
  title,
}: {
  title: string;
}) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[80] -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl shadow-slate-950/15 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:translate-x-1 group-focus-visible:opacity-100">
      {title}
    </span>
  );
}

export default function SidebarNavigationItem({
  item,
  isCollapsed,
  isExpanded,
  isActive,
  isFlyoutOpen,
  flyoutRef,
  onNavigate,
  onToggleExpanded,
  onOpenCollapsedFlyout,
  onScheduleFlyoutClose,
  onCloseCollapsedFlyout,
  isChildActive,
}: SidebarNavigationItemProps) {
  const hasChildren = Boolean(
    item.children?.length,
  );
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div className="relative">
        <button
          type="button"
          onMouseEnter={(event) =>
            onOpenCollapsedFlyout(
              item,
              event.currentTarget,
            )
          }
          onMouseLeave={onScheduleFlyoutClose}
          onFocus={(event) =>
            onOpenCollapsedFlyout(
              item,
              event.currentTarget,
            )
          }
          onBlur={(event) => {
            const nextTarget =
              event.relatedTarget as Node | null;

            if (
              nextTarget &&
              flyoutRef.current?.contains(
                nextTarget,
              )
            ) {
              return;
            }

            onScheduleFlyoutClose();
          }}
          onKeyDown={(event) => {
            if (!isCollapsed) return;

            if (
              event.key === 'ArrowRight' ||
              event.key === 'ArrowDown' ||
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault();
              onOpenCollapsedFlyout(
                item,
                event.currentTarget,
                true,
              );
            } else if (
              event.key === 'Escape'
            ) {
              event.preventDefault();
              onCloseCollapsedFlyout(true);
            }
          }}
          onClick={(event) => {
            if (isCollapsed) {
              onOpenCollapsedFlyout(
                item,
                event.currentTarget,
                true,
              );
              return;
            }

            onToggleExpanded();
          }}
          aria-haspopup={
            isCollapsed ? 'menu' : undefined
          }
          aria-controls={
            isCollapsed
              ? 'sidebar-collapsed-flyout'
              : undefined
          }
          aria-expanded={
            isCollapsed
              ? isFlyoutOpen
              : isExpanded
          }
          className={cx(
            'sidebar-nav-item group relative flex h-11 w-full items-center rounded-2xl text-sm font-semibold transition-all duration-200 ease-out',
            isCollapsed
              ? 'justify-center px-0'
              : 'justify-between px-3',
            isActive
              ? 'bg-slate-950 text-white shadow-sm shadow-slate-950/10'
              : 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950',
          )}
        >
          <span
            className={cx(
              'flex min-w-0 items-center',
              isCollapsed
                ? 'justify-center'
                : 'gap-3',
            )}
          >
            <span
              className={cx(
                'sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-transparent text-white'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-900',
              )}
            >
              <Icon
                size={18}
                strokeWidth={2}
              />
            </span>

            {!isCollapsed && (
              <span className="truncate">
                {item.title}
              </span>
            )}
          </span>

          {!isCollapsed && (
            <ChevronDown
              size={16}
              className={cx(
                'shrink-0 transition-transform duration-200',
                isExpanded && 'rotate-180',
                isActive
                  ? 'text-white/70'
                  : 'text-slate-400',
              )}
            />
          )}
        </button>

        {isExpanded && !isCollapsed && (
          <div className="relative ml-5 mt-2 space-y-2 border-l border-slate-200 pl-3">
            {item.children!.map((child) => {
              const groupedChildren =
                child.children || [];

              if (
                groupedChildren.length > 0
              ) {
                const groupActive =
                  groupedChildren.some(
                    (nestedChild) =>
                      isChildActive(
                        nestedChild.path,
                      ),
                  );

                return (
                  <div
                    key={child.title}
                    className="space-y-1"
                  >
                    <p
                      className={cx(
                        'sidebar-group-label px-3 pt-2 text-[10px] font-black uppercase',
                        groupActive
                          ? 'text-blue-700'
                          : 'text-slate-400',
                      )}
                    >
                      {child.title}
                    </p>

                    <div className="space-y-1">
                      {groupedChildren.map(
                        (nestedChild) => {
                          const activeChild =
                            isChildActive(
                              nestedChild.path,
                            );

                          return (
                            <button
                              key={
                                nestedChild.title
                              }
                              type="button"
                              onClick={() =>
                                onNavigate(
                                  nestedChild.path,
                                )
                              }
                              className={cx(
                                'sidebar-subitem flex min-h-9 w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                                activeChild
                                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                              )}
                            >
                              <span className="truncate">
                                {
                                  nestedChild.title
                                }
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              }

              if (!child.path) return null;

              const activeChild =
                isChildActive(child.path);

              return (
                <button
                  key={child.title}
                  type="button"
                  onClick={() =>
                    onNavigate(child.path)
                  }
                  className={cx(
                    'sidebar-subitem relative flex min-h-8 w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                    activeChild
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  {activeChild && (
                    <span className="absolute -left-[17px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600 ring-4 ring-white" />
                  )}

                  <span className="truncate">
                    {child.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      title={
        isCollapsed
          ? item.title
          : undefined
      }
      className={cx(
        'sidebar-nav-item group relative flex h-11 w-full items-center rounded-2xl text-sm font-semibold transition-all duration-200 ease-out',
        isCollapsed
          ? 'justify-center px-0'
          : 'gap-3 px-3',
        isActive
          ? 'bg-slate-950 text-white shadow-sm shadow-slate-950/10'
          : 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950',
      )}
    >
      <span
        className={cx(
          'sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
          isActive
            ? 'bg-transparent text-white'
            : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-900',
        )}
      >
        <Icon
          size={18}
          strokeWidth={2}
        />
      </span>

      {!isCollapsed && (
        <span className="truncate">
          {item.title}
        </span>
      )}

      {isCollapsed && (
        <SidebarTooltip
          title={item.title}
        />
      )}
    </button>
  );
}
