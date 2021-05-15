import { html } from 'lit-element';
import { ApiConsoleApp } from 'api-console/src/ApiConsoleApp.js';

/* This class overrides ApiConsoleApp methods to customize existing API Console features */
class CustomApiConsoleApp extends ApiConsoleApp {
    /*
     * Override _helpersTemplate() to remove redundant 'oauth-authorization'
     * elements since they are already created in the 'api-request-editor' element somehow.
     */
    _helpersTemplate() {
        super._helpersTemplate();
        return html`
        <xhr-simple-request
          .appendHeaders="${this.appendHeaders}"
          .proxy="${this.proxy}"
          .proxyEncodeUrl="${this.proxyEncodeUrl}"></xhr-simple-request>`;
    }

    resetSelection() {
        if (this.page !== 'docs') {
            this.page = 'docs';
        }
        this.selectedShapeType = 'summary';
        this.selectedShape = 'summary';
    }

    _apiNavigationOcurred(e) {
        const { selected, type, passive } = e.detail;
        const isPassive = passive === true;
        if (!isPassive && this.page !== 'docs') {
            this.closeTryIt();
        }
        this.selectedShape = selected;
        this.selectedShapeType = type;
    }

    async _processModelChange() {
        await super._processModelChange();
        this.resetSelection();
    }
}

window.customElements.define('api-console-app', CustomApiConsoleApp);