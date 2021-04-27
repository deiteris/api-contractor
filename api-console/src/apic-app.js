import {
  html,
  render
} from 'lit-html';

export class ApicApplication {
  constructor() {
    this.consoleSelector = '#console';
  }

  initialize() {
    this.apic = document.querySelector('api-console-app');

    window.addEventListener('message', this._onMessage.bind(this));
  }

  _onMessage(e) {
    console.log(e);
    const model = JSON.parse(e.data);
    this.apic.amf = model;
  }

  template() {
    return html `<api-console-app
      app
      rearrangeEndpoints>
    </api-console-app>
    `;
  }

  render() {
    if (this._rendering) {
      return;
    }
    this.consoleContainer = document.querySelector(this.consoleSelector);
    this._rendering = true;
    setTimeout(() => {
      this._rendering = false;
      this._render();
      if (!this.__firstRendered) {
        this.__firstRendered = true;
        setTimeout(() => this.initialize());
      }
    });
  }

  _render() {
    const content = this.template();
    render(content, this.consoleContainer);
  }
}