import { css } from 'lit-element';

export default css`
:host {
  overflow: inherit;
}

.drawer-content-wrapper {
  border-right: 1px var(--apic-drawer-content-wrapper-border-color) solid;
}

.api-docs .inline-request {
  max-width: 450px;
}

.powered-by {
  padding: 12px 0px;
  border-top: 1px var(--apic-powered-by-border-color) solid;
  margin: 8px 12px 0 12px;
  text-align: center;
}

a.attribution {
  margin: 0;
}

app-header {
  border-bottom: 1px var(--apic-app-header-border-color) solid;
}

app-header-layout {
  z-index: 9000;
}

.api-docs api-documentation {
  overflow: hidden;
}

/* Scrollbar customization (webkit and moz only) */
/* Webkit-based browsers (Chrome 2+, Opera 15+, Safari 4+) */
::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
}

::-webkit-scrollbar-corner {
    background: transparent;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground);
}

::-webkit-scrollbar-thumb:active {
    background: var(--vscode-scrollbarSlider-activeBackground);
}
`;
