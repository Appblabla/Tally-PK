let currentMode = 'withdraw';
let transactions = JSON.parse(localStorage.getItem('myTransactions')) || [];
let sessions = JSON.parse(localStorage.getItem('mySessions')) || [];

// เริ่มต้นระบบเมื่อโหลดหน้า
updateUI();

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabName));
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // ซ่อนยอดรวมด้านล่างเมื่อไม่อยู่หน้าบันทึก
    const footer = document.querySelector('.footer-summary');
    if (footer) {
        footer.style.display = (tabName === 'record') ? 'block' : 'none';
    }

    if (tabName === 'summary') renderSummary();
    if (tabName === 'log') renderLog();
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
    if (!amt) return alert("กรุณาระบุยอดเงินที่คืน");
    saveEntry(amt);
    input.value = '';
}

function saveEntry(amount) {
    const nameInput = document.getElementById('userName');
    const name = nameInput.value.trim();

    if (!name) {
        alert("กรุณากรอกชื่อผู้เบิก/คืน");
        nameInput.focus();
        return;
    }

    const newTx = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        name: name,
        type: currentMode,
        amount: amount
    };

    transactions.push(newTx);
    saveData();
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
    const grandTotalElement = document.getElementById('grandTotal');
    if (grandTotalElement) grandTotalElement.innerText = `${total.toLocaleString()} ฿`;
}

function renderSummary() {
    const container = document.getElementById('summaryList');
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = 0;
        summary[t.name] += (t.type === 'withdraw' ? t.amount : -t.amount);
    });
    const keys = Object.keys(summary);
    if (keys.length === 0) return container.innerHTML = '';
    
    container.innerHTML = keys.map(name => `
        <div class="person-card">
            <span>${name}</span>
            <strong>${summary[name].toLocaleString()} ฿</strong>
        </div>
    `).join('');
}

function renderLog() {
    const container = document.getElementById('logList');
    const filterValue = document.getElementById('logDateFilter').value;
    
    if (sessions.length === 0) return container.innerHTML = '';

    let filteredSessions = sessions;
    if (filterValue) {
        filteredSessions = sessions.filter(s => {
            const sessionDate = new Date(s.id).toISOString().split('T')[0];
            return sessionDate === filterValue;
        });
    }

    if (filterValue && filteredSessions.length === 0) {
        container.innerHTML = '<p class="empty-msg">❌ ไม่พบข้อมูลในวันที่เลือก</p>';
        return;
    } else if (filteredSessions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = filteredSessions.map(s => `
        <div class="log-card">
            <div class="log-date">🕒 ${s.date}</div>
            <div style="font-weight:bold; margin:5px 0;">ยอดรวมรอบนี้: ${s.total.toLocaleString()} ฿</div>
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

function endRound() {
    if (transactions.length === 0) return alert("ไม่มีรายการให้จบยอด");
    if (!confirm("จบยอดรอบนี้และเริ่มรอบใหม่ใช่หรือไม่?")) return;
    const summary = {};
    transactions.forEach(t => {
        if (!summary[t.name]) summary[t.name] = 0;
        summary[t.name] += (t.type === 'withdraw' ? t.amount : -t.amount);
    });
    const session = { 
        id: Date.now(), 
        date: new Date().toLocaleString('th-TH'), 
        total: transactions.reduce((s, t) => s + (t.type === 'withdraw' ? t.amount : -t.amount), 0), 
        details: summary 
    };
    sessions.unshift(session);
    transactions = [];
    saveData();
    updateUI();
    switchTab('log');
}

function saveData() {
    localStorage.setItem('myTransactions', JSON.stringify(transactions));
    localStorage.setItem('mySessions', JSON.stringify(sessions));
}
