import { html } from 'lit-element';
import attributionTpl from 'api-console/src/attribution-template.js';
import { ApiConsoleApp } from 'api-console/src/ApiConsoleApp.js';
import { search } from '@advanced-rest-client/arc-icons/ArcIcons.js';
import styles from './api-console-styles.js';

/* This class overrides ApiConsoleApp methods to customize existing API Console features */
class CustomApiConsoleApp extends ApiConsoleApp {
    /**
     * @type {CSSResult[]}
     */
    static get styles() {
        return [
            /** @type CSSResult */ (ApiConsoleApp.styles),
            styles,
        ];
    }

    _filterNavigation(e) {
        const nav = this.shadowRoot.querySelector('api-navigation');
        nav.query = e.target.value;
    }

    /**
     * @return {TemplateResult} The template for api navigation element
     */
     _navigationTemplate() {
        const {
            amf,
            noAttribution,
            rearrangeEndpoints
        } = this;
        return html `<div class="drawer-content-wrapper">
            <anypoint-input style="margin: 0 0 5px 0; padding: 0 15px; width: 100%;" placeholder="Endpoint path or name" @input="${e => this._filterNavigation(e)}">
                <label slot="label">Search</label>
                <span slot="prefix" class="icon">${search}</span>
            </anypoint-input>
            <api-navigation
                .amf="${amf}"
                summary
                endpointsOpened
                ?rearrangeEndpoints="${rearrangeEndpoints}"
                @api-navigation-selection-changed="${this._apiNavigationOcurred}"
                ?operationsOpened="${this.operationsOpened}"
                ?noOverview="${this.noOverview}"
                ?renderFullPaths="${this.renderFullPaths}"
            ></api-navigation>
            ${noAttribution ? '' : attributionTpl}
        </div>`;
    }

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
        if (!this.selectedShape && !this.selectedShapeType) {
            this.resetSelection();
        }
    }
}

window.customElements.define('api-console-app', CustomApiConsoleApp);