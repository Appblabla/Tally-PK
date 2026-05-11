let items = [];

function renderTable() {
    const container = document.getElementById('tableContainer');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>ยังไม่มีรายการ</p>
                <p>เริ่มต้นด้วยการเพิ่มรายการใหม่ด้านบน</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>รายการ</th>
                    <th>Tally Marks</th>
                    <th>จำนวน</th>
                    <th>การจัดการ</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => `
                    <tr>
                        <td>${item.name}</td>
                        <td><span class="tally-marks">${getTallyMarks(item.count)}</span></td>
                        <td><span class="count">${item.count}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="increment(${index})">+</button>
                                <button onclick="decrement(${index})">-</button>
                                <button class="delete" onclick="deleteItem(${index})">🗑️ ลบ</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function getTallyMarks(count) {
    const groups = Math.floor(count / 5);
    const remainder = count % 5;
    
    let marks = '𝍸 '.repeat(groups);
    marks += '| '.repeat(remainder);
    
    return marks.trim() || '-';
}

function addItem() {
    const input = document.getElementById('itemInput');
    const name = input.value.trim();
    
    if (name === '') {
        alert('กรุณาใส่ชื่อรายการ');
        return;
    }
    
    if (items.some(item => item.name === name)) {
        alert('รายการนี้มีอยู่แล้ว');
        return;
    }
    
    items.push({ name, count: 0 });
    input.value = '';
    renderTable();
}

function increment(index) {
    items[index].count++;
    renderTable();
}

function decrement(index) {
    if (items[index].count > 0) {
        items[index].count--;
        renderTable();
    }
}

function deleteItem(index) {
    if (confirm(`ต้องการลบ "${items[index].name}" ใช่หรือไม่?`)) {
        items.splice(index, 1);
        renderTable();
    }
}

function resetAll() {
    if (confirm('ต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?')) {
        items = [];
        renderTable();
    }
}

document.getElementById('itemInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addItem();
    }
});

renderTable();
