let html5QrCode = null;
let currentUser = { name: 'Operador', id: '000' }; // Tracks the logged-in user

// Global Cloud Configuration (GitHub Pages Edition - Final Fix)
const CLOUD_DB_URL = 'https://api.jsonbin.io/v3/b/662e864ead19ca34f861179e?meta=false';
const SYSTEM_VERSION = '1.7.1-GitHub';

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
    return getProducts().find(p => p.sku === sku) || null;
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
            <div class="label-divider"></div>
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
                        <div class="label-field-name">CONTEÚDO DA CAIXA:</div>
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
            text: currentEntry.sku !== '---' ? currentEntry.sku : currentEntry.productId,
            width: 65,
            height: 65,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
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

// -------------------------------------------------------
// SCAN HANDLER
// -------------------------------------------------------
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

        // Look up product in database
        const product = findProductBySKU(data);

        if (product) {
            currentEntry = { ...product };
            skuDisplay.innerText = `CÓDIGO: ${data} | ${product.productName}`;
            loteInput.value = `${product.lot} / VAL: ${product.validity}`;
        } else {
            // Unknown product — store raw data and warn
            currentEntry = {
                productId: getNextProductId(),
                productName: 'Produto Não Cadastrado',
                sku: data,
                lot: '---',
                validity: '---',
                content: '---',
                address: '---'
            };
            skuDisplay.innerText = `CÓDIGO: ${data} — Cadastre este produto!`;
            loteInput.value = 'Produto não encontrado no sistema';
        }
        
        skuCheck.classList.add('checked');
        productResult.style.display = 'block';
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        // Count this as a pending load
        incrementPendingLoad();
    }

    if (activeScreen.id === 'screen-forklift') {
        const statusDiv = document.getElementById('address-validation-status');
        const finishBtn = document.getElementById('btn-finish-forklift');
        const forkliftResult = document.getElementById('forklift-result');
        const qtySelector = document.getElementById('forklift-qty-selector');

        if (forkliftResult.style.display === 'none' || forkliftResult.style.display === '') {
            // First scan: product identified — show info and quantity selector
            forkliftResult.style.display = 'block';
            qtySelector.style.display = 'block';
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
            // Second scan: address validation
            if (data === "PG15" || data === "SIMULATED_DATA" || data === "LT9876-PHARMA") {
                statusDiv.style.display = 'block';
                statusDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                statusDiv.style.color = '#10b981';
                statusDiv.style.border = '1px solid #10b981';
                statusDiv.innerText = "✅ ENDEREÇO CORRETO: PG15 VALIDADO!";
                finishBtn.style.display = 'block';
            } else {
                statusDiv.style.display = 'block';
                statusDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                statusDiv.style.color = '#ef4444';
                statusDiv.style.border = '1px solid #ef4444';
                statusDiv.innerText = `❌ ERRO: ENDEREÇO ${data} INCORRETO!`;
                finishBtn.style.display = 'none';
            }
        }
    }

    if (activeScreen.id === 'screen-phase3') {
        const s1 = document.getElementById('picking-step-1');
        const s2 = document.getElementById('picking-step-2');
        if (s1 && s1.style.display !== 'none') {
            const info = document.getElementById('pickup-info');
            info.style.display = 'block';
            const task = dailyTasks[currentTaskIndex];
            const nameEl = document.getElementById('pickup-product-name');
            if (nameEl && task) nameEl.innerText = task.item;
        }
        if (s2 && s2.style.display !== 'none') document.getElementById('btn-finish-reposicao').style.display = 'block';
    }
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
// SCREEN NAVIGATION
// -------------------------------------------------------
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        
        if (screenId === 'screen-phase1') {
            document.getElementById('lote-val-input').value = "";
            document.getElementById('sku-check').classList.remove('checked');
            document.getElementById('product-scan-result').style.display = 'none';
            const nextBtn = document.getElementById('btn-phase1-next');
            nextBtn.style.opacity = '0.5';
            nextBtn.style.pointerEvents = 'none';
        }

        // Update dashboard when entering home screen
        if (screenId === 'screen-home') {
            updateDashboard();
        }

        // Clear login fields when entering login screen
        if (screenId === 'screen-login') {
            document.getElementById('login-id').value = "";
            document.getElementById('login-pass').value = "";
        }

        // Render dynamic label when entering phase 2
        if (screenId === 'screen-phase2') {
            renderLabel();
        }
    }

    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    if (screenId === 'screen-home') navBtns[0].classList.add('active');
    if (screenId === 'screen-phase1' || screenId === 'screen-phase2') navBtns[1].classList.add('active');
    if (screenId === 'screen-forklift') {
        navBtns[1].classList.add('active');
        resetForkliftUI();
    }
    if (screenId === 'screen-phase3') {
        navBtns[2].classList.add('active');
        resetReposicaoUI();
        updateReposicaoUI();
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

    // Try hardcoded users first
    const defaultUser = DEFAULT_USERS.find(u => String(u.id) === String(matricula) && String(u.pass) === String(pass));
    if (defaultUser) {
        loginUser(defaultUser);
        return;
    }

    // Visual feedback for sync
    const loginBtn = document.querySelector('#screen-login .btn-primary');
    const originalText = loginBtn.innerText;
    loginBtn.innerText = "🔍 AUTENTICANDO...";
    loginBtn.disabled = true;

    try {
        await syncUsersWithCloud();
    } catch (e) {
        console.warn("Offline login: usando dados locais.");
    } finally {
        loginBtn.innerText = originalText;
        loginBtn.disabled = false;
    }

    const users = JSON.parse(localStorage.getItem('ts_users') || '[]');
    const user = users.find(u => 
        String(u.id).toLowerCase() === String(matricula).toLowerCase() && 
        String(u.pass) === String(pass)
    );
    
    if (user) {
        loginUser(user);
    } else {
        alert('❌ ERRO: Matrícula ou senha incorretos.\nVerifique se o Caps Lock está ativado.');
    }
}

