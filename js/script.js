if (!localStorage.getItem('myDeviceID')) {
    localStorage.setItem('myDeviceID', 'dev-' + Date.now() + Math.random().toString(36).substr(2, 5));
}
const myDeviceID = localStorage.getItem('myDeviceID');

const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) {
        const match = ua.match(/Android\s+([^\s;]+);?\s+([^;)]+)/);
        if (match) return match[2].length > 20 ? "Android" : match[2]; 
        return "Android";
    }
    if (/Macintosh/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "Device";
};

let state = {
    roomCode: "8492", 
    currentRole: "member",
    currentMode: null, 
    transactions: [],
    sessions: [] 
};

// 🎯 เช็คข้อมูลเดิม: ถ้ามีข้อมูลเก่าอยู่แล้วให้ดึงมาใช้เลย ข้อมูลจะไม่หาย
if(localStorage.getItem('mock_db_state_production_v1')) {
    state = JSON.parse(localStorage.getItem('mock_db_state_production_v1'));
    state.currentMode = null; 
} else {
    // 🎯 ถ้าเป็นเครื่องใหม่เอี่ยม จะเริ่มด้วยค่าว่างๆ (เอาข้อมูลตัวอย่าง Rex, Mod ฯลฯ ออกแล้ว)
    localStorage.setItem('mock_db_state_production_v1', JSON.stringify(state));
}

setInterval(() => {
    if (state.currentRole === 'member' && localStorage.getItem('global_reset_signal') === 'triggered') {
        localStorage.removeItem('global_reset_signal');
        showCustomAlert(
            "icon-confirm", 
            "ห้องโดน Reset", 
            "Admin ได้ทำการ Reset ห้องเรียบร้อยแล้ว! กรุณากรอกเลขห้องใหม่เพื่อเข้าใช้งานในรอบถัดไป", 
            () => { forceLockApplication(); }
        );
    }
}, 1000);

function showCustomAlert(iconClass, title, message, onOkClick = null) {
    const overlay = document.getElementById('globalPopupContainer');
    const iconContainer = document.getElementById('popupIcon');
    const titleEl = document.getElementById('popupTitle');
    const msgEl = document.getElementById('popupMessage');
    const btnGroup = document.getElementById('popupBtnGroup');

    iconContainer.className = `custom-popup-icon ${iconClass}`;
    if (iconClass === 'icon-error') iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    else if (iconClass === 'icon-success') iconContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    else iconContainer.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';

    titleEl.innerText = title;
    msgEl.innerText = message;

    btnGroup.innerHTML = `<button class="custom-popup-btn custom-popup-btn-ok">ตกลง</button>`;
    overlay.style.display = 'flex';

    btnGroup.querySelector('.custom-popup-btn-ok').onclick = () => {
        overlay.style.display = 'none';
        if (onOkClick) onOkClick();
    };
}

function showCustomConfirm(title, message, onConfirmClick) {
    const overlay = document.getElementById('globalPopupContainer');
    const iconContainer = document.getElementById('popupIcon');
    const titleEl = document.getElementById('popupTitle');
    const msgEl = document.getElementById('popupMessage');
    const btnGroup = document.getElementById('popupBtnGroup');

    iconContainer.className = "custom-popup-icon icon-confirm";
    iconContainer.innerHTML = '<i class="fa-solid fa-circle-question"></i>';

    titleEl.innerText = title;
    msgEl.innerText = message;

    btnGroup.innerHTML = `
        <button class="custom-popup-btn custom-popup-btn-cancel" id="popupCancelBtn">ยกเลิก</button>
        <button class="custom-popup-btn custom-popup-btn-ok" id="popupConfirmBtn">ยืนยัน</button>
    `;
    overlay.style.display = 'flex';

    document.getElementById('popupCancelBtn').onclick = () => {
        overlay.style.display = 'none';
    };
    document.getElementById('popupConfirmBtn').onclick = () => {
        overlay.style.display = 'none';
        onConfirmClick();
    };
}

function saveMockDB() {
    localStorage.setItem('mock_db_state_production_v1', JSON.stringify(state));
}

