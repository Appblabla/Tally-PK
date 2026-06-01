import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 🚩 Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCr9fXfx9m9cQ9_N_VhE3VTLbgdk3ZXRKM",
    authDomain: "tally-pk.firebaseapp.com",
    databaseURL: "https://tally-pk-default-rtdb.asia-southeast1.firebasedatabase.app/", 
    projectId: "tally-pk",
    storageBucket: "tally-pk.firebasestorage.app",
    messagingSenderId: "849778226457",
    appId: "1:849778226457:web:6ec1724e76588358f3c188"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🆔 Device ID Setup
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

// 🌟 App State
let state = {
    roomCode: "8492", 
    currentRole: "member",
    currentMode: null, 
    transactions: [],
    sessions: [] 
};

// --- 🔥 Firebase Listeners (Real-time Sync) ---

// 1. ดึงรายการเบิกคืน (Transactions)
onValue(ref(db, 'transactions'), (snapshot) => {
    const data = snapshot.val();
    state.transactions = data ? Object.values(data) : [];
    window.updateApplicationUI();
});

// 2. ดึงประวัติการจบรอบ (Sessions)
onValue(ref(db, 'sessions'), (snapshot) => {
    const data = snapshot.val();
    state.sessions = data ? Object.values(data).reverse() : [];
    window.renderApplicationLogs();
    window.renderDetachedLogContent();
});

// 3. ระบบดูแลห้องและเตือนโดนดีด
onValue(ref(db, 'systemConfig'), (snapshot) => {
    const data = snapshot.val();
    if(data) {
        // อัปเดตเลขห้องใหม่
        if(data.roomCode && data.roomCode !== state.roomCode) {
            state.roomCode = data.roomCode;
            document.getElementById('roomCodeDisplay').innerText = state.roomCode;
        }
        
        // ถ้าระบบโดน Reset สั่งดีดคนออก
        if(data.isResetting && state.currentRole === 'member' && document.getElementById('login-overlay').style.display === 'none') {
            window.showCustomAlert(
                "icon-confirm", 
                "ห้องโดน Reset", 
                "Admin ได้ทำการ Reset ห้องเรียบร้อยแล้ว! กรุณากรอกเลขห้องใหม่เพื่อเข้าใช้งานในรอบถัดไป", 
                () => { window.forceLockApplication(); }
            );
        }
    }
});


// 🌟 🛠️ Custom Popup Engine
window.showCustomAlert = (iconClass, title, message, onOkClick = null) => {
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
};

window.showCustomConfirm = (title, message, onConfirmClick) => {
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

    document.getElementById('popupCancelBtn').onclick = () => overlay.style.display = 'none';
    document.getElementById('popupConfirmBtn').onclick = () => {
        overlay.style.display = 'none';
        onConfirmClick();
    };
};


// 🔒 Security & Navigation
window.switchLoginRole = (role) => {
    document.getElementById('roleMember').classList.toggle('active', role === 'member');
    document.getElementById('roleAdmin').classList.toggle('active', role === 'admin');
    document.getElementById('member-form').style.display = role === 'member' ? 'block' : 'none';
    document.getElementById('admin-form').style.display = role === 'admin' ? 'block' : 'none';
    document.getElementById('btnAdminClearDetached').style.display = role === 'admin' ? 'block' : 'none';
};

window.submitAdminLogin = () => {
    if(document.getElementById('adminPasswordInput').value === '1401') { 
        state.currentRole = 'admin';
        window.unlockApplication();
    } else {
        window.showCustomAlert("icon-error", "สิทธิ์การเข้าถึง", "รหัสผ่านไม่ถูกต้อง");
    }
};

window.submitMemberLogin = () => {
    if(document.getElementById('roomCodeInput').value === state.roomCode) {
        state.currentRole = 'member';
        window.unlockApplication();
    } else {
        window.showCustomAlert("icon-error", "ระบุเลขห้อง", "เลขห้องไม่ถูกต้อง ไม่สามารถเข้าถึงห้องนี้ได้!");
    }
};

