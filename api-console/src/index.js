import {
  ApicApplication
} from './apic-app.js';

document.addEventListener('WebComponentsReady', function () {
  if (!window.ShadyCSS) {
    return;
  }

  function shouldAddDocumentStyle(n) {
    return n.nodeType === Node.ELEMENT_NODE && n.localName === 'style' && !n.hasAttribute('scope');
  }
  const CustomStyleInterface = window.ShadyCSS.CustomStyleInterface;

  const candidates = document.querySelectorAll('style');
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (shouldAddDocumentStyle(candidate)) {
      CustomStyleInterface.addCustomStyle(candidate);
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const consoleApp = new ApicApplication();
  consoleApp.render();
});