function switchLoginRole(role) {
    document.getElementById('roleMember').classList.toggle('active', role === 'member');
    document.getElementById('roleAdmin').classList.toggle('active', role === 'admin');
    document.getElementById('member-form').style.display = role === 'member' ? 'block' : 'none';
    document.getElementById('admin-form').style.display = role === 'admin' ? 'block' : 'none';
    document.getElementById('btnAdminClearDetached').style.display = role === 'admin' ? 'block' : 'none';
}

function submitAdminLogin() {
    if(document.getElementById('adminPasswordInput').value === '1401') { 
        state.currentRole = 'admin';
        unlockApplication();
    } else {
        showCustomAlert("icon-error", "สิทธิ์การเข้าถึง", "รหัสผ่านไม่ถูกต้อง");
    }
}

function submitMemberLogin() {
    if(document.getElementById('roomCodeInput').value === state.roomCode) {
        state.currentRole = 'member';
        unlockApplication();
    } else {
        showCustomAlert("icon-error", "ระบุเลขห้อง", "เลขห้องไม่ถูกต้อง ไม่สามารถเข้าถึงห้องนี้ได้!");
    }
}

function unlockApplication() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('adminGenBtn').style.display = state.currentRole === 'admin' ? 'block' : 'none';
    document.getElementById('adminControlsBlock').style.display = state.currentRole === 'admin' ? 'flex' : 'none';
    document.getElementById('btnAdminClearInside').style.display = state.currentRole === 'admin' ? 'block' : 'none';
    
    document.getElementById('roomCodeDisplay').innerText = state.roomCode;
    
    const savedName = localStorage.getItem('myTallyName');
    const nameInput = document.getElementById('userName');
    if (savedName && savedName.trim() !== "") {
        nameInput.value = savedName;
        nameInput.disabled = true;
        setButtonToEditMode(); 
    } else {
        nameInput.value = '';
        nameInput.disabled = false;
        setButtonToSaveMode(); 
    }
    updateApplicationUI();
    manageFooterVisibility('record'); 
}

function forceLockApplication() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('roomCodeInput').value = '';
    document.getElementById('adminPasswordInput').value = '';
    closeDetachedLogView();
}

function toggleNameState() {
    const nameInput = document.getElementById('userName');
    if (nameInput.disabled) {
        if(nameInput.value.trim() !== "") {
            localStorage.setItem('pre_rename_hold', nameInput.value.trim());
        }
        nameInput.disabled = false;
        nameInput.focus();
        setButtonToSaveMode();
    } else {
        const newName = nameInput.value.trim();
        if(!newName) {
            showCustomAlert("icon-error", "ข้อมูลไม่ครบ", "กรุณาระบุชื่อก่อนครับ");
            return nameInput.focus();
        }

        const oldName = localStorage.getItem('pre_rename_hold') || localStorage.getItem('myTallyName');
        if (oldName && oldName !== newName && oldName.trim() !== "") {
            state.transactions.push({
                id: Date.now(), deviceId: myDeviceID,
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                name: newName, type: 'rename', oldName: oldName, device: getDeviceInfo()
            });
        }
        localStorage.setItem('myTallyName', newName);
        localStorage.removeItem('pre_rename_hold'); 
        nameInput.disabled = true;
        setButtonToEditMode();
        saveMockDB();
        updateApplicationUI();
    }
}

function setButtonToSaveMode() {
    document.getElementById('btn-name-icon').className = "fa-solid fa-floppy-disk";
    document.getElementById('btn-name-toggle').style.background = "#ecfdf5";
    document.getElementById('btn-name-toggle').style.color = "#10b981";
    document.getElementById('btn-name-toggle').style.borderColor = "#a7f3d0";
}

function setButtonToEditMode() {
    document.getElementById('btn-name-icon').className = "fa-solid fa-pen-to-square";
    document.getElementById('btn-name-toggle').style.background = "#f1f5f9";
    document.getElementById('btn-name-toggle').style.color = "#6366f1";
    document.getElementById('btn-name-toggle').style.borderColor = "#e2e8f0";
}

