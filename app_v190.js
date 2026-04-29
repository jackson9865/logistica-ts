let html5QrCode = null;
let currentUser = { name: 'Operador', id: '000' }; // Tracks the logged-in user

// Global Cloud Configuration (GitHub Pages Edition - Final Fix)
const CLOUD_DB_URL = 'https://api.jsonbin.io/v3/b/662e864ead19ca34f861179e?meta=false';
const SYSTEM_VERSION = '1.9.0-GitHub';

// --- PWA INSTALL LOGIC ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn) installBtn.style.display = 'flex'; // Mostra o botão quando puder instalar
});

function triggerPwaInstall() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                document.getElementById('btn-install-pwa').style.display = 'none';
            }
            deferredPrompt = null;
        });
    } else {
        // Fallback: Instruções Manuais
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert('📱 PARA INSTALAR NO iPHONE:\n1. Clique no botão de COMPARTILHAR (quadrado com seta).\n2. Role para baixo e clique em "ADICIONAR À TELA DE INÍCIO".');
        } else {
            alert('📲 PARA INSTALAR:\nClique nos 3 PONTINHOS do seu navegador e escolha "INSTALAR APLICATIVO" ou "ADICIONAR À TELA INICIAL".');
        }
    }
}

// USUÁRIOS PADRÃO (Sempre disponíveis mesmo offline)
const DEFAULT_USERS = [
    { name: 'Jackson Oliveira Gomes', id: '151525', pass: 'JAC.9865', company: 'Paguemenos' },
    { name: 'Jackson Oliveira Gomes', id: '151525', pass: 'jac.9865', company: 'Paguemenos' }
];


// -------------------------------------------------------
// PRODUCT DATABASE & CURRENT ENTRY
// -------------------------------------------------------
let currentEntry = {
    productId: '000',
    productName: 'Aguardando Leitura',
    sku: '---',
    lot: '---',
    validity: '---',
    content: '---',
    address: '---'
};

const SAMPLE_PRODUCTS = [
    { sku: '7891000200030', productId: '020', productName: 'Dipirona 500mg', lot: 'LT9876-PHARMA', validity: '12/2026', content: 'Contém 50 caixinhas de Dipirona 500mg.', address: 'PULMÃO PG15 - Col.3 / Nív.2' },
    { sku: '7891000100047', productId: '021', productName: 'Amoxicilina 500mg', lot: 'LT1234-PHARMA', validity: '06/2026', content: 'Contém 20 cápsulas de Amoxicilina 500mg.', address: 'PULMÃO PG15 - Col.3 / Nív.4' },
    { sku: '7890300503613', productId: '022', productName: 'Paracetamol 750mg', lot: 'LT5678-PHARMA', validity: '09/2026', content: 'Contém 20 comprimidos de Paracetamol 750mg.', address: 'PULMÃO PG18 - Col.5 / Nív.1' },
    { sku: '7891317600010', productId: '023', productName: 'Ibuprofeno 600mg', lot: 'LT9012-PHARMA', validity: '03/2027', content: 'Contém 20 comprimidos de Ibuprofeno 600mg.', address: 'PULMÃO PG20 - Col.2 / Nív.3' },
    { sku: '7896876010028', productId: '024', productName: 'Omeprazol 20mg', lot: 'LT3456-PHARMA', validity: '11/2026', content: 'Contém 14 cápsulas de Omeprazol 20mg.', address: 'PULMÃO PG15 - Col.4 / Nív.2' }
];

function initSampleProducts() {
    const existing = getProducts();
    if (existing.length === 0) {
        localStorage.setItem('ts_products', JSON.stringify(SAMPLE_PRODUCTS));
    }
}

function getProducts() {
    return JSON.parse(localStorage.getItem('ts_products') || '[]');
}

function saveProducts(products) {
    localStorage.setItem('ts_products', JSON.stringify(products));
}

function findProductBySKU(sku) {
    const cleanSku = sku.replace('TS-', '');
    return getProducts().find(p => p.sku === cleanSku || p.productId === cleanSku || p.sku === sku) || null;
}

function getNextProductId() {
    const products = getProducts();
    if (products.length === 0) return '001';
    const max = Math.max(...products.map(p => parseInt(p.productId) || 0));
    return String(max + 1).padStart(3, '0');
}