function handleTestLogin() {
    const testUser = DEFAULT_USERS[0];
    loginUser(testUser);
}

function loginUser(user) {
    sessionStorage.setItem('ts_session', JSON.stringify({ id: user.id, name: user.name }));
    currentUser = { name: user.name, id: user.id };
    document.getElementById('user-welcome').innerText = `BEM-VINDO, ${user.name.toUpperCase()}`;
    document.getElementById('main-nav').style.display = 'flex';
    showScreen('screen-home');
    document.getElementById('login-id').value = "";
    document.getElementById('login-pass').value = "";
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

        regBtn.innerText = "⏳ CONECTANDO À NUVEM...";
        regBtn.disabled = true;

        // Fetch latest users from cloud to MERGE
        await syncUsersWithCloud();
        let users = JSON.parse(localStorage.getItem('ts_users') || '[]');
        
        if (users.find(u => String(u.id) === String(matricula))) {
            alert('⚠️ Esta matrícula já existe no sistema central!');
            return;
        }

        const newUser = { name, id: matricula, pass, company };
        users.push(newUser);
        
        // Save to Cloud (PUT overwrites with the full new list)
        const cloudRes = await fetch(CLOUD_DB_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });

        if (!cloudRes.ok) throw new Error("Erro de conexão com o servidor central.");

        localStorage.setItem('ts_users', JSON.stringify(users));
        
        alert('✅ SUCESSO: Cadastro realizado e sincronizado em todos os aparelhos!');
        
        document.getElementById('reg-user-name').value = "";
        document.getElementById('reg-user-id').value = "";
        document.getElementById('reg-user-pass').value = "";
        document.getElementById('reg-user-company').value = "";
        
        showScreen('screen-login');
    } catch (error) {
        alert('❌ ERRO: ' + error.message + '\nVerifique sua internet ou clique em "FORÇAR ATUALIZAÇÃO" na tela inicial.');
    } finally {
        regBtn.innerText = originalText;
        regBtn.disabled = false;
    }
}

async function syncUsersWithCloud() {
    try {
        const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            // Firebase returns an array or null
            const cloudUsers = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);
            
            // Local persistence
            const localUsersStr = localStorage.getItem('ts_users');
            const localUsers = JSON.parse(localUsersStr || '[]');
            
            const userMap = new Map();
            localUsers.forEach(u => { if(u && u.id) userMap.set(String(u.id), u); });
            cloudUsers.forEach(u => { if(u && u.id) userMap.set(String(u.id), u); });
            
            const mergedUsers = Array.from(userMap.values());
            localStorage.setItem('ts_users', JSON.stringify(mergedUsers));
            console.log("Cloud Sync Success.");
        }
    } catch (e) {
        console.error("Cloud Sync Error:", e);
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
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('user-welcome').innerText = 'BEM-VINDO, OPERADOR';
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
