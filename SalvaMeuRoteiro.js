// ==UserScript==
// @name         Salva meu Roteiro! - AutoSave TinyMCE HTML (IndexedDB)
// @namespace    https://plataforma-algetec.grupoa.education/
// @version      1.2.8
// @description  Salva automaticamente o HTML do editor WYSIWYG TinyMCE usando IndexedDB e exibe as últimas 5 versões salvas.
// @author       inimigor
// @match        *://plataforma-algetec.grupoa.education/dashboard/documents/edit/*
// @match        *://grupoa.education/creator/composite-object/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const autoSaveInterval = 3 * 60 * 1000; // Salvar a cada 5 minutos
    const versionLimit = 10;
    const dbName = "TinyMCEAutoSaveDB";
    const storeName = "versions";

    function openDB(callback) {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };
        request.onsuccess = function (event) {
            callback(event.target.result);
        };
    }

    function getTinyMCEIframe() {
        return document.querySelector("iframe.tox-edit-area__iframe");
    }

    function getStorageKey() {
        return `tinymce_versions_${location.href}`;
    }

    function saveHtml() {
        const iframe = getTinyMCEIframe();
        if (!iframe) {
            console.warn("Iframe do TinyMCE não encontrado.");
            return;
        }

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const htmlContent = doc.body.innerHTML;

        openDB((db) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            store.get(getStorageKey()).onsuccess = function (event) {
                let versions = event.target.result?.versions || [];
                versions.unshift({ timestamp: new Date().toISOString(), content: htmlContent });
                versions = versions.slice(0, versionLimit); // Mantém no máximo 5 versões

                store.put({ id: getStorageKey(), versions });
                console.log("HTML salvo no IndexedDB.");
                updateVersionList();
            };
        });
    }

    function deleteVersion(index) {
        openDB((db) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            store.get(getStorageKey()).onsuccess = function (event) {
                let versions = event.target.result?.versions || [];
                versions.splice(index, 1);
                store.put({ id: getStorageKey(), versions });
                updateVersionList();
            };
        });
    }

    function createControlPanel() {
        const toggleButton = document.createElement("button");
        toggleButton.id = "toggleMenuButton";
        toggleButton.style.position = "fixed";
        toggleButton.style.bottom = "10px";
        toggleButton.style.right = "10px";
        toggleButton.style.width = "50px";
        toggleButton.style.height = "50px";
        toggleButton.style.backgroundColor = "#007bff";
        toggleButton.style.color = "white";
        toggleButton.style.border = "none";
        toggleButton.style.borderRadius = "50%";
        toggleButton.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        toggleButton.style.fontSize = "24px";
        toggleButton.style.cursor = "pointer";
        toggleButton.innerHTML = "📄";

        const panel = document.createElement("div");
        panel.id = "controlPanel";
        panel.style.position = "fixed";
        panel.style.top = "10px";
        panel.style.right = "10px";
        panel.style.width = "300px";
        panel.style.backgroundColor = "#f9f9f9";
        panel.style.border = "1px solid #ccc";
        panel.style.borderRadius = "8px";
        panel.style.padding = "15px";
        panel.style.zIndex = "10000";
        panel.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        panel.style.display = "none";
        panel.innerHTML = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Pacifico&display=swap');
        .custom-title {
            font-family: 'Pacifico', cursive;
            font-size: 24px;
        }
    </style>
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <center><strong class="custom-title">Salva meu Roteiro!</strong></center>
        <button id="closePanelButton" style="background: none; border: none; font-size: 20px; cursor: pointer;">✖</button>
    </div>
    <button id="manualSaveButton" style="width: 100%; margin-top: 10px; padding: 8px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar manualmente</button>
    <p>Documentos salvos a cada 3 minutos</p>
    <div id="versionListContainer" style="margin-top: 15px; max-height: 200px; overflow-y: auto; border-top: 1px solid #ddd; padding-top: 10px;">
        <ul id="versionList" style="list-style: none; padding: 0; margin: 0;"></ul>
    </div>
`;
        document.body.appendChild(toggleButton);
        document.body.appendChild(panel);

        toggleButton.addEventListener("click", () => {
            panel.style.display = panel.style.display === "none" ? "block" : "none";
        });

        document.getElementById("closePanelButton").addEventListener("click", () => {
            panel.style.display = "none";
        });

        document.getElementById("manualSaveButton").addEventListener("click", saveHtml);

        updateVersionList();
    }

    function updateVersionList() {
        openDB((db) => {
            const versionList = document.getElementById("versionList");
            if (!versionList) return;

            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            store.get(getStorageKey()).onsuccess = function (event) {
                const versions = event.target.result?.versions || [];
                versionList.innerHTML = "";

                versions.forEach((version, index) => {
                    const li = document.createElement("li");
                    li.style.display = "flex";
                    li.style.justifyContent = "space-between";
                    li.style.alignItems = "center";
                    li.style.marginBottom = "8px";
                    li.style.padding = "5px";
                    li.style.border = "1px solid #ddd";
                    li.style.borderRadius = "4px";

                    const versionInfo = document.createElement("span");
                    versionInfo.textContent = `V${index + 1} - ${new Date(version.timestamp).toLocaleString()}`;
                    versionInfo.style.flexGrow = "1";
                    versionInfo.style.marginRight = "10px";

                    const viewButton = document.createElement("button");
                    viewButton.textContent = "Ver";
                    viewButton.style.padding = "4px 8px";
                    viewButton.style.backgroundColor = "#28a745";
                    viewButton.style.color = "white";
                    viewButton.style.border = "none";
                    viewButton.style.borderRadius = "4px";
                    viewButton.style.cursor = "pointer";
                    viewButton.addEventListener("click", () => {
                        const newTab = window.open();
                        newTab.document.write(`
        <html>
        <head>
            <title>Versão Salva - ${new Date(version.timestamp).toLocaleString()}</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { font-size: 18px; }
                textarea { width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; font-family: monospace; }
                pre { white-space: pre-wrap; word-wrap: break-word; border: 1px solid #ccc; padding: 10px; background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>Versão Salva - ${new Date(version.timestamp).toLocaleString()}</h1>
            <textarea readonly>${version.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
            <h2>Visualização</h2>
            <pre>${version.content}</pre>
        </body>
        </html>
    `);
                        newTab.document.close();
                    });
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "Apagar";
                    deleteButton.style.padding = "4px 8px";
                    deleteButton.style.backgroundColor = "#dc3545";
                    deleteButton.style.color = "white";
                    deleteButton.style.border = "none";
                    deleteButton.style.borderRadius = "4px";
                    deleteButton.style.cursor = "pointer";
                    deleteButton.addEventListener("click", () => {
                        deleteVersion(index);
                    });

                    li.appendChild(versionInfo);
                    li.appendChild(viewButton);
                    li.appendChild(deleteButton);
                    versionList.appendChild(li);
                });
            };
        });
    }

    setInterval(saveHtml, autoSaveInterval);
    createControlPanel();
})();