window.unlockApplication = () => {
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
        window.setButtonToEditMode(); 
    } else {
        nameInput.value = '';
        nameInput.disabled = false;
        window.setButtonToSaveMode(); 
    }
    window.updateApplicationUI();
    window.manageFooterVisibility('record'); 
};

window.forceLockApplication = () => {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('roomCodeInput').value = '';
    document.getElementById('adminPasswordInput').value = '';
    window.closeDetachedLogView();
};


// 📝 Core Actions
window.toggleNameState = () => {
    const nameInput = document.getElementById('userName');
    if (nameInput.disabled) {
        if(nameInput.value.trim() !== "") localStorage.setItem('pre_rename_hold', nameInput.value.trim());
        nameInput.disabled = false;
        nameInput.focus();
        window.setButtonToSaveMode();
    } else {
        const newName = nameInput.value.trim();
        if(!newName) {
            window.showCustomAlert("icon-error", "ข้อมูลไม่ครบ", "กรุณาระบุชื่อก่อนครับ");
            return nameInput.focus();
        }

        const oldName = localStorage.getItem('pre_rename_hold') || localStorage.getItem('myTallyName');
        if (oldName && oldName !== newName && oldName.trim() !== "") {
            const renameTx = {
                id: Date.now(), deviceId: myDeviceID,
                time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                name: newName, type: 'rename', oldName: oldName, device: getDeviceInfo()
            };
            push(ref(db, 'transactions'), renameTx); // 🔥 เซฟออนไลน์
        }
        localStorage.setItem('myTallyName', newName);
        localStorage.removeItem('pre_rename_hold'); 
        nameInput.disabled = true;
        window.setButtonToEditMode();
    }
};

window.setButtonToSaveMode = () => {
    document.getElementById('btn-name-icon').className = "fa-solid fa-floppy-disk";
    const btn = document.getElementById('btn-name-toggle');
    btn.style.background = "#ecfdf5"; btn.style.color = "#10b981"; btn.style.borderColor = "#a7f3d0";
};

window.setButtonToEditMode = () => {
    document.getElementById('btn-name-icon').className = "fa-solid fa-pen-to-square";
    const btn = document.getElementById('btn-name-toggle');
    btn.style.background = "#f1f5f9"; btn.style.color = "#6366f1"; btn.style.borderColor = "#e2e8f0";
};

window.actionGenerateRoomCode = () => {
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    set(ref(db, 'systemConfig/roomCode'), newCode).then(() => { // 🔥 เซฟออนไลน์
        window.showCustomAlert("icon-success", "สำเร็จ", `เปลี่ยนเลขห้องสำเร็จเป็น: ${newCode}`);
    });
};

window.setMode = (mode) => {
    state.currentMode = mode;
    const isW = mode === 'withdraw';
    const isR = mode === 'return';

    document.getElementById('modeWithdraw').classList.toggle('active', isW);
    document.getElementById('modeReturn').classList.toggle('active', isR);
    
    document.getElementById('withdraw-section').style.display = isW ? 'flex' : 'none';
    document.getElementById('return-section').style.display = isR ? 'flex' : 'none';
};

window.updateWithdrawButtonText = () => {
    const input = document.getElementById('withdrawAmount');
    const amt = parseInt(input.value);
    document.getElementById('btnWithdrawTextValue').innerText = (isNaN(amt) || amt <= 0) ? "200" : amt.toLocaleString();
};

window.executeWithdraw = () => {
    let amt = parseInt(document.getElementById('withdrawAmount').value);
    if (isNaN(amt) || amt <= 0) amt = 200;
    window.executeSaveEntry(amt);
    document.getElementById('withdrawAmount').value = '';
    window.updateWithdrawButtonText();
};