function actionGenerateRoomCode() {
    state.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    document.getElementById('roomCodeDisplay').innerText = state.roomCode;
    saveMockDB();
    showCustomAlert("icon-success", "สำเร็จ", `เปลี่ยนเลขห้องสำเร็จเป็น: ${state.roomCode}`);
}

function setMode(mode) {
    state.currentMode = mode;
    const isW = mode === 'withdraw';
    const isR = mode === 'return';

    document.getElementById('modeWithdraw').classList.toggle('active', isW);
    document.getElementById('modeReturn').classList.toggle('active', isR);
    
    document.getElementById('withdraw-section').style.display = isW ? 'flex' : 'none';
    document.getElementById('return-section').style.display = isR ? 'flex' : 'none';
}

function updateWithdrawButtonText() {
    const input = document.getElementById('withdrawAmount');
    const btnText = document.getElementById('btnWithdrawTextValue');
    const amt = parseInt(input.value);
    btnText.innerText = (isNaN(amt) || amt <= 0) ? "200" : amt.toLocaleString();
}

function executeWithdraw() {
    const input = document.getElementById('withdrawAmount');
    let amt = parseInt(input.value);
    if (isNaN(amt) || amt <= 0) amt = 200;
    executeSaveEntry(amt);
    input.value = '';
    updateWithdrawButtonText();
}

function executeReturn() {
    const input = document.getElementById('returnAmount');
    const amt = parseInt(input.value);
    if(!amt || amt <= 0) {
        showCustomAlert("icon-error", "ข้อมูลไม่ถูกต้อง", "ระบุยอดเงินด้วยครับ");
        return;
    }
    executeSaveEntry(amt);
    input.value = '';
}

function executeSaveEntry(amount) {
    const nameInput = document.getElementById('userName');
    const currentInputValue = nameInput.value.trim();
    if(!currentInputValue) {
        showCustomAlert("icon-error", "ระบุชื่อผู้ใช้", "กรุณาใส่ชื่อก่อนครับ!");
        return nameInput.focus();
    }
    
    const savedOldName = localStorage.getItem('myTallyName');
    let calculatedRenameNote = (savedOldName && savedOldName !== currentInputValue && savedOldName.trim() !== "") ? `Changed from ${savedOldName}` : null;
    
    localStorage.setItem('myTallyName', currentInputValue);
    localStorage.removeItem('pre_rename_hold');
    nameInput.disabled = true;
    setButtonToEditMode();

    state.transactions.push({
        id: Date.now(), deviceId: myDeviceID, 
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: currentInputValue, type: state.currentMode,
        amount: Math.abs(parseInt(amount)), device: getDeviceInfo(), renameNote: calculatedRenameNote 
    });
    saveMockDB();
    updateApplicationUI();
}

