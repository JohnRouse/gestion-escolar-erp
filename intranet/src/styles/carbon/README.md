# Carbon UI interno

Esta carpeta contiene la capa nueva y ordenada del diseño Carbon de la intranet.

## Orden de archivos

- `00-tokens.css`: colores, radios, bordes, textos y transiciones.
- `01-accessibility.css`: legibilidad, focus visible y contraste.
- `02-components.css`: clases reutilizables para futuras pantallas.
- `03-modals.css`: base común para modales centrados.
- `04-page-scopes.css`: normalización para páginas ya rediseñadas.
- `carbon-refactor.css`: archivo índice importado desde `main.tsx`.

## Regla de uso

Para nuevos componentes, priorizar estas clases:

- `erp-carbon-panel`
- `erp-carbon-card`
- `erp-carbon-kpi`
- `erp-carbon-input`
- `erp-carbon-select`
- `erp-carbon-textarea`
- `erp-carbon-button-primary`
- `erp-carbon-button-secondary`
- `erp-carbon-table`
- `erp-carbon-modal-overlay`
- `erp-carbon-modal-panel`

Evitar textos muy claros como `text-slate-400`, `text-neutral-400` o placeholders de bajo contraste.