window.executeReturn = () => {
    const input = document.getElementById('returnAmount');
    const amt = parseInt(input.value);
    if(!amt || amt <= 0) return window.showCustomAlert("icon-error", "ข้อมูลไม่ถูกต้อง", "ระบุยอดเงินด้วยครับ");
    window.executeSaveEntry(amt);
    input.value = '';
};

window.executeSaveEntry = (amount) => {
    const nameInput = document.getElementById('userName');
    const currentInputValue = nameInput.value.trim();
    if(!currentInputValue) {
        window.showCustomAlert("icon-error", "ระบุชื่อผู้ใช้", "กรุณาใส่ชื่อก่อนครับ!");
        return nameInput.focus();
    }
    
    const savedOldName = localStorage.getItem('myTallyName');
    let calculatedRenameNote = (savedOldName && savedOldName !== currentInputValue && savedOldName.trim() !== "") ? `Changed from ${savedOldName}` : null;
    
    localStorage.setItem('myTallyName', currentInputValue);
    localStorage.removeItem('pre_rename_hold');
    nameInput.disabled = true;
    window.setButtonToEditMode();

    const newTx = {
        id: Date.now(), deviceId: myDeviceID, 
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: currentInputValue, type: state.currentMode,
        amount: Math.abs(parseInt(amount)), device: getDeviceInfo(), renameNote: calculatedRenameNote 
    };
    push(ref(db, 'transactions'), newTx); // 🔥 เซฟออนไลน์
};