function updateApplicationUI() {
    const body = document.getElementById('historyBody');
    if(!state.transactions || state.transactions.length === 0) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-sub);">ยังไม่มีข้อมูลในรอบนี้</td></tr>`;
    } else {
        body.innerHTML = state.transactions.slice().reverse().map(t => {
            if(t.type === 'rename') {
                return `<tr><td style="font-size:0.75rem; color:#94a3af;">${t.time}</td><td colspan="3"><span class="rename-log-text"><i class="fa-solid fa-clock-rotate-left"></i> 👤 ${t.oldName} เปลี่ยนชื่อเป็น <strong>${t.name}</strong> (${t.device})</span></td></tr>`;
            }
            const isW = t.type === 'withdraw';
            return `<tr><td style="font-size:0.75rem; color:#94a3af;">${t.time}</td><td><strong>${t.name} - ${t.device}</strong>${t.renameNote ? `<br><small class="rename-note"><i class="fa-solid fa-clock-rotate-left"></i> ${t.renameNote}</small>` : ''}</td><td class="${isW ? 't-red' : 't-green'}">${isW ? '-' : '+'}${t.amount.toLocaleString()}</td><td>${t.amount / 200} ขีด</td></tr>`;
        }).join('');
    }

    let grandTotal = 0;
    let summaryMap = {};
    
    if (state.transactions) {
        state.transactions.forEach(t => {
            const key = t.deviceId || t.name;
            if(!summaryMap[key]) summaryMap[key] = { name: t.name, withdraw: 0, return: 0, lastTime: t.id };
            if(t.id >= summaryMap[key].lastTime) { summaryMap[key].name = t.name; summaryMap[key].lastTime = t.id; }
            if(t.type === 'rename') return;
            if(t.type === 'withdraw') { grandTotal -= t.amount; summaryMap[key].withdraw += t.amount; }
            else { grandTotal += t.amount; summaryMap[key].return += t.amount; }
        });
    }

    const totalEl = document.getElementById('grandTotal');
    totalEl.innerText = `${grandTotal >= 0 ? '+' : ''}${grandTotal.toLocaleString()} ฿`;
    totalEl.style.color = grandTotal >= 0 ? 'var(--return)' : 'var(--withdraw)';

    const summaryContainer = document.getElementById('summaryList');
    const summaryKeys = Object.keys(summaryMap);
    if(summaryKeys.length === 0) {
        summaryContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sub);">ยังไม่มีข้อมูลในรอบนี้</div>`;
    } else {
        summaryContainer.innerHTML = summaryKeys.map(k => {
            const data = summaryMap[k];
            const net = data.return - data.withdraw;
            return `
                <div class="person-card">
                    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
                        <strong style="font-size: 1.1rem;">👤 ${data.name}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.95rem; color:var(--text-sub);">
                        <div>เบิก: <span class="t-red">-${data.withdraw.toLocaleString()}</span></div>
                        <div>คืน: <span class="t-green">+${data.return.toLocaleString()}</span></div>
                    </div>
                    <div class="ux-net-bottom-box">
                        <span style="font-size:0.85rem; color:var(--text-sub); font-weight:bold;">ยอดสุทธิ</span>
                        <strong style="font-size:1.15rem; color:${net >= 0 ? 'var(--return)':'var(--withdraw)'}">${net >= 0 ? '+':''}${net.toLocaleString()} ฿</strong>
                    </div>
                </div>`;
        }).join('');
    }
    renderApplicationLogs();
}

function renderApplicationLogs() {
    const mainFilterValue = document.getElementById('mainLogDateFilter').value;
    const logContainer = document.getElementById('logList');
    buildLogHtmlStructure(mainFilterValue, logContainer);
}

