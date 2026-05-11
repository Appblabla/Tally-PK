let selectedUser = 'มด';
let currentMode = 'withdraw';
let totalAmount = 0;

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
    input.value = ''; // ล้างค่า
}

function saveData(amount) {
    const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const isWithdraw = currentMode === 'withdraw';
    
    // อัปเดตยอดรวม
    if (isWithdraw) {
        totalAmount += amount;
    } else {
        totalAmount -= amount;
    }

    // เพิ่มลงตารางประวัติ
    const historyBody = document.getElementById('historyBody');
    const row = `
        <tr>
            <td>${time}</td>
            <td><strong>${selectedUser}</strong></td>
            <td class="${isWithdraw ? 'badge-w' : 'badge-r'}">${isWithdraw ? '↗ เบิก' : '↩ คืน'}</td>
            <td class="${isWithdraw ? 'badge-w' : 'badge-r'}">${isWithdraw ? '+' : '-'}${amount.toLocaleString()}</td>
        </tr>
    `;
    historyBody.insertAdjacentHTML('afterbegin', row);

    // อัปเดตหน้าจอ
    document.getElementById('totalText').innerText = `${totalAmount.toLocaleString()} ฿`;
    document.getElementById('unitText').innerText = `${totalAmount / 200} ขีด`;
}

function resetAll() {
    if(confirm("ล้างข้อมูลทั้งหมด?")) location.reload();
}
