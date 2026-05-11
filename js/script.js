let selectedUser = 'มด';
let currentMode = 'withdraw';

// เก็บยอดรวมเงินของแต่ละคน
const balances = {
    'มด': 0,
    'Rex': 0,
    'นิว': 0
};

function selectUser(user, element) {
    selectedUser = user;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
}

function changeType(mode) {
    currentMode = mode;
    const btnW = document.getElementById('typeWithdraw');
    const btnR = document.getElementById('typeReturn');
    const quickBtn = document.getElementById('btnQuickWithdraw');
    const returnWrapper = document.getElementById('returnInputWrapper');

    if (mode === 'withdraw') {
        btnW.classList.add('active');
        btnR.classList.remove('active');
        quickBtn.style.display = 'block';
        returnWrapper.style.display = 'none';
    } else {
        btnR.classList.add('active');
        btnW.classList.remove('active');
        quickBtn.style.display = 'none';
        returnWrapper.style.display = 'flex';
        document.getElementById('returnAmount').focus();
    }
}

function handleReturnSave() {
    const input = document.getElementById('returnAmount');
    const val = parseInt(input.value);
    if (!val) {
        alert("กรุณาระบุจำนวนเงินที่คืน");
        return;
    }
    saveData(val);
    input.value = '';
}

function saveData(amount) {
    const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const isWithdraw = currentMode === 'withdraw';
    
    // 1. อัปเดตยอดเงินใน Object ของแต่ละคน
    if (isWithdraw) {
        balances[selectedUser] += amount;
    } else {
        balances[selectedUser] -= amount;
    }

    // 2. อัปเดต UI รายคน (Individual Card)
    const userKhits = balances[selectedUser] / 200;
    document.getElementById(`val-${selectedUser}`).innerText = userKhits;
    document.getElementById(`baht-${selectedUser}`).innerText = `${balances[selectedUser].toLocaleString()} ฿`;

    // 3. คำนวณยอดรวมทั้งกอง
    let totalBaht = Object.values(balances).reduce((a, b) => a + b, 0);
    document.getElementById('totalUnit').innerText = `${totalBaht / 200} ขีด`;
    document.getElementById('totalBaht').innerText = `${totalBaht.toLocaleString()} ฿`;

    // 4. เพิ่มลงตารางประวัติ
    const historyBody = document.getElementById('historyBody');
    const unitChange = amount / 200;
    const row = `
        <tr>
            <td>${time}</td>
            <td><strong>${selectedUser}</strong></td>
            <td class="${isWithdraw ? 'badge-w' : 'badge-r'}">${isWithdraw ? '↗ เบิก' : '↩ คืน'}</td>
            <td class="${isWithdraw ? 'badge-w' : 'badge-r'}">${isWithdraw ? '+' : '-'}${unitChange} ขีด</td>
        </tr>
    `;
    historyBody.insertAdjacentHTML('afterbegin', row);
}
