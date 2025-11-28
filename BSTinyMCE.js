// ==UserScript==
// @name         TinyMCE - Buscar e Substituir no Código-Fonte
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adiciona um botão para buscar e substituir texto na janela de código-fonte do editor TinyMCE
// @author       inimig0r
// @updateURL    https://raw.githubusercontent.com/Suporte-Algetec/userscripts/refs/heads/main/BSTinyMCE.js
// @downloadURL  https://raw.githubusercontent.com/Suporte-Algetec/userscripts/refs/heads/main/BSTinyMCE.js
// @match        *://grupoa.education/creator/composite-object/*
// @match        *://plataforma-algetec.grupoa.education/dashboard/documents/edit/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const observer = new MutationObserver(() => {
    const modal = document.querySelector('.tox-dialog');
    const textarea = modal?.querySelector('textarea.tox-textarea');

    if (!modal || !textarea || modal.querySelector('#searchReplaceContainer')) return;

    // Histórico de alterações
    const undoStack = [textarea.value];

    const container = document.createElement('div');
    container.id = 'searchReplaceContainer';
    container.style.margin = '10px 0';
    container.style.padding = '10px';
    container.style.border = '1px solid #ccc';
    container.style.background = '#f9f9f9';
    container.style.borderRadius = '6px';
    container.style.position = 'relative';

    container.innerHTML = `
      <div style="margin-bottom:6px;">
        <label>🔍 Buscar: <input type="text" id="searchText" style="width:60%;" placeholder="Texto para buscar"></label>
      </div>
      <div style="margin-bottom:6px;">
        <label>🔁 Substituir por: <input type="text" id="replaceText" style="width:60%;" placeholder="Texto substituto"></label>
      </div>
      <div style="margin-bottom:6px;">
        <button id="replaceButton" style="margin-right:6px;">✏️ Substituir</button>
        <button id="undoButton">↩️ Desfazer</button>
      </div>
      <div style="position:absolute; bottom:4px; right:8px; font-size:12px; color:#888;">
        Ferramenta de Substituição <br> <i>@inimigor</i>
      </div>
    `;

    const content = modal.querySelector('.tox-dialog__body-content');
    content?.prepend(container);

    const getTextarea = () => modal.querySelector('textarea.tox-textarea');

    // Substituir texto
    container.querySelector('#replaceButton')?.addEventListener('click', () => {
      const textarea = getTextarea();
      const search = container.querySelector('#searchText').value;
      const replace = container.querySelector('#replaceText').value;

      if (!search.trim()) return;

      const scrollPos = textarea.scrollTop;
      const cursorPos = textarea.selectionStart;

      // Salva valor atual no histórico
      undoStack.push(textarea.value);

      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newText = textarea.value.replace(regex, replace);

      textarea.focus();
      textarea.setRangeText(newText, 0, textarea.value.length, 'end');

      // Restaura rolagem e posição de cursor
      textarea.scrollTop = scrollPos;
      textarea.selectionStart = textarea.selectionEnd = cursorPos;
    });

    // Desfazer (vários níveis)
    container.querySelector('#undoButton')?.addEventListener('click', () => {
      if (undoStack.length <= 1) return;
      undoStack.pop(); // remove o atual
      const previousValue = undoStack[undoStack.length - 1];
      const textarea = getTextarea();
      const scrollPos = textarea.scrollTop;

      textarea.focus();
      textarea.setRangeText(previousValue, 0, textarea.value.length, 'end');
      textarea.scrollTop = scrollPos;
    });

    // Intercepta Ctrl+Z para desfazer (somente no textarea)
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const undoBtn = container.querySelector('#undoButton');
        undoBtn.click();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();