// -------------------------------------------------------
// LABEL RENDERING
// -------------------------------------------------------
function renderLabel() {
    const container = document.getElementById('dynamic-label');
    if (!container) return;

    // Update the ID header above the label
    const header = document.getElementById('phase2-id-header');
    if (header) {
        header.innerText = `${currentEntry.productId} - ${currentEntry.productName.toUpperCase()}`;
    }

    container.innerHTML = `
        <div class="label-html">
            <div class="label-left">
                <div class="lbl-brand">Pague Menos</div>
                <div id="lbl-qr-canvas" class="lbl-qr-wrap"></div>
                <div class="lbl-id">${currentEntry.productId}</div>
            </div>
            <div class="label-right">
                <div class="label-row">
                    <span class="label-icon">📍</span>
                    <div>
                        <div class="label-field-name">ENDEREÇO MASTER:</div>
                        <div class="label-field-value">${currentEntry.address}</div>
                    </div>
                </div>
                <div class="label-row">
                    <span class="label-icon">➕</span>
                    <div>
                        <div class="label-field-name">DESCRIÇÃO DO PRODUTO:</div>
                        <div class="label-field-value">${currentEntry.productName} - Master</div>
                    </div>
                </div>
                <div class="label-row">
                    <span class="label-icon">▌▌▌</span>
                    <div>
                        <div class="label-field-name">LOTE:</div>
                        <div class="label-field-value">${currentEntry.lot}</div>
                    </div>
                </div>
                <div class="label-row">
                    <span class="label-icon">📅</span>
                    <div>
                        <div class="label-field-name">VALIDADE (FEFO): 🌙</div>
                        <div class="label-field-value">${currentEntry.validity}</div>
                    </div>
                </div>
                <div class="label-row">
                    <span class="label-icon">📦</span>
                    <div>
                        <div class="label-field-name">CONTEÚDO:</div>
                        <div class="label-field-value">${currentEntry.content}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Generate QR code
    const qrEl = document.getElementById('lbl-qr-canvas');
    if (qrEl && typeof QRCode !== 'undefined') {
        new QRCode(qrEl, {
            text: currentEntry.sku !== '---' ? currentEntry.sku : `TS-${currentEntry.productId}`,
            width: 90,
            height: 90,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

function printLabel() {
    alert(`Imprimindo Etiqueta Master...\nProduto: ${currentEntry.productName}\nLote: ${currentEntry.lot}\nValidade: ${currentEntry.validity}`);
}

// -------------------------------------------------------
// CAMERA / SCANNER
// -------------------------------------------------------
function startCamera(elementId) {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode = null;
            document.getElementById('start-camera-btn').innerText = "📷 ATIVAR CÂMERA REAL";
            document.querySelector('.scanner-line').style.display = 'block';
            document.getElementById('scanner-instructions').style.display = 'block';
            document.getElementById('reader-container').style.background = '#000';
        });
        return;
    }

    html5QrCode = new Html5Qrcode(elementId);
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            handleSuccessfulScan(decodedText);
            html5QrCode.stop();
            html5QrCode = null;
            document.getElementById('start-camera-btn').innerText = "📷 ATIVAR CÂMERA REAL";
        },
        () => {}
    ).then(() => {
        document.getElementById('start-camera-btn').innerText = "🛑 PARAR CÂMERA";
        document.querySelector('.scanner-line').style.display = 'none';
        document.getElementById('scanner-instructions').style.display = 'none';
        document.getElementById('reader-container').style.background = 'transparent';
    }).catch((err) => {
        alert("Erro ao acessar câmera: Use HTTPS e dê permissão.");
        console.error(err);
    });
}

// Lógica de Endereçamento Automático por Categoria
function calculateAutomaticAddress(productName) {
    const name = productName.toLowerCase();
    // MEDICAMENTOS (PG 1 a 9)
    if (name.includes('dipirona') || name.includes('amoxicilina') || name.includes('ibuprofeno') || name.includes('omeprazol') || name.includes('paracetamol')) {
        const pg = Math.floor(Math.random() * 9) + 1;
        return `PULMÃO PG0${pg} - MEDICAMENTOS`;
    } 
    // ALIMENTOS (PG 10 a 11)
    else if (name.includes('alimento') || name.includes('biscoito') || name.includes('leite') || name.includes('doce')) {
        const pg = Math.floor(Math.random() * 2) + 10;
        return `PULMÃO PG${pg} - ALIMENTOS`;
    } 
    // PERFUMARIA (PG 12 a 20)
    else if (name.includes('perfumaria') || name.includes('shampoo') || name.includes('sabonete') || name.includes('creme')) {
        const pg = Math.floor(Math.random() * 9) + 12;
        return `PULMÃO PG${pg} - PERFUMARIA`;
    }
    return 'PULMÃO GERAL - DEFINIR';
}

function handleSuccessfulScan(data) {
    const activeScreen = document.querySelector('.screen.active');
    
    if (activeScreen.id === 'screen-register') {
        document.getElementById('reg-sku').value = data;
        document.getElementById('reg-name').focus();
    }
    
    if (activeScreen.id === 'screen-phase1') {
        const loteInput = document.getElementById('lote-val-input');
        const skuCheck = document.getElementById('sku-check');
        const productResult = document.getElementById('product-scan-result');
        const nextBtn = document.getElementById('btn-phase1-next');
        const skuDisplay = document.getElementById('scanned-sku');

        // Busca o produto base
        const product = findProductBySKU(data);

        // SEMPRE gera um ID único para esta entrada (Numeração diferente para cada pallet)
        const uniquePalletId = getNextProductId();

        if (product) {
            currentEntry = { 
                ...product, 
                productId: uniquePalletId, // Sobrescreve com ID único da carga
                address: calculateAutomaticAddress(product.productName) // Define endereço por regra de negócio
            };
            skuDisplay.innerText = `CÓDIGO: ${data} | ${product.productName}`;
            loteInput.value = `${product.lot} / VAL: ${product.validity}`;
        } else {
            currentEntry = {
                productId: uniquePalletId,
                productName: 'Produto Novo (Cadastrar)',
                sku: data,
                lot: '---',
                validity: '---',
                content: '---',
                address: 'DEFINIR NO RECEBIMENTO'
            };
            skuDisplay.innerText = `CÓDIGO: ${data} — Novo item detectado!`;
            loteInput.value = 'Aguardando definição de Lote/Validade';
        }
        
        skuCheck.classList.add('checked');
        productResult.style.display = 'block';
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        incrementPendingLoad();
    }

    if (activeScreen.id === 'screen-forklift') {
        const product = findProductBySKU(data);
        if (product) {
            currentEntry = { ...product };
            document.getElementById('fork-prod-name').innerText = product.productName;
            document.getElementById('fork-prod-sku').innerText = `SKU: ${product.sku}`;
            document.getElementById('fork-prod-lot').innerText = product.lot;
            document.getElementById('fork-prod-val').innerText = product.validity;
            document.getElementById('fork-prod-address').innerText = product.address;
            document.getElementById('forklift-product-info').style.display = 'block';
            document.getElementById('forklift-controls').style.display = 'block';
        }
    }

    if (activeScreen.id === 'screen-stock-query') {
        document.getElementById('query-lote-input').value = data;
        runStockQuery();
    }

    if (activeScreen.id === 'screen-conferencia') {
        runConferenceScan(data);
    }

    if (activeScreen.id === 'screen-phase3') {
        const s1 = document.getElementById('picking-step-1');
        const s2 = document.getElementById('picking-step-2');
        if (s1 && s1.style.display !== 'none') {
            const info = document.getElementById('pickup-info');
            if (info) info.style.display = 'block';
            const task = dailyTasks[currentTaskIndex];
            const nameEl = document.getElementById('pickup-product-name');
            if (nameEl && task) nameEl.innerText = task.item;
        }
        if (s2 && s2.style.display !== 'none') {
            const finishBtn = document.getElementById('btn-finish-reposicao');
            if (finishBtn) finishBtn.style.display = 'block';
        }
    }
}

function runStockQuery() {
    const query = document.getElementById('query-lote-input').value.toLowerCase();
    const resultsDiv = document.getElementById('query-results');
    const products = getProducts();
    
    const found = products.filter(p => 
        p.sku.toLowerCase().includes(query) || 
        p.productName.toLowerCase().includes(query) || 
        p.lot.toLowerCase().includes(query) ||
        p.productId.toLowerCase() === query
    );

    if (found.length > 0) {
        resultsDiv.innerHTML = found.map(p => `
            <div class="glass-card" style="border-left: 4px solid var(--primary); padding: 12px; margin-bottom: 10px;">
                <div style="font-size: 14px; font-weight: 700; color: #fff;">${p.productName}</div>
                <div style="font-size: 11px; color: var(--text-muted);">LOTE: ${p.lot} | ID: ${p.productId}</div>
                <div style="margin-top: 8px; font-size: 13px; color: var(--secondary); font-weight: 700;">📍 LOCAL: ${p.address}</div>
            </div>
        `).join('');
    } else {
        resultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum item localizado.</div>`;
    }
}

