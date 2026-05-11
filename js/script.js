let currentMode = 'withdraw';
let transactions = [];
let sessions = [];

// โหลดข้อมูลจากเครื่อง
function loadData() {
    transactions = JSON.parse(localStorage.getItem('myTransactions')) || [];
    sessions = JSON.parse(localStorage.getItem('mySessions')) || [];
}

loadData();
updateUI();

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabName));
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    const footer = document.querySelector('.footer-summary');
    if (footer) footer.style.display = (tabName === 'record') ? 'block' : 'none';

    // ล้างแคชการแสดงผลและดึงข้อมูลใหม่
    loadData();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'log') {
        document.getElementById('logDateFilter').value = ''; 
        renderLog();
    }
}

function setMode(mode) {
    currentMode = mode;
    const isW = mode === 'withdraw';
    document.getElementById('modeWithdraw').classList.toggle('active', isW);
    document.getElementById('modeReturn').classList.toggle('active', !isW);
    document.getElementById('withdraw-section').style.display = isW ? 'block' : 'none';
    document.getElementById('return-section').style.display = isW ? 'none' : 'block';
}

function handleReturn() {
    const input = document.getElementById('returnAmount');
    const amt = parseInt(input.value);
    if (!amt) return alert("ระบุยอดเงินด้วยครับ");
    saveEntry(amt);
    input.value = '';
}

function saveEntry(amount) {
    const nameInput = document.getElementById('userName');
    const name = nameInput.value.trim();
    if (!name) return alert("กรุณาใส่ชื่อคนเบิก/คืน"), nameInput.focus();

    const newTx = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: name,
        type: currentMode,
        amount: amount
    };

    transactions.push(newTx);
    saveToStorage();
    updateUI();
}

function updateUI() {
    const body = document.getElementById('historyBody');
    if (!body) return;
    body.innerHTML = '';
    
    [...transactions].reverse().forEach(t => {
        const isW = t.type === 'withdraw';
        body.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${t.time}</td>
                <td><strong>${t.name}</strong></td>
                <td class="${isW ? 't-red' : 't-green'}">${isW ? '+' : '-'}${t.amount.toLocaleString()}</td>
                <td class="khit-col">${t.amount / 200} ขีด</td>
            </tr>
        `);
    });

    const total = transactions.reduce((s, t) => s + (t.type === 'withdraw' ? t.amount : -t.amount), 0);
    document.getElementById('grandTotal').innerText = `${total.toLocaleString()} ฿`;
}

// 🚩 ฟังก์ชันจบรอบ (หัวใจของการใช้ได้หลายรอบ)
function endRound() {
    if (transactions.length === 0) return alert("ยังไม่มีรายการบันทึกในรอบนี้");
    
    if (!confirm("ต้องการจบยอดรอบนี้ใช่ไหม? ข้อมูลจะถูกย้ายไปที่หน้า 'ประวัติรอบ' และล้างหน้านี้เพื่อเริ่มรอบใหม่")) return;

    // 1. คำนวณสรุปของรอบนี้
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = 0;
        summary[t.name] += (t.type === 'withdraw' ? t.amount : -t.amount);
    });

    const total = transactions.reduce((s, t) => s + (t.type === 'withdraw' ? t.amount : -t.amount), 0);

    // 2. เก็บเข้า Session Log
    const newSession = {
        id: Date.now(),
        date: new Date().toLocaleString('th-TH'),
        total: total,
        details: summary
    };

    sessions.unshift(newSession); // เพิ่มเข้าข้างหน้า
    transactions = []; // ล้างรายการปัจจุบัน

    // 3. บันทึกและเปลี่ยนหน้า
    saveToStorage();
    updateUI();
    switchTab('log');
    alert("ปิดยอดสำเร็จ! เริ่มรอบใหม่ได้เลย");
}

function renderSummary() {
    const container = document.getElementById('summaryList');
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = 0;
        summary[t.name] += (t.type === 'withdraw' ? t.amount : -t.amount);
    });
    const keys = Object.keys(summary);
    if (keys.length === 0) return container.innerHTML = '<p style="text-align:center; color:#94a3af; padding:20px;">ไม่มีข้อมูลรอบปัจจุบัน</p>';
    
    container.innerHTML = keys.map(name => `
        <div class="person-card">
            <span>${name}</span>
            <strong>${summary[name].toLocaleString()} ฿</strong>
        </div>
    `).join('');
}

function renderLog() {
    const container = document.getElementById('logList');
    const filter = document.getElementById('logDateFilter').value;
    
    if (sessions.length === 0) return container.innerHTML = '<p style="text-align:center; color:#94a3af; padding:40px;">ไม่มีประวัติรอบที่จบไปแล้ว</p>';

    let filtered = sessions;
    if (filter) {
        filtered = sessions.filter(s => new Date(s.id).toISOString().split('T')[0] === filter);
    }

    if (filter && filtered.length === 0) {
        container.innerHTML = '<div class="empty-msg">❌ ไม่พบข้อมูลในวันที่เลือก</div>';
        return;
    }

    container.innerHTML = filtered.map(s => `
        <div class="log-card">
            <div class="log-date">🕒 จบเมื่อ: ${s.date}</div>
            <div style="font-weight:bold; margin:5px 0;">ยอดรวม: ${s.total.toLocaleString()} ฿</div>
            <div class="log-details">
                ${Object.keys(s.details).map(name => `<span>${name}: ${s.details[name].toLocaleString()}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function clearFilter() {
    document.getElementById('logDateFilter').value = '';
    renderLog();
}

function saveToStorage() {
    localStorage.setItem('myTransactions', JSON.stringify(transactions));
    localStorage.setItem('mySessions', JSON.stringify(sessions));
}
