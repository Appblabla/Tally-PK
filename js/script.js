import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

let currentMode = 'withdraw';
let transactions = [];
let sessions = [];

// 🆔 สร้าง DeviceID ประจำเครื่อง เพื่อใช้รวมยอด (มด/Mod จะถูกรวมเป็นคนเดียวอัตโนมัติ)
if (!localStorage.getItem('myDeviceID')) {
    localStorage.setItem('myDeviceID', 'dev-' + Date.now() + Math.random().toString(36).substr(2, 5));
}
const myDeviceID = localStorage.getItem('myDeviceID');

// 📱 ฟังก์ชันดึงรุ่นเครื่อง (iPhone, Mac, หรือรุ่น Android)
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

// --- Listeners ---
onValue(ref(db, 'transactions'), (snapshot) => {
    const data = snapshot.val();
    transactions = data ? Object.values(data) : [];
    updateUI();
    renderSummary();
});

onValue(ref(db, 'sessions'), (snapshot) => {
    const data = snapshot.val();
    sessions = data ? Object.values(data).reverse() : [];
    window.renderLog();
});

// --- Actions ---

// ✅ ปลดล็อกชื่อให้แก้ไขได้ (กดปุ่มปากกา)
window.enableNameEdit = () => {
    const nameInput = document.getElementById('userName');
    nameInput.disabled = false;
    nameInput.focus();
    nameInput.select();
};

window.setMode = (mode) => {
    currentMode = mode;
    const isW = mode === 'withdraw';
    document.getElementById('modeWithdraw').classList.toggle('active', isW);
    document.getElementById('modeReturn').classList.toggle('active', !isW);
    document.getElementById('withdraw-section').style.display = isW ? 'block' : 'none';
    document.getElementById('return-section').style.display = isW ? 'none' : 'block';
};

window.saveEntry = (amount) => {
    const nameInput = document.getElementById('userName');
    const newName = nameInput.value.trim();
    if (!newName) return alert("กรุณาใส่ชื่อก่อนบันทึกครับ"), nameInput.focus();

    const oldName = localStorage.getItem('myTallyName');
    let renameNote = (oldName && oldName !== newName) ? `Changed from ${oldName}` : null;

    localStorage.setItem('myTallyName', newName);
    nameInput.disabled = true; // ล็อกช่องชื่อทันที (Dim)

    const newTx = {
        id: Date.now(),
        deviceId: myDeviceID,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: newName,
        type: currentMode,
        amount: Math.abs(amount),
        device: getDeviceInfo(),
        renameNote: renameNote
    };

    push(ref(db, 'transactions'), newTx);
};

window.handleReturn = () => {
    const input = document.getElementById('returnAmount');
    const amt = parseInt(input.value);
    if (!amt) return alert("ระบุยอดเงินด้วยครับ");
    window.saveEntry(amt);
    input.value = '';
};

// 1️⃣ หน้าบันทึก: แสดง "ชื่อ - รุ่นเครื่อง"
function updateUI() {
    const body = document.getElementById('historyBody');
    if (!body) return;
    
    body.innerHTML = transactions.slice().reverse().map(t => {
        const isW = t.type === 'withdraw';
        const deviceSuffix = t.device ? ` - ${t.device}` : '';
        return `
            <tr>
                <td style="font-size:0.75rem; color:#94a3af;">${t.time}</td>
                <td>
                    <strong>${t.name}${deviceSuffix}</strong>
                    ${t.renameNote ? `<br><small style="font-size:0.6rem; color:#cbd5e1; font-style:italic;">${t.renameNote}</small>` : ''}
                </td>
                <td class="${isW ? 't-red' : 't-green'}">${isW ? '-' : '+'}${t.amount.toLocaleString()}</td>
                <td class="khit-col">${t.amount / 200} ขีด</td>
            </tr>
        `;
    }).join('');

    const total = transactions.reduce((sum, t) => sum + (t.type === 'withdraw' ? -t.amount : t.amount), 0);
    const grandTotalEl = document.getElementById('grandTotal');
    grandTotalEl.innerText = `${total >= 0 ? '+' : ''}${total.toLocaleString()} ฿`;
    grandTotalEl.style.color = total >= 0 ? '#10b981' : '#ef4444';
}