function runConferenceScan(data) {
    const product = findProductBySKU(data);
    const resultsDiv = document.getElementById('conf-results');
    
    if (product) {
        resultsDiv.innerHTML = `
            <div class="glass-card" style="border: 2px solid #e11d48; padding: 15px; background: rgba(225, 29, 72, 0.05);">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 11px; color: #e11d48; font-weight: 900;">FICHA TÉCNICA MASTER</div>
                    <div style="font-size: 20px; font-weight: 900; color: #fff;">${product.productName}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                        <div style="font-size: 10px; color: var(--text-muted);">ID PALLET</div>
                        <div style="font-size: 14px; font-weight: 700;">#${product.productId}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                        <div style="font-size: 10px; color: var(--text-muted);">LOTE</div>
                        <div style="font-size: 14px; font-weight: 700;">${product.lot}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                        <div style="font-size: 10px; color: var(--text-muted);">VALIDADE</div>
                        <div style="font-size: 14px; font-weight: 700;">${product.validity}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
                        <div style="font-size: 10px; color: var(--text-muted);">CATEGORIA</div>
                        <div style="font-size: 14px; font-weight: 700;">LOGÍSTICA</div>
                    </div>
                </div>

                <div style="margin-top: 15px; padding: 12px; background: rgba(225, 29, 72, 0.1); border-radius: 10px; text-align: center;">
                    <div style="font-size: 10px; color: #e11d48; font-weight: 900;">ENDEREÇO REGISTRADO</div>
                    <div style="font-size: 18px; font-weight: 900; color: #fff;">${product.address}</div>
                </div>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #e11d48; font-weight: 700;">⚠️ ETIQUETA NÃO RECONHECIDA</div>`;
    }
}

function finishForkliftTask() {
    const qtyInput = document.getElementById('forklift-qty-input');
    const qty = qtyInput ? qtyInput.value : "1";
    alert(`✅ ARMAZENAGEM CONCLUÍDA!\n${qty} caixas de ${currentEntry.productName} foram guardadas no endereço ${currentEntry.address}.`);
    document.getElementById('forklift-product-info').style.display = 'none';
    document.getElementById('forklift-controls').style.display = 'none';
    showScreen('screen-home');
}

// -------------------------------------------------------
// QUANTITY SELECTORS
// -------------------------------------------------------

// --- FORKLIFT (Armazenamento) ---
let storageType = null;
function selectStorageType(type) {
    storageType = type;
    const palBtn = document.getElementById('btn-type-pallet');
    const boxBtn = document.getElementById('btn-type-boxes');
    const boxQty = document.getElementById('forklift-box-qty');
    const palInfo = document.getElementById('forklift-pallet-info');
    if (type === 'pallet') {
        palBtn.style.background = 'rgba(245,158,11,0.4)';
        boxBtn.style.background = 'rgba(59,130,246,0.1)';
        boxQty.style.display = 'none';
        palInfo.style.display = 'block';
    } else {
        boxBtn.style.background = 'rgba(59,130,246,0.35)';
        palBtn.style.background = 'rgba(245,158,11,0.1)';
        boxQty.style.display = 'block';
        palInfo.style.display = 'none';
    }
    document.getElementById('btn-finish-forklift').style.display = 'block';
}
function changeForkliftQty(delta) {
    const input = document.getElementById('forklift-qty-input');
    let val = Math.max(1, Math.min(400, parseInt(input.value) + delta));
    input.value = val;
}

// --- PICKING (Reposição) ---
let pickupType = null;
function selectPickupType(type) {
    pickupType = type;
    const ids = ['btn-p-1cx','btn-p-mcx','btn-p-frac'];
    ids.forEach(id => document.getElementById(id).style.opacity = '0.6');
    const map = { '1cx': 'btn-p-1cx', 'mcx': 'btn-p-mcx', 'frac': 'btn-p-frac' };
    document.getElementById(map[type]).style.opacity = '1';
    document.getElementById('pickup-multi-qty').style.display = type === 'mcx' ? 'block' : 'none';
    document.getElementById('pickup-frac-qty').style.display = type === 'frac' ? 'block' : 'none';
}
function changePickupQty(delta) {
    const input = document.getElementById('pickup-qty-input');
    input.value = Math.max(2, parseInt(input.value) + delta);
}

// --- CONFERÊNCIA (Phase 1) ---
let conferenciaType = null;
function selectConferenciaType(type) {
    conferenciaType = type;
    const cxBtn  = document.getElementById('btn-conf-cx');
    const fracBtn = document.getElementById('btn-conf-frac');
    const fracQty = document.getElementById('conf-frac-qty');
    const sel    = document.getElementById('conf-selected');

    // Highlight selected button
    cxBtn.style.opacity  = type === 'caixa'  ? '1' : '0.5';
    fracBtn.style.opacity = type === 'fracao' ? '1' : '0.5';

    // Show/hide fraction unit input
    fracQty.style.display = type === 'fracao' ? 'block' : 'none';

    // Show confirmation badge
    sel.style.display = 'block';
    if (type === 'caixa') {
        sel.style.background = 'rgba(59,130,246,0.15)';
        sel.style.color = '#3b82f6';
        sel.innerText = '✅ CONFERÊNCIA: CAIXA FECHADA';
    } else {
        sel.style.background = 'rgba(245,158,11,0.15)';
        sel.style.color = '#f59e0b';
        sel.innerText = '✅ FRAÇÃO — informe a quantidade de unidades acima';
    }
}
function changeConfFracQty(delta) {
    const input = document.getElementById('conf-frac-input');
    input.value = Math.max(1, parseInt(input.value || 1) + delta);
}

// -------------------------------------------------------
// SCREEN NAVIGATION & HISTORY
// -------------------------------------------------------
let screenHistory = [];

function showScreen(screenId, saveHistory = true) {
    const screens = document.querySelectorAll('.screen');
    const currentActive = document.querySelector('.screen.active');
    
    // Save history if it's a new screen
    if (saveHistory && currentActive && currentActive.id !== screenId) {
        screenHistory.push(currentActive.id);
    }

    screens.forEach(screen => screen.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        
        // Logic for specific screens
        if (screenId === 'screen-phase1') {
            document.getElementById('lote-val-input').value = "";
            document.getElementById('sku-check').classList.remove('checked');
            document.getElementById('product-scan-result').style.display = 'none';
            const nextBtn = document.getElementById('btn-phase1-next');
            if (nextBtn) {
                nextBtn.style.opacity = '0.5';
                nextBtn.style.pointerEvents = 'none';
            }
        }

        if (screenId === 'screen-home') {
            updateDashboard();
            screenHistory = []; // Reset history when back to home
        }

        if (screenId === 'screen-login') {
            document.getElementById('login-id').value = "";
            document.getElementById('login-pass').value = "";
        }

        if (screenId === 'screen-phase2') {
            renderLabel();
        }
        
        if (screenId === 'screen-forklift') resetForkliftUI();
        if (screenId === 'screen-phase3') {
            resetReposicaoUI();
            updateReposicaoUI();
        }
    }

    // Nav Bar visibility
    const navEl = document.getElementById('main-nav');
    if (navEl) {
        const noNavScreens = ['screen-welcome', 'screen-login', 'screen-user-register', 'screen-forgot-password'];
        navEl.style.display = noNavScreens.includes(screenId) ? 'none' : 'flex';
    }
}

function handleNavigationBack() {
    if (screenHistory.length > 0) {
        const lastScreen = screenHistory.pop();
        showScreen(lastScreen, false);
    } else {
        showScreen('screen-home');
    }
}

function toggleCheck(el) {
    const box = el.querySelector('.check-box');
    box.classList.toggle('checked');
}

// -------------------------------------------------------
// REPOSIÇÃO SYSTEM
// -------------------------------------------------------
let currentTaskIndex = 0;
const dailyTasks = [
    { item: 'Amoxicilina 500mg', end: 'PG15', col: 'C03', niv: 'N02', qtd: '10 UN', dest: 'LINHA 01' },
    { item: 'Dipirona 500mg', end: 'PG12', col: 'C01', niv: 'N04', qtd: '05 UN', dest: 'LINHA 03' },
    { item: 'Paracetamol 750mg', end: 'PG18', col: 'C05', niv: 'N01', qtd: '12 UN', dest: 'LINHA 01' },
    { item: 'Ibuprofeno 600mg', end: 'PG20', col: 'C02', niv: 'N03', qtd: '08 UN', dest: 'LINHA 02' },
    { item: 'Omeprazol 20mg', end: 'PG15', col: 'C04', niv: 'N02', qtd: '20 UN', dest: 'LINHA 04' }
];

function checkDailyReset() {
    const today = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem('ts_last_date');
    if (lastDate !== today) {
        localStorage.setItem('ts_last_date', today);
        localStorage.setItem('ts_current_task', '0');
        currentTaskIndex = 0;
    } else {
        currentTaskIndex = parseInt(localStorage.getItem('ts_current_task') || '0');
    }
}

