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

// --- Listener ---
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

// --- Functions ---
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
    const name = nameInput.value.trim();
    if (!name) return alert("กรุณาใส่ชื่อก่อนบันทึกครับ"), nameInput.focus();

    const newTx = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: name,
        type: currentMode,
        amount: Math.abs(amount)
    };

    push(ref(db, 'transactions'), newTx);
    nameInput.value = '';
    nameInput.focus();
};

window.handleReturn = () => {
    const input = document.getElementById('returnAmount');
    const amt = parseInt(input.value);
    if (!amt) return alert("ระบุยอดเงินด้วยครับ");
    window.saveEntry(amt);
    input.value = '';
};

// 1️⃣ หน้าบันทึก (Tab 1): เบิกเป็นลบ (-) | คืนเป็นบวก (+)
function updateUI() {
    const body = document.getElementById('historyBody');
    if (!body) return;
    
    body.innerHTML = transactions.slice().reverse().map(t => {
        const isW = t.type === 'withdraw';
        return `
            <tr>
                <td>${t.time}</td>
                <td><strong>${t.name}</strong></td>
                <td class="${isW ? 't-red' : 't-green'}">
                    ${isW ? '-' : '+'}${t.amount.toLocaleString()}
                </td>
                <td class="khit-col">${t.amount / 200} ขีด</td>
            </tr>
        `;
    }).join('');

    // ยอดรวมกองกลาง = (คืนทั้งหมด) - (เบิกทั้งหมด)
    const total = transactions.reduce((sum, t) => {
        return sum + (t.type === 'withdraw' ? -t.amount : t.amount);
    }, 0);
    
    const grandTotalEl = document.getElementById('grandTotal');
    grandTotalEl.innerText = `${total >= 0 ? '+' : ''}${total.toLocaleString()} ฿`;
    grandTotalEl.style.color = total >= 0 ? '#10b981' : '#ef4444';
}

// 2️⃣ หน้าสรุป (Tab 2): แยกคอลัมน์เบิก/คืน และยอดสุทธิ
function renderSummary() {
    const container = document.getElementById('summaryList');
    if (!container) return;
    
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = { withdraw: 0, return: 0 };
        if (t.type === 'withdraw') summary[t.name].withdraw += t.amount;
        else summary[t.name].return += t.amount;
    });
    
    const keys = Object.keys(summary);
    if (keys.length === 0) {
        container.innerHTML = '<p class="empty-msg">ยังไม่มีข้อมูลในรอบนี้</p>';
        return;
    }
    
    container.innerHTML = keys.map(name => {
        const data = summary[name];
        const net = data.return - data.withdraw; // คืน - เบิก
        return `
            <div class="person-card" style="display: flex; flex-direction: column; gap: 10px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                    <strong style="font-size: 1.1em;">👤 ${name}</strong>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8em; color: #94a3af; margin-bottom: 2px;">ยอดสุทธิ</div>
                        <strong style="font-size: 1.2em; color: ${net >= 0 ? '#10b981' : '#ef4444'}">
                            ${net >= 0 ? '+' : ''}${net.toLocaleString()} ฿
                        </strong>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                    <div style="color: #64748b;">
                        รวมเบิก: <span style="color: #ef4444; font-weight: bold;">-${data.withdraw.toLocaleString()}</span>
                    </div>
                    <div style="color: #64748b;">
                        รวมคืน: <span style="color: #10b981; font-weight: bold;">+${data.return.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.endRound = () => {
    if (!transactions.length) return alert("ยังไม่มีรายการ");
    if (!confirm("จบยอดรอบนี้และเริ่มรอบใหม่?")) return;
    
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = { withdraw: 0, return: 0 };
        if (t.type === 'withdraw') summary[t.name].withdraw += t.amount;
        else summary[t.name].return += t.amount;
    });

    const total = transactions.reduce((sum, t) => sum + (t.type === 'withdraw' ? -t.amount : t.amount), 0);
    
    push(ref(db, 'sessions'), { 
        id: Date.now(), 
        date: new Date().toLocaleString('th-TH'), 
        total, 
        details: summary 
    });
    remove(ref(db, 'transactions'));
    location.hash = 'log';
};

window.renderLog = () => {
    const container = document.getElementById('logList');
    const filterValue = document.getElementById('logDateFilter').value;
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-msg">ไม่มีประวัติการจบยอด</p>';
        return;
    }

    let filtered = sessions;
    if (filterValue) {
        filtered = sessions.filter(s => new Date(s.id).toISOString().split('T')[0] === filterValue);
    }

    if (filterValue && filtered.length === 0) {
        container.innerHTML = '<div class="empty-msg"><p>ไม่พบรายการของวันที่เลือก</p></div>';
        return;
    }

    container.innerHTML = filtered.map(s => `
        <div class="log-card">
            <div class="log-date">🕒 จบเมื่อ: ${s.date}</div>
            <div style="font-weight:bold; margin:5px 0; font-size: 1.1em; color: ${s.total >= 0 ? '#10b981' : '#ef4444'}">
                ยอดสุทธิรอบนี้: ${s.total >= 0 ? '+' : ''}${s.total.toLocaleString()} ฿
            </div>
            <div class="log-details">
                ${Object.keys(s.details).map(name => {
                    const d = s.details[name];
                    const net = d.return - d.withdraw;
                    return `<span>${name}: <strong>${net >= 0 ? '+' : ''}${net.toLocaleString()}</strong></span>`;
                }).join('')}
            </div>
        </div>
    `).join('');
};

window.clearFilter = () => {
    document.getElementById('logDateFilter').value = '';
    window.renderLog();
};

window.nuclearReset = () => {
    if (confirm("⚠️ ล้างข้อมูลทั้งหมดถาวร?")) {
        remove(ref(db, '/'));
        location.reload();
    }
};

function handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'record';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${hash}`);
    const targetBtn = document.getElementById(`btn-${hash}`);
    if (targetTab && targetBtn) {
        targetTab.classList.add('active');
        targetBtn.classList.add('active');
    }
    const footer = document.querySelector('.footer-summary');
    if (footer) footer.style.display = (hash === 'record') ? 'block' : 'none';
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);