// 📊 UI Generators
window.updateApplicationUI = () => {
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

    document.getElementById('grandTotal').innerText = `${grandTotal >= 0 ? '+' : ''}${grandTotal.toLocaleString()} ฿`;
    document.getElementById('grandTotal').style.color = grandTotal >= 0 ? 'var(--return)' : 'var(--withdraw)';

    const summaryContainer = document.getElementById('summaryList');
    if(Object.keys(summaryMap).length === 0) {
        summaryContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sub);">ยังไม่มีข้อมูลในรอบนี้</div>`;
    } else {
        summaryContainer.innerHTML = Object.keys(summaryMap).map(k => {
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
};

window.renderApplicationLogs = () => {
    window.buildLogHtmlStructure(document.getElementById('mainLogDateFilter').value, document.getElementById('logList'));
};

window.renderDetachedLogContent = () => {
    window.buildLogHtmlStructure(document.getElementById('detachedLogDate').value, document.getElementById('detachedLogContentList'));
};

window.buildLogHtmlStructure = (filterDate, containerElement) => {
    let listToRender = state.sessions;
    if(filterDate) listToRender = state.sessions.filter(s => s.pureDate === filterDate);

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
};

window.clearMainLogFilter = () => {
    document.getElementById('mainLogDateFilter').value = '';
    window.renderApplicationLogs();
};

window.clearDetachedLogSearch = () => {
    document.getElementById('detachedLogDate').value = '';
    window.renderDetachedLogContent();
};

// 🏁 Admin Actions (Reset & End Round)
window.executeEndRoundOnly = () => {
    if(!state.transactions || state.transactions.length === 0) {
        return window.showCustomAlert("icon-error", "ไม่มีรายการ", "ไม่สามารถจบรอบได้เนื่องจากยังไม่มีรายการบันทึก");
    }
    window.showCustomConfirm("🏁 ยืนยันจบยอดรอบนี้", "คุณต้องการจบยอดรอบปัจจุบันใช่หรือไม่? ระบบจะเซฟเข้าประวัติให้ทันที", () => {
        window.processSaveCurrentRoundToHistory();
        window.showCustomAlert("icon-success", "สำเร็จ", "จบยอดรอบปัจจุบันและย้ายประวัติเข้าสู่คลังเรียบร้อย!");
    });
};

window.askResetRoundPopup = () => {
    window.showCustomConfirm("🔐 ยืนยันการ Reset ห้อง", "ต้องการ reset เพื่อจบรอบและ re ห้องใหม่?", () => { 
        window.executeResetRoomActionComplete(); 
    });
};

window.executeResetRoomActionComplete = () => {
    if(state.transactions && state.transactions.length > 0) {
        window.processSaveCurrentRoundToHistory();
    }
    const newCode = Math.floor(1000 + Math.random() * 9000).toString(); 
    
    // 🔥 สั่ง Reset ออนไลน์เพื่อให้เครื่องอื่นหลุด
    set(ref(db, 'systemConfig'), { roomCode: newCode, isResetting: true }).then(() => {
        setTimeout(() => set(ref(db, 'systemConfig/isResetting'), false), 5000); // ยกเลิกการดีดหลัง 5 วินาที
        window.showCustomAlert("icon-success", "Reset สำเร็จ", `ระบบทำการจบรอบ ล้างรายการ และสุ่มรหัสห้องใหม่เรียบร้อย! รหัสห้องถัดไปคือ: ${newCode}`);
    });
};

window.processSaveCurrentRoundToHistory = () => {
    let total = state.transactions.reduce((s, t) => s + (t.type === 'withdraw' ? -t.amount : t.amount), 0);
    let summaryMap = {};
    
    state.transactions.forEach(t => {
        const key = t.deviceId || t.name;
        if(!summaryMap[key]) summaryMap[key] = { name: t.name, withdraw: 0, return: 0, lastTime: t.id };
        if(t.id >= summaryMap[key].lastTime) { summaryMap[key].name = t.name; summaryMap[key].lastTime = t.id; }
        if(t.type === 'rename') return;
        if(t.type === 'withdraw') summaryMap[key].withdraw += t.amount;
        else summaryMap[key].return += t.amount;
    });

    let membersLog = Object.keys(summaryMap).map(k => ({ name: summaryMap[k].name, amount: summaryMap[k].return - summaryMap[k].withdraw }));
    const now = new Date();
    
    // 🔥 ส่งประวัติใหม่ขึ้น Firebase
    push(ref(db, 'sessions'), {
        id: Date.now(), date: now.toLocaleString('th-TH'), pureDate: now.toISOString().split('T')[0],
        total: total, members: membersLog
    });
    
    remove(ref(db, 'transactions')); // 🔥 ล้างรายการเดิมออนไลน์
};

window.askClearAllSessions = () => {
    window.showCustomConfirm("🚨 ยืนยันการลบประวัติ", "คุณแน่ใจใช่หรือไม่ว่าต้องการลบประวัติย้อนหลังทุกรอบทิ้งถาวร?", () => {
        remove(ref(db, 'sessions')).then(() => { // 🔥 ล้างประวัติออนไลน์
            window.showCustomAlert("icon-success", "ลบเรียบร้อย", "ลบประวัติรอบย้อนหลังทั้งหมดเกลี้ยงตู้ถาวรสำเร็จ!");
        });
    });
};

// 🧭 Views toggles
window.openDetachedLogView = () => {
    document.getElementById('loginMainCard').style.display = 'none';
    document.getElementById('detached-log-view').style.display = 'block';
    window.renderDetachedLogContent();
};

window.closeDetachedLogView = () => {
    document.getElementById('detached-log-view').style.display = 'none';
    document.getElementById('loginMainCard').style.display = 'block';
};

window.manageFooterVisibility = (tabId) => {
    document.getElementById('app-sticky-footer').style.display = (tabId === 'record' || tabId === 'summary') ? 'flex' : 'none';
};

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
    window.manageFooterVisibility(tabId); 
};

// รอให้โหลด DOM เสร็จก่อนใส่ Event
document.addEventListener('DOMContentLoaded', () => {
    const detachedLogDateInput = document.getElementById('detachedLogDate');
    if (detachedLogDateInput) detachedLogDateInput.addEventListener('change', window.renderDetachedLogContent);
});
