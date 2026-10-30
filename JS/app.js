// --- CONFIGURAÇÃO DO BANCO DE DADOS (IndexedDB) ---
const DB_NAME = 'AssetTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'assets';
let db;

// Inicializa a base de dados no browser
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    loadAssets(); // Carrega os dados guardados assim que o DB estiver pronto
};

request.onerror = (event) => {
    console.error("Erro ao abrir a base de dados:", event.target.errorCode);
};

// --- OPERAÇÕES DO BANCO DE DADOS ---

// Adicionar Ativo
function addAsset(asset) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(asset);

    transaction.oncomplete = () => {
        loadAssets();
    };
}

// Apagar Ativo
function deleteAsset(id) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    transaction.oncomplete = () => {
        loadAssets();
    };
}

// Carregar e Exibir Dados
function loadAssets() {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const assets = request.result;
        renderTable(assets);
        renderSummary(assets);
    };
}

// --- LÓGICA DE INTERFACE E RENDERIZAÇÃO ---

const assetForm = document.getElementById('asset-form');
const assetsList = document.getElementById('assets-list');
const entitySummary = document.getElementById('entity-summary');
const exportBtn = document.getElementById('export-btn');

// Submeter Formulário
assetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newAsset = {
        type: document.getElementById('asset-type').value,
        entity: document.getElementById('entity').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        notes: document.getElementById('notes').value.trim(),
        date: new Date().toISOString()
    };

    addAsset(newAsset);
    assetForm.reset();
});

// Renderizar Tabela de Ativos
function renderTable(assets) {
    assetsList.innerHTML = '';

    assets.forEach((asset) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.type}</td>
            <td><strong>${asset.entity}</strong></td>
            <td>${asset.amount.toLocaleString()}</td>
            <td>${asset.notes || '-'}</td>
            <td>
                <button class="btn-danger" onclick="deleteAsset(${asset.id})">Apagar</button>
            </td>
        `;
        assetsList.appendChild(row);
    });
}

// Agrupar e Renderizar Resumo por Entidade (Calcula "quanto temos em cada entidade")
function renderSummary(assets) {
    entitySummary.innerHTML = '';
    const totalsByEntity = {};

    assets.forEach(asset => {
        totalsByEntity[asset.entity] = (totalsByEntity[asset.entity] || 0) + asset.amount;
    });

    for (const [entity, total] of Object.entries(totalsByEntity)) {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h4>${entity}</h4>
            <p>${total.toLocaleString()} </p>
        `;
        entitySummary.appendChild(card);
    }
}

// Exportar e Preparar Relatório para Envio
exportBtn.addEventListener('click', () => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const assets = request.result;
        if (assets.length === 0) {
            alert('Não há dados registados para exportar.');
            return;
        }

        let reportText = "RELATÓRIO DE CONTROLO DE ATIVOS\n";
        reportText += "=================================\n\n";

        assets.forEach(a => {
            reportText += `• [${a.type}] na entidade '${a.entity}': ${a.amount.toLocaleString()} | Notas: ${a.notes || 'N/A'}\n`;
        });

        // Simula a exportação via transferência de ficheiro de texto / e-mail
        const mailtoLink = `mailto:Nilsen.paiva@isytec.co.ao?subject=Relatorio%20de%20Ativos&body=${encodeURIComponent(reportText)}`;
        window.location.href = mailtoLink;
    };
});