// 2️⃣ หน้าสรุป: รวมยอดตาม DeviceID
function renderSummary() {
    const container = document.getElementById('summaryList');
    if (!container) return;
    
    const summary = {};
    transactions.forEach(t => {
        const key = t.deviceId || t.name;
        if (!summary[key]) summary[key] = { name: t.name, withdraw: 0, return: 0, lastTime: t.id };
        if (t.id >= summary[key].lastTime) { summary[key].name = t.name; summary[key].lastTime = t.id; }
        if (t.type === 'withdraw') summary[key].withdraw += t.amount;
        else summary[key].return += t.amount;
    });
    
    if (Object.keys(summary).length === 0) {
        container.innerHTML = '<div class="empty-msg"><p>ยังไม่มีข้อมูลในรอบนี้</p></div>';
        return;
    }

    container.innerHTML = Object.keys(summary).map(key => {
        const data = summary[key];
        const net = data.return - data.withdraw; 
        const numColor = net >= 0 ? '#10b981' : '#ef4444';
        return `
            <div class="person-card">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                    <strong style="font-size: 1.1em;">👤 ${data.name}</strong>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8em; color: #94a3af;">ยอดสุทธิ</div>
                        <strong style="font-size: 1.2em; color: ${numColor};">${net >= 0 ? '+' : ''}${net.toLocaleString()} ฿</strong>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-top: 10px;">
                    <div>เบิก: <strong style="color: #ef4444;">-${data.withdraw.toLocaleString()}</strong></div>
                    <div>คืน: <strong style="color: #10b981;">+${data.return.toLocaleString()}</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

window.endRound = () => {
    if (!transactions.length || !confirm("จบยอดรอบนี้และเริ่มรอบใหม่?")) return;
    const finalSum = {};
    transactions.forEach(t => {
        const key = t.deviceId || t.name;
        if (!finalSum[key]) finalSum[key] = { name: t.name, withdraw: 0, return: 0, lastTime: t.id };
        if (t.id >= finalSum[key].lastTime) { finalSum[key].name = t.name; finalSum[key].lastTime = t.id; }
        if (t.type === 'withdraw') finalSum[key].withdraw += t.amount;
        else finalSum[key].return += t.amount;
    });
    const total = transactions.reduce((sum, t) => sum + (t.type === 'withdraw' ? -t.amount : t.amount), 0);
    push(ref(db, 'sessions'), { id: Date.now(), date: new Date().toLocaleString('th-TH'), total, details: finalSum });
    remove(ref(db, 'transactions'));
    location.hash = 'log';
};

// 3️⃣ หน้าประวัติรอบ: ซ่อมระบบแจ้งเตือน "ไม่พบรายการ"
window.renderLog = () => {
    const container = document.getElementById('logList');
    const filterValue = document.getElementById('logDateFilter').value;
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = '<div class="empty-msg"><p>ไม่มีประวัติการจบยอด</p></div>';
        return;
    }

    let filtered = sessions;
    if (filterValue) {
        filtered = sessions.filter(s => new Date(s.id).toISOString().split('T')[0] === filterValue);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-msg"><p>ไม่พบรายการของวันที่เลือก</p></div>';
        return;
    }

    container.innerHTML = filtered.map(s => `
        <div class="log-card">
            <div class="log-date">🕒 จบเมื่อ: ${s.date}</div>
            <div style="font-weight:bold; margin:5px 0; color: ${s.total >= 0 ? '#10b981' : '#ef4444'}">
                ยอดสุทธิรอบนี้: ${s.total >= 0 ? '+' : ''}${s.total.toLocaleString()} ฿
            </div>
            <div class="log-details">
                ${Object.values(s.details).map(d => {
                    const net = (d.return || 0) - (d.withdraw || 0);
                    return `<span>${d.name}: <strong style="color: ${net >= 0 ? '#10b981' : '#ef4444'}">${net >= 0 ? '+' : ''}${net.toLocaleString()}</strong></span>`;
                }).join('')}
            </div>
        </div>
    `).join('');
};

window.clearFilter = () => { document.getElementById('logDateFilter').value = ''; window.renderLog(); };

// 🔒 Admin Reset: ล้างข้อมูลด้วยรหัสผ่าน (คุณรู้คนเดียว)
window.nuclearReset = () => {
    const password = prompt("กรุณาใส่รหัสผ่านเพื่อล้างข้อมูลทั้งหมด:");
    // เปลี่ยน '141992' เป็นรหัสที่คุณต้องการใช้
    if (password === '141992') { 
        if (confirm("⚠️ ยืนยันการล้างข้อมูลทั้งหมดถาวร?")) {
            remove(ref(db, '/'));
            location.reload();
        }
    } else if (password !== null) {
        alert("รหัสผ่านไม่ถูกต้อง!");
    }
};

function handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'record';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${hash}`);
    const targetBtn = document.getElementById(`btn-${hash}`);
    if (targetTab && targetBtn) { targetTab.classList.add('active'); targetBtn.classList.add('active'); }
    const footer = document.querySelector('.footer-summary');
    if (footer) footer.style.display = (hash === 'record') ? 'flex' : 'none';
}

window.addEventListener('load', () => {
    const nameInput = document.getElementById('userName');
    const savedName = localStorage.getItem('myTallyName');
    if (savedName) { nameInput.value = savedName; nameInput.disabled = true; }
    handleRouting();
});
window.addEventListener('hashchange', handleRouting);