function updateReposicaoUI() {
    checkDailyReset();
    const container = document.getElementById('reposicao-order-details');
    const title = document.getElementById('reposicao-task-title');
    
    if (currentTaskIndex >= dailyTasks.length) {
        title.innerText = "TODAS AS TAREFAS CONCLUÍDAS";
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--secondary);">Parabéns! Você finalizou todas as reposições de hoje.</div>`;
        document.querySelector('#picking-order-card .btn-primary').style.display = 'none';
        return;
    }

    const task = dailyTasks[currentTaskIndex];
    title.innerText = `Tarefa ${currentTaskIndex + 1} de ${dailyTasks.length}`;
    
    container.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 5px;">Item: ${task.item}</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; font-size: 11px; text-align: center;">
            <div style="background: rgba(59, 130, 246, 0.1); padding: 5px; border-radius: 5px;">
                <div style="color: var(--primary);">ENDEREÇO</div>
                <div style="font-weight: 700;">${task.end}</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); padding: 5px; border-radius: 5px;">
                <div style="color: var(--primary);">COLUNA</div>
                <div style="font-weight: 700;">${task.col}</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); padding: 5px; border-radius: 5px;">
                <div style="color: var(--primary);">NÍVEL</div>
                <div style="font-weight: 700;">${task.niv}</div>
            </div>
        </div>
    `;
}

function startPickingFlow() {
    document.getElementById('picking-order-card').style.display = 'none';
    document.getElementById('picking-step-1').style.display = 'block';
    const task = dailyTasks[currentTaskIndex];
    document.getElementById('picking-step-1').querySelector('.font-size-18') &&
        (document.getElementById('picking-step-1').querySelector('[style*="font-size: 18px"]').innerText = `Bipe o QR Master no Pulmão ${task.end}`);
    document.getElementById('pickup-info').querySelector('[style*="font-size: 32px"]') &&
        (document.getElementById('pickup-info').querySelector('[style*="font-size: 32px"]').innerText = task.qtd);
}

function startTransportFlow() {
    document.getElementById('picking-step-1').style.display = 'none';
    document.getElementById('picking-step-2').style.display = 'block';
    const task = dailyTasks[currentTaskIndex];
    const destEl = document.getElementById('picking-step-2').querySelector('[style*="font-size: 24px"]');
    if (destEl) destEl.innerText = task.dest;

    // Build pickup summary
    let qtyLabel = '1 CAIXA';
    if (pickupType === 'mcx') {
        const n = document.getElementById('pickup-qty-input').value;
        qtyLabel = `${n} CAIXAS`;
    } else if (pickupType === 'frac') {
        const n = document.getElementById('pickup-frac-input').value || '?';
        qtyLabel = `${n} unidade(s) — FRAÇÃO`;
    }
    // Show summary tag in step 2
    const tag = document.getElementById('picking-step-2').querySelector('[style*="font-size: 14px"]');
    if (tag) tag.innerText = `Coletado: ${qtyLabel} | Bipe o QR do Endereço da Linha`;
}

function completeReposicao() {
    currentTaskIndex++;
    localStorage.setItem('ts_current_task', currentTaskIndex.toString());
    alert('Tarefa Finalizada!');
    resetReposicaoUI();
    updateReposicaoUI();
}

function resetReposicaoUI() {
    const card = document.getElementById('picking-order-card');
    const s1 = document.getElementById('picking-step-1');
    const s2 = document.getElementById('picking-step-2');
    const info = document.getElementById('pickup-info');
    const btn = document.getElementById('btn-finish-reposicao');
    if (card) card.style.display = 'block';
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'none';
    if (info) info.style.display = 'none';
    if (btn) btn.style.display = 'none';
    const btnPrimary = document.querySelector('#picking-order-card .btn-primary');
    if (btnPrimary) btnPrimary.style.display = 'block';
}

// Tap scanner to simulate scan
document.querySelectorAll('.scanner-view').forEach(scanner => {
    scanner.addEventListener('click', () => {
        if (!html5QrCode) {
            scanner.style.border = '2px solid var(--secondary)';
            setTimeout(() => {
                handleSuccessfulScan("7891000200030");
                scanner.style.border = 'none';
            }, 800);
        }
    });
});

// -------------------------------------------------------
// AUTH
// -------------------------------------------------------
async function handleLogin() {
    const matricula = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    
    if (!matricula || !pass) {
        alert('⚠️ Por favor, preencha todos os campos.');
        return;
    }

    // 1. TENTA LOGIN LOCAL IMEDIATO (Instantâneo)
    const localUsers = JSON.parse(localStorage.getItem('ts_users') || '[]');
    const hardcodedUser = DEFAULT_USERS.find(u => String(u.id) === String(matricula) && String(u.pass) === String(pass));
    const registeredUser = localUsers.find(u => String(u.id).toLowerCase() === String(matricula).toLowerCase() && String(u.pass) === String(pass));
    
    const user = hardcodedUser || registeredUser;
    
    if (user) {
        loginUser(user);
        // Sincroniza em segundo plano para não travar o operador
        setTimeout(() => syncUsersWithCloud(), 1000);
        return;
    }

    // 2. SE NÃO ACHOU LOCAL, tenta sincronizar uma vez (Primeiro acesso em novo aparelho)
    const loginBtn = document.querySelector('#screen-login .btn-primary');
    const originalText = loginBtn.innerText;
    loginBtn.innerText = "🔍 VALIDANDO...";
    loginBtn.disabled = true;

    try {
        // Tenta buscar da nuvem com timeout de 3 segundos para não ficar preso
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await syncUsersWithCloud();
        clearTimeout(timeoutId);

        const updatedUsers = JSON.parse(localStorage.getItem('ts_users') || '[]');
        const newUser = updatedUsers.find(u => String(u.id).toLowerCase() === String(matricula).toLowerCase() && String(u.pass) === String(pass));
        
        if (newUser) {
            loginUser(newUser);
        } else {
            alert('❌ ERRO: Matrícula ou senha incorretos.');
        }
    } catch (e) {
        alert('❌ ERRO DE CONEXÃO: Não foi possível validar seu primeiro acesso. Verifique sua internet.');
    } finally {
        loginBtn.innerText = originalText;
        loginBtn.disabled = false;
    }
}

function handleTestLogin() {
    const testUser = DEFAULT_USERS[0];
    loginUser(testUser);
}

function loginUser(user) {
    sessionStorage.setItem('ts_session', JSON.stringify({ id: user.id, name: user.name }));
    currentUser = { name: user.name, id: user.id };
    
    // 1. Atualiza o nome na faixa de boas-vindas do Dashboard
    const bannerNameEl = document.getElementById('user-welcome-name');
    if (bannerNameEl) bannerNameEl.innerText = user.name.toUpperCase();
    
    // 2. Atualiza outros elementos de boas-vindas (se houver)
    const welcomeEl = document.getElementById('user-welcome');
    if (welcomeEl) welcomeEl.innerText = `BEM-VINDO, ${user.name.toUpperCase()}`;
    
    // 3. Mostra a barra de navegação
    const navEl = document.getElementById('main-nav');
    if (navEl) navEl.style.display = 'flex';
    
    showScreen('screen-home');
    
    // 4. Limpa os campos de login
    const idInput = document.getElementById('login-id');
    const passInput = document.getElementById('login-pass');
    if (idInput) idInput.value = "";
    if (passInput) passInput.value = "";
}

async function handleUserRegistration() {
    const regBtn = document.querySelector('#screen-user-register .btn-primary');
    const originalText = regBtn.innerText;

    try {
        const name = document.getElementById('reg-user-name').value.trim();
        const matricula = document.getElementById('reg-user-id').value.trim();
        const pass = document.getElementById('reg-user-pass').value.trim();
        const company = document.getElementById('reg-user-company').value.trim();

        if (!name || !matricula || !pass || !company) {
            alert('⚠️ Preencha todos os campos para o cadastro.');
            return;
        }

        regBtn.innerText = "⏳ SALVANDO...";
        regBtn.disabled = true;

        // 1. Tenta puxar usuários atuais (se falhar, segue com o que tem)
        try { await syncUsersWithCloud(); } catch(e) { console.warn("Modo Offline"); }
        
        let users = JSON.parse(localStorage.getItem('ts_users') || '[]');
        
        // 2. Verifica duplicado
        if (users.find(u => String(u.id) === String(matricula))) {
            alert('⚠️ Esta matrícula já existe!');
            return;
        }

        // 3. Salva Local (Garantia que funciona no seu celular na hora)
        const newUser = { name, id: matricula, pass, company };
        users.push(newUser);
        localStorage.setItem('ts_users', JSON.stringify(users));
        
        // 4. Tenta enviar para a Nuvem
        try {
            const cloudRes = await fetch(CLOUD_DB_URL, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Bin-Meta': 'false'
                    // Se você tiver a Master Key, coloque aqui: 'X-Master-Key': '$2b$10...'
                },
                body: JSON.stringify(users)
            });

            if (cloudRes.ok) {
                alert('✅ SUCESSO TOTAL: Cadastrado e Sincronizado na Nuvem!');
            } else {
                console.error("Erro Nuvem Status:", cloudRes.status);
                alert('✅ SALVO LOCALMENTE: O funcionário foi cadastrado no seu celular, mas a nuvem recusou o acesso (Erro 401).');
            }
        } catch (cloudErr) {
            alert('✅ SALVO LOCALMENTE: Funcionário salvo no celular. Sincronização falhou (Sem Internet).');
        }

        // Limpar e voltar
        document.getElementById('reg-user-name').value = "";
        document.getElementById('reg-user-id').value = "";
        document.getElementById('reg-user-pass').value = "";
        document.getElementById('reg-user-company').value = "";
        
        showScreen('screen-login');
    } catch (error) {
        alert('❌ ERRO CRÍTICO: ' + error.message);
    } finally {
        regBtn.innerText = originalText;
        regBtn.disabled = false;
    }
}

async function syncUsersWithCloud() {
    try {
        const res = await fetch(CLOUD_DB_URL, { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' } 
        });
        
        if (res.ok) {
            const cloudUsers = await res.json();
            const localUsers = JSON.parse(localStorage.getItem('ts_users') || '[]');
            
            // Merge inteligente (quem tem matrícula ganha)
            const userMap = new Map();
            localUsers.forEach(u => { if(u && u.id) userMap.set(String(u.id), u); });
            cloudUsers.forEach(u => { if(u && u.id) userMap.set(String(u.id), u); });
            
            const mergedUsers = Array.from(userMap.values());
            localStorage.setItem('ts_users', JSON.stringify(mergedUsers));
            console.log("Sincronização com a nuvem OK. Total de usuários:", mergedUsers.length);
        }
    } catch (e) {
        console.error("Falha ao sincronizar com a nuvem:", e);
    }
}

function forceAppUpdate() {
    if (confirm("Isso irá limpar o cache e atualizar o sistema para a versão mais recente. Continuar?")) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
                localStorage.clear(); // Limpa tudo para garantir
                location.reload(true);
            });
        } else {
            location.reload(true);
        }
    }
}

async function handleResetPassword() {
    const resetBtn = document.querySelector('#screen-forgot-password .btn-primary');
    const originalText = resetBtn.innerText;

    const id = document.getElementById('reset-id').value.trim();
    const name = document.getElementById('reset-name').value.trim();
    const company = document.getElementById('reset-company').value.trim();
    const newPass = document.getElementById('reset-new-pass').value.trim();

    if (!id || !name || !company || !newPass) {
        alert('⚠️ Por favor, preencha todos os campos para redefinir sua senha.');
        return;
    }

    if (newPass.length < 6) {
        alert('A nova senha deve ter ao menos 6 caracteres.');
        return;
    }

    try {
        resetBtn.innerText = "⏳ VALIDANDO DADOS...";
        resetBtn.disabled = true;

        await syncUsersWithCloud();
        const users = JSON.parse(localStorage.getItem('ts_users') || '[]');
        
        const userIndex = users.findIndex(u => 
            String(u.id) === String(id) && 
            u.name.toLowerCase() === name.toLowerCase() && 
            (u.company || "").toLowerCase() === company.toLowerCase()
        );

        if (userIndex !== -1) {
            users[userIndex].pass = newPass;
            
            // Save Cloud
            const cloudRes = await fetch(CLOUD_DB_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(users)
            });

            if (!cloudRes.ok) throw new Error("Falha ao salvar nova senha no servidor central.");

            localStorage.setItem('ts_users', JSON.stringify(users));
            alert('✅ SUCESSO: Senha redefinida em todos os seus dispositivos!');
            showScreen('screen-login');
            
            // Limpar campos
            document.getElementById('reset-id').value = "";
            document.getElementById('reset-name').value = "";
            document.getElementById('reset-company').value = "";
            document.getElementById('reset-new-pass').value = "";
        } else {
            alert('❌ DADOS INCORRETOS: Verifique matrícula, nome e empresa exatamente como cadastrados.');
        }
    } catch (err) {
        console.error("Erro no reset:", err);
        alert('❌ ERRO: ' + err.message);
    } finally {
        resetBtn.innerText = originalText;
        resetBtn.disabled = false;
    }
}

// -------------------------------------------------------
// PRODUCT REGISTRATION
// -------------------------------------------------------
function handleRegistration() {
    const sku      = document.getElementById('reg-sku').value.trim();
    const name     = document.getElementById('reg-name').value.trim();
    const lot      = document.getElementById('reg-lot').value.trim();
    const validity = document.getElementById('reg-validity').value.trim();
    const content  = document.getElementById('reg-content').value.trim();
    const address  = document.getElementById('reg-address').value.trim();

    if (!sku || !name) {
        alert('Preencha ao menos o Código e o Nome do produto.');
        return;
    }

    const products = getProducts();
    const existing = products.find(p => p.sku === sku);
    if (existing) {
        alert(`Produto com SKU ${sku} já está cadastrado!`);
        return;
    }

    const newProduct = {
        sku,
        productId: getNextProductId(),
        productName: name,
        lot: lot || '---',
        validity: validity || '---',
        content: content || '---',
        address: address || '---'
    };

    products.push(newProduct);
    saveProducts(products);

    alert(`✅ Produto "${name}" cadastrado com ID #${newProduct.productId}!`);
    showScreen('screen-home');

    // Clear form
    ['reg-sku','reg-name','reg-desc','reg-lot','reg-validity','reg-content','reg-address']
        .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
}