function buildLogHtmlStructure(filterDate, containerElement) {
    let listToRender = state.sessions;
    if(filterDate) {
        listToRender = state.sessions.filter(s => s.pureDate === filterDate);
    }

    if(!listToRender || listToRender.length === 0) {
        containerElement.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sub);">ไม่มีข้อมูลประวัติย้อนหลัง</div>`;
        return;
    }

    containerElement.innerHTML = listToRender.map(s => `
        <div class="log-card-original">
            <div class="log-header-original">🕒 จบเมื่อ: ${s.date}</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: ${s.total >= 0 ? 'var(--return)' : 'var(--withdraw)'}">
                ยอดสุทธิรอบนี้: ${s.total >= 0 ? '+' : ''}${s.total.toLocaleString()} ฿
            </div>
            <div class="log-grid-container">
                ${s.members.map(m => `
                    <div class="log-grid-item">
                        <span>${m.name}:</span>
                        <span style="color: ${m.amount >= 0 ? 'var(--return)' : 'var(--withdraw)'}">
                            ${m.amount >= 0 ? '+' : ''}${m.amount.toLocaleString()}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function clearMainLogFilter() {
    document.getElementById('mainLogDateFilter').value = '';
    renderApplicationLogs();
}

function executeEndRoundOnly() {
    if(!state.transactions || state.transactions.length === 0) {
        showCustomAlert("icon-error", "ไม่มีรายการ", "ไม่สามารถจบรอบได้เนื่องจากยังไม่มีรายการบันทึก");
        return;
    }
    showCustomConfirm("🏁 ยืนยันจบยอดรอบนี้", "คุณต้องการจบยอดรอบปัจจุบันใช่หรือไม่? ระบบจะเซฟเข้าประวัติให้ทันที", () => {
        processSaveCurrentRoundToHistory();
        showCustomAlert("icon-success", "สำเร็จ", "จบยอดรอบปัจจุบันและย้ายประวัติเข้าสู่คลังเรียบร้อย!");
    });
}

function askResetRoundPopup() {
    showCustomConfirm(
        "🔐 ยืนยันการ Reset ห้อง", 
        "ต้องการ reset เพื่อจบรอบและ re ห้องใหม่?", 
        () => { executeResetRoomActionComplete(); }
    );
}

function executeResetRoomActionComplete() {
    if(state.transactions && state.transactions.length > 0) {
        processSaveCurrentRoundToHistory();
    }
    
    state.transactions = []; 
    state.roomCode = Math.floor(1000 + Math.random() * 9000).toString(); 
    localStorage.setItem('global_reset_signal', 'triggered');
    
    saveMockDB();
    updateApplicationUI(); 

    document.getElementById('roomCodeDisplay').innerText = state.roomCode;
    showCustomAlert("icon-success", "Reset สำเร็จ", `ระบบทำการจบรอบ ล้างรายการ และสุ่มรหัสห้องใหม่เรียบร้อย! รหัสห้องถัดไปคือ: ${state.roomCode}`);
}

function processSaveCurrentRoundToHistory() {
    let total = state.transactions.reduce((s, t) => {
        if(t.type === 'rename') return s;
        return s + (t.type === 'withdraw' ? -t.amount : t.amount);
    }, 0);

    let summaryMap = {};
    state.transactions.forEach(t => {
        const key = t.deviceId || t.name;
        if(!summaryMap[key]) summaryMap[key] = { name: t.name, withdraw: 0, return: 0, lastTime: t.id };
        if(t.id >= summaryMap[key].lastTime) { summaryMap[key].name = t.name; summaryMap[key].lastTime = t.id; }
        if(t.type === 'rename') return;
        if(t.type === 'withdraw') summaryMap[key].withdraw += t.amount;
        else summaryMap[key].return += t.amount;
    });

    let detailedMembersLog = Object.keys(summaryMap).map(k => {
        const d = summaryMap[k];
        return { name: d.name, amount: d.return - d.withdraw };
    });

    const now = new Date();
    state.sessions.unshift({
        id: Date.now(),
        date: now.toLocaleString('th-TH'),
        pureDate: now.toISOString().split('T')[0],
        total: total,
        members: detailedMembersLog
    });

    state.transactions = []; 
    saveMockDB();
    updateApplicationUI();
}

function askClearAllSessions() {
    if (state.currentRole !== 'admin') return;
    showCustomConfirm("🚨 ยืนยันการลบประวัติ", "คุณแน่ใจใช่หรือไม่ว่าต้องการลบประวัติย้อนหลังทุกรอบทิ้งถาวร? (ข้อมูลจะหายถาวร)", () => {
        state.sessions = []; 
        saveMockDB();
        if(document.getElementById('detached-log-view').style.display === 'block') {
            renderDetachedLogContent();
        } else {
            renderApplicationLogs();
        }
        showCustomAlert("icon-success", "ลบเรียบร้อย", "ลบประวัติรอบย้อนหลังทั้งหมดเกลี้ยงตู้ถาวรสำเร็จ!");
    });
}

function openDetachedLogView() {
    document.getElementById('loginMainCard').style.display = 'none';
    document.getElementById('detached-log-view').style.display = 'block';
    renderDetachedLogContent();
}

function closeDetachedLogView() {
    document.getElementById('detached-log-view').style.display = 'none';
    document.getElementById('loginMainCard').style.display = 'block';
}

function renderDetachedLogContent() {
    const filterVal = document.getElementById('detachedLogDate').value;
    const container = document.getElementById('detachedLogContentList');
    buildLogHtmlStructure(filterVal, container);
}

document.getElementById('detachedLogDate').addEventListener('change', renderDetachedLogContent);

function clearDetachedLogSearch() {
    document.getElementById('detachedLogDate').value = '';
    renderDetachedLogContent();
}

function manageFooterVisibility(tabId) {
    const footer = document.getElementById('app-sticky-footer');
    footer.style.display = (tabId === 'record' || tabId === 'summary') ? 'flex' : 'none';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.add('active');
    manageFooterVisibility(tabId); 
}
