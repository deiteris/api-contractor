import { css } from 'lit-element';

export default css`
:host {
  overflow: auto;
}

app-drawer, .drawer-content-wrapper {
  border-right: 1px var(--apic-drawer-content-wrapper-border-color) solid;
}

.powered-by {
  padding: 12px 0px;
  border-top: 1px var(--apic-powered-by-border-color) solid;
  margin: 8px 12px 0 12px;
}

app-header {
  border-bottom: 1px var(--apic-app-header-border-color) solid;
}

.api-docs api-documentation {
  overflow: hidden;
}
`;