function saveStorageRecord(entry, qty, type) {
    const records = JSON.parse(localStorage.getItem('ts_storage_records') || '[]');
    records.push({
        lot:          entry.lot,
        sku:          entry.sku,
        productName:  entry.productName,
        address:      entry.address,
        qty:          type === 'pallet' ? `1 PALETE (~${qty} cx)` : `${qty} caixa(s)`,
        operatorName: currentUser.name,
        operatorId:   currentUser.id,
        dateTime:     new Date().toLocaleString('pt-BR'),
        timestamp:    Date.now()
    });
    localStorage.setItem('ts_storage_records', JSON.stringify(records));
}

function runStockQuery() {
    const query = (document.getElementById('stock-query-input').value || '').trim().toLowerCase();
    if (!query) { alert('Digite um lote, nome ou código para consultar.'); return; }

    const records = JSON.parse(localStorage.getItem('ts_storage_records') || '[]');
    const results = records
        .filter(r =>
            (r.lot || '').toLowerCase().includes(query) ||
            (r.productName || '').toLowerCase().includes(query) ||
            (r.sku || '').toLowerCase().includes(query))
        .sort((a, b) => b.timestamp - a.timestamp);

    const container = document.getElementById('stock-query-results');

    if (results.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align:center; color:var(--text-muted);">
                <div style="font-size:40px; margin-bottom:10px;">🔎</div>
                <div>Nenhum registro encontrado para <strong>"${query}"</strong></div>
                <div style="font-size:12px; margin-top:8px;">Verifique se o produto já foi armazenado.</div>
            </div>`;
        return;
    }

    container.innerHTML = results.map(r => `
        <div class="glass-card" style="border-left:4px solid #06b6d4;">
            <div style="font-size:11px;color:#06b6d4;font-weight:600;margin-bottom:8px;">📦 PRODUTO LOCALIZADO</div>
            <div style="font-size:16px;font-weight:700;margin-bottom:12px;">${r.productName}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
                <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:3px;">LOTE</div>
                    <div style="font-weight:700;font-family:monospace;font-size:11px;">${r.lot}</div>
                </div>
                <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:3px;">QUANTIDADE</div>
                    <div style="font-weight:700;">${r.qty}</div>
                </div>
                <div style="background:rgba(6,182,212,0.12);padding:10px;border-radius:8px;grid-column:1/-1;">
                    <div style="color:#06b6d4;margin-bottom:4px;font-size:11px;font-weight:600;">📍 ENDEREÇO DE ARMAZENAGEM</div>
                    <div style="font-weight:700;font-size:15px;">${r.address}</div>
                </div>
                <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:3px;">OPERADOR</div>
                    <div style="font-weight:700;">${r.operatorName}</div>
                    <div style="color:var(--text-muted);font-size:10px;">Mat: ${r.operatorId}</div>
                </div>
                <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:3px;">DATA / HORA</div>
                    <div style="font-weight:700;font-size:11px;">${r.dateTime}</div>
                </div>
            </div>
        </div>`).join('');
}

// -------------------------------------------------------
// FORKLIFT
// -------------------------------------------------------
function finishForkliftTask() {
    const qty = storageType === 'pallet' ? 50
        : parseInt(document.getElementById('forklift-qty-input').value) || 1;
    const qtyInfo = storageType === 'pallet' ? 'PALETE FAIXADO' : `${qty} CAIXAS`;
    // Save detailed storage record
    saveStorageRecord(currentEntry, qty, storageType);
    // Update PG count and reduce pending load
    addItemToPG(currentEntry.address, qty);
    decrementPendingLoad();
    alert(`✅ Armazenagem confirmada!\nProduto: ${currentEntry.productName}\nQuantidade: ${qtyInfo}\nEndereço: ${currentEntry.address}`);
    showScreen('screen-home');
}

function resetForkliftUI() {
    const res = document.getElementById('forklift-result');
    const status = document.getElementById('address-validation-status');
    const btn = document.getElementById('btn-finish-forklift');
    const qty = document.getElementById('forklift-qty-selector');
    const boxQty = document.getElementById('forklift-box-qty');
    const palInfo = document.getElementById('forklift-pallet-info');
    if (res) res.style.display = 'none';
    if (status) status.style.display = 'none';
    if (btn) btn.style.display = 'none';
    if (qty) qty.style.display = 'none';
    if (boxQty) boxQty.style.display = 'none';
    if (palInfo) palInfo.style.display = 'none';
    storageType = null;
}

// -------------------------------------------------------
// DASHBOARD - Real-time tracking
// -------------------------------------------------------
function getDashboardStats() {
    const today = new Date().toLocaleDateString('pt-BR');
    const lastDate = localStorage.getItem('ts_dashboard_date');

    if (lastDate !== today) {
        // New day: carry over any unfinished pending loads as backlog
        const pending = parseInt(localStorage.getItem('ts_pending_loads') || '0');
        const backlog = parseInt(localStorage.getItem('ts_backlog_loads') || '0');
        if (pending > 0) {
            localStorage.setItem('ts_backlog_loads', String(backlog + pending));
            localStorage.setItem('ts_pending_loads', '0');
        }
        localStorage.setItem('ts_dashboard_date', today);
    }

    return {
        pending: parseInt(localStorage.getItem('ts_pending_loads') || '0'),
        backlog: parseInt(localStorage.getItem('ts_backlog_loads') || '0'),
        pgCounts: JSON.parse(localStorage.getItem('ts_pg_counts') || '{}')
    };
}

function incrementPendingLoad() {
    const n = parseInt(localStorage.getItem('ts_pending_loads') || '0') + 1;
    localStorage.setItem('ts_pending_loads', String(n));
}

function decrementPendingLoad() {
    const n = Math.max(0, parseInt(localStorage.getItem('ts_pending_loads') || '0') - 1);
    localStorage.setItem('ts_pending_loads', String(n));
}

function addItemToPG(addressStr, qty) {
    qty = parseInt(qty) || 1;
    const counts = JSON.parse(localStorage.getItem('ts_pg_counts') || '{}');
    // Extract "PG##" from address string like "PULMÃO PG15 - Col.3 / Nív.2"
    const match = (addressStr || '').match(/PG(\d+)/i);
    const pgKey = match ? `PG${parseInt(match[1])}` : (addressStr || 'SEM PG');
    counts[pgKey] = (counts[pgKey] || 0) + qty;
    localStorage.setItem('ts_pg_counts', JSON.stringify(counts));
}

function updateDashboard() {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;

    const stats = getDashboardStats();
    const pgEntries = Object.entries(stats.pgCounts)
        .sort((a, b) => {
            const na = parseInt(a[0].replace(/\D/g, '')) || 0;
            const nb = parseInt(b[0].replace(/\D/g, '')) || 0;
            return na - nb;
        });

    const pgHtml = pgEntries.length === 0
        ? `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px 0;">Nenhum item armazenado ainda</div>`
        : pgEntries.map(([pg, qty]) => `
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span>📦 Itens em ${pg}</span>
                <span style="color:var(--secondary);font-weight:700;">${qty}</span>
            </div>`).join('');

    const pendingColor = stats.pending > 0 ? 'var(--accent)' : 'var(--secondary)';
    const pendingIcon  = stats.pending > 0 ? '⏳' : '✅';

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span>${pendingIcon} Cargas pendentes hoje</span>
            <span style="color:${pendingColor};font-weight:700;">${stats.pending}</span>
        </div>
        ${stats.backlog > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span>⚠️ Em atraso (dia anterior)</span>
            <span style="color:#ef4444;font-weight:700;">${stats.backlog}</span>
        </div>` : ''}
        <div style="border-top:1px solid var(--glass-border);margin:8px 0;"></div>
        ${pgHtml}
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;text-align:right;">
            Atualizado: ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}
        </div>
    `;
}

// Auto-refresh dashboard every 30 seconds when on home screen
setInterval(() => {
    if (document.getElementById('screen-home') &&
        document.getElementById('screen-home').classList.contains('active')) {
        updateDashboard();
    }
}, 30000);

// -------------------------------------------------------
// INIT
// -------------------------------------------------------
initSampleProducts();

// On startup: Ensure we start at welcome screen (no auto-login)
(function checkSession() {
    // We just clear any old session to force fresh login as requested
    sessionStorage.removeItem('ts_session');
    currentUser = { name: 'Operador', id: '000' };
    document.getElementById('main-nav').style.display = 'none';
    showScreen('screen-welcome');
})();

// Clear session when app/tab is closed
window.addEventListener('pagehide', () => sessionStorage.removeItem('ts_session'));

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------
function logout() {
    sessionStorage.removeItem('ts_session');
    currentUser = { name: 'Operador', id: '000' };
    
    const navEl = document.getElementById('main-nav');
    if (navEl) navEl.style.display = 'none';
    
    const welcomeEl = document.getElementById('user-welcome');
    if (welcomeEl) welcomeEl.innerText = 'BEM-VINDO, OPERADOR';
    
    showScreen('screen-welcome');
}

// -------------------------------------------------------
// ZEBRA SCANNER - Keyboard Wedge Support
// Zebra scanners work as keyboard: type barcode + press Enter
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // Phase 1: allow manual typing + Enter to scan
    const loteInput = document.getElementById('lote-val-input');
    if (loteInput) {
        loteInput.removeAttribute('readonly');
        loteInput.placeholder = 'Bipe o produto ou digite o c\u00f3digo...';
        loteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = loteInput.value.trim();
                if (val) handleSuccessfulScan(val);
            }
        });
    }

    // Registration: Enter on SKU field triggers scan
    const regSku = document.getElementById('reg-sku');
    if (regSku) {
        regSku.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSuccessfulScan(regSku.value.trim()); }
        });
    }

    // Stock query: Enter key triggers search
    const stockInput = document.getElementById('stock-query-input');
    if (stockInput) {
        stockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); runStockQuery(); }
        });
    }

    // Login: Enter on password field submits login
    const loginPass = document.getElementById('login-pass');
    if (loginPass) {
        loginPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
    }

    // Cadastro colaborador: Enter on password submits
    const regPass = document.getElementById('reg-user-pass');
    if (regPass) {
        regPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleUserRegistration(); }
        });
    }
});
