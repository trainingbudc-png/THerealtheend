// app.js - ควบคุมการทำงาน Logic ทั้งหมดของระบบ
let currentAdminName = ''; 
let activeJobId = '';
let globalUserName = 'ผู้ใช้งานทั่วไป';
let globalLineId = 'LINE_NOT_LOGGED_IN';

// เริ่มต้นระบบตรวจสอบ LINE LIFF
async function startLiff() {
    try {
        if (typeof CONFIG === 'undefined' || !CONFIG.MY_LIFF_ID) {
            console.error('ไม่พบค่า CONFIG หรือ MY_LIFF_ID กรุณาตรวจสอบไฟล์ settings.js');
            return;
        }

        await liff.init({ liffId: CONFIG.MY_LIFF_ID });
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            globalUserName = profile.displayName;
            globalLineId = profile.userId;
            showDashboard(profile.displayName, profile.pictureUrl, profile.userId, 'user');
        }
    } catch (error) {
        console.error('LIFF Init Error:', error);
    }
}

// ฟังก์ชันสำหรับปุ่มกดเข้าสู่ระบบ LINE
function handleLineLogin() {
    if (!liff.isLoggedIn()) { 
        liff.login(); 
    }
}

// ล็อกอินฝั่งแอดมินด้วยรหัสผ่าน
function handleNormalLogin(event) {
    event.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (user === 'admin' && pass === '1234') {
        currentAdminName = 'แอดมินศูนย์แพทย์ฯ';
        showDashboard(currentAdminName, 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', 'SYSTEM_ADMIN_ACCOUNT', 'admin');
        loadAdminData(); 
    } else {
        alert('Username หรือ Password ไม่ถูกต้อง!');
    }
}

// สลับหน้าจอและแยกบทบาทเมนู
function showDashboard(name, imgUrl, userId, role) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
    
    document.getElementById('u-name').innerText = name;
    document.getElementById('u-img').src = imgUrl;
    document.getElementById('u-id').innerText = 'ID: ' + userId;
    
    if (role === 'admin') {
        document.getElementById('u-role').innerText = 'สถานะ: ผู้ดูแลระบบ (Admin)';
        document.getElementById('u-role').style.color = '#0ea5e9';
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('user-section').style.display = 'none';
    } else {
        document.getElementById('u-role').innerText = 'สถานะ: ผู้ยืม (User)';
        document.getElementById('u-role').style.color = '#10b981';
        document.getElementById('user-section').style.display = 'block';
        document.getElementById('admin-section').style.display = 'none';
    }
}

// [สเต็ปผู้ยืม] ยื่นคำขอส่งเข้า Google Sheets (อัปเดตพ่วงรายละเอียดคนนอกยืมแล้ว)
async function submitBorrowRequest(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-text');
    btn.innerText = '⏳ กำลังส่งคำขอ...';
    btn.disabled = true;

    const payload = {
        action: 'create_request',
        user_name: globalUserName,
        line_id: globalLineId,
        device_type: document.getElementById('device_type').value,
        qty: parseInt(document.getElementById('borrow_qty').value),
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        detail: document.getElementById('borrow_detail').value,
        is_outsider: document.getElementById('is_outsider').checked ? 'ใช่' : 'ไม่ใช่',
        
        // ✨ สเต็ป 2.2: พ่วงรายละเอียดคนนอกยืมส่งไปหลังบ้านด้วย
        outsider_detail: document.getElementById('outsider_detail').value 
    };

    try {
        const response = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if(resData.status === 'success') {
            alert(`🎉 ส่งคำขอสำเร็จแล้ว! เลขคำขอของคุณคือ: ${resData.jobId}`);
            document.getElementById('borrowForm').reset();
            toggleOutsiderField(); // ล้างหน้าจอซ่อนกล่องคนนอกกลับตามเดิม
        } else {
            alert('เกิดข้อผิดพลาด: ' + resData.message);
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้');
    } finally {
        btn.innerHTML = `<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" /></svg> ขอเบิก`;
        btn.disabled = false;
    }
}

// [สเต็ปแอดมิน] ดึงประวัติคำขอจาก Google Sheets มาจัดลงตาราง
async function loadAdminData() {
    const tbody = document.getElementById('admin-table-body');
    try {
        const response = await fetch(CONFIG.BACKEND_URL);
        const data = await response.json();
        
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ยังไม่มีรายการคำขอยืมในระบบ</td></tr>';
            return;
        }

        tbody.innerHTML = ''; 
        data.forEach(row => {
            const tr = document.createElement('tr');
            const sDate = row.Start_Date ? row.Start_Date.split('T')[0] : '-';
            const eDate = row.End_Date ? row.End_Date.split('T')[0] : '-';
            
            let actionBtn = '';
            let assignedText = row.Assigned_Devices ? `<div style="margin-top:8px; background: #f0fdf4; border-radius:6px; padding: 4px; font-weight:bold; color:#10b981; font-size:12px;">📌 เครื่องที่จ่าย: ${row.Assigned_Devices}</div>` : '';
            
            if (row.Status === "1. รอแอดมินเตรียมเครื่อง") {
                actionBtn = `<button class="btn-prepare" onclick="openChecklistModal('${row.Job_ID}', '${row.User_Name}', '${row.Device_Type}', ${row.Qty})">[เตรียมอุปกรณ์]</button>`;
            } else {
                actionBtn = `<span style="color:#64748b; font-size:12px;">แอดมินตรวจแล้ว</span>`;
            }

            // แสดงรายละเอียดคนนอกเพิ่มเติมในตารางแอดมิน (ถ้ามี)
            let outsiderInfo = '';
            if (row.Is_Outsider === 'ใช่' && row.Outsider_Detail) {
                outsiderInfo = `<br><span style="font-size:11px; background:#fff7ed; color:#ea580c; padding:2px 4px; border-radius:4px; display:inline-block; margin-top:2px;">📋 ข้อมูลคนนอก: ${row.Outsider_Detail}</span>`;
            }

            tr.innerHTML = `
                <td style="font-weight: bold; color:#0ea5e9;">${row.Job_ID}</td>
                <td>
                    <strong>${row.Device_Type} <span style="background:#0ea5e9; color:white; font-size:11px; padding:2px 6px; border-radius:4px;">x${row.Qty}</span></strong><br>
                    <span style="color:#64748b; font-size:12px;">รายละเอียด: ${row.Detail}</span><br>
                    <span style="font-size:11px; background:#f1f5f9; padding:2px 4px; border-radius:4px;">คนนอก: ${row.Is_Outsider}</span>
                    ${outsiderInfo}
                    ${assignedText}
                </td>
                <td>📅 ใช้: ${sDate}<br>🔄 คืน: ${eDate}</td>
                <td><strong>${row.User_Name}</strong></td>
                <td><span class="badge-status">${row.Status}</span></td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">โหลดข้อมูลล้มเหลว กรุณารีเฟรชหน้าจออีกครั้ง</td></tr>';
        console.error(err);
    }
}

// --- ฟังก์ชันเปิดหน้าเช็กลิสต์อุปกรณ์แยกรายชิ้น [ฝั่งแอดมิน] ---
function openChecklistModal(jobId, userName, deviceName, qty) {
    activeJobId = jobId;
    document.getElementById('md-job-id').innerText = jobId;
    document.getElementById('md-admin-name').innerText = currentAdminName || 'แอดมินระบบ';
    document.getElementById('md-user-name').innerText = userName;
    
    const container = document.getElementById('dynamic-checklist-container');
    container.innerHTML = ''; 
    
    for (let i = 1; i <= qty; i++) {
        const itemBox = document.createElement('div');
        itemBox.className = 'checklist-group';
        itemBox.style.borderLeft = '4px solid #0ea5e9';
        
        let optionsHtml = '';
        if (deviceName.includes('Pencil')) {
            optionsHtml = `
                <option value="Apple Pencil - แท่งหมายเลข 0${i}">Apple Pencil - แท่งหมายเลข 0${i}</option>
                <option value="Apple Pencil - แท่งหมายเลข 0${i+2}">Apple Pencil - แท่งหมายเลข 0${i+2}</option>
            `;
        } else {
            optionsHtml = `
                <option value="iPad Air - เครื่องหมายเลข 0${i}">iPad Air - เครื่องหมายเลข 0${i}</option>
                <option value="iPad Air - เครื่องหมายเลข 0${i+2}">iPad Air - เครื่องหมายเลข 0${i+2}</option>
            `;
        }

        itemBox.innerHTML = `
            <div style="font-weight: bold; color: #0f172a; font-size: 14px; margin-bottom: 8px;">
                📦 ชิ้นที่ ${i}: ของรายการ ${deviceName}
            </div>
            <div class="input-group" style="margin-bottom: 10px;">
                <label style="font-size:12px; color:#64748b;">ระบุเลขอุปกรณ์:</label>
                <select class="md-device-select-item" style="padding: 8px 12px; font-size:14px;">
                    ${optionsHtml}
                </select>
            </div>
            <div style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:8px;">รายการตรวจสอบความสะอาดข้อมูลก่อนให้ยืม:</div>
            <label class="checklist-item"><input type="checkbox" class="chk-clear-${i}"> Google Drive (Log out แล้ว)</label>
            <label class="checklist-item"><input type="checkbox" class="chk-clear-${i}"> Files (ลบไฟล์หมดแล้ว)</label>
            <label class="checklist-item"><input type="checkbox" class="chk-clear-${i}"> รูปภาพ (ไม่มีรูปค้าง)</label>
            <label class="checklist-item"><input type="checkbox" class="chk-clear-${i}"> Safari (ล้างประวัติการใช้งานแล้ว)</label>
        `;
        container.appendChild(itemBox);
    }
    
    container.setAttribute('data-qty', qty);
    document.getElementById('checklist-modal').style.display = 'flex';
}

function closeChecklistModal() {
    document.getElementById('checklist-modal').style.display = 'none';
}

// [List ที่ 1: แอดมินทำ] กดยืนยันการเช็กเครื่องทั้งหมดและอัปเดตลง Google Sheets
async function confirmAndGiveItem() {
    const container = document.getElementById('dynamic-checklist-container');
    const qty = parseInt(container.getAttribute('data-qty'));
    const btnConfirm = document.getElementById('btn-modal-confirm-id');
    
    for (let i = 1; i <= qty; i++) {
        const checkboxes = document.querySelectorAll(`.chk-clear-${i}`);
        let allChecked = true;
        checkboxes.forEach(chk => { if (!chk.checked) allChecked = false; });
        
        if (!allChecked) {
            alert(`❌ ไม่สามารถกดจ่ายได้! กรุณาตรวจเช็กและติ๊กยืนยันของ [ชิ้นที่ ${i}] ให้ครบทั้ง 4 หัวข้อครับ`);
            return;
        }
    }
    
    btnConfirm.innerText = '⏳ กำลังบันทึกข้อมูล...';
    btnConfirm.disabled = true;

    let chosenDevices = [];
    const selects = document.querySelectorAll('.md-device-select-item');
    selects.forEach(sel => chosenDevices.push(sel.value));
    
    const payload = {
        action: 'update_checklist',
        job_id: activeJobId,
        step: 1,
        admin_name: currentAdminName,
        assigned_devices: chosenDevices.join(', ')
    };

    try {
        const response = await fetch(CONFIG.BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        
        if (resData.status === 'success') {
            alert(`✅ บันทึก List ที่ 1 (แอดมินเตรียมเครื่อง) เรียบร้อย! ระบบจะขยับสถานะเป็นขั้นตอนที่ 2 ต่อไปครับ`);
            closeChecklistModal();
            loadAdminData(); 
        } else {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + resData.message);
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อบันทึกสถานะได้');
    } finally {
        btnConfirm.innerText = 'ยืนยันความพร้อมและ [ให้ยืม]';
        btnConfirm.disabled = false;
    }
}

function handleLogout() {
    if (liff.isLoggedIn()) { liff.logout(); }
    window.location.reload(); 
}

// ✨ สเต็ป 2.1: ฟังก์ชันเช็กการติ๊กคนนอกยืม ถ้าติ๊กให้โชว์ช่องกรอกรายละเอียด ถ้าเอาออกให้ซ่อนและล้างค่า
function toggleOutsiderField() {
    const isChecked = document.getElementById('is_outsider').checked;
    const wrap = document.getElementById('outsider-detail-wrap');
    const input = document.getElementById('outsider_detail');
    
    if (isChecked) {
        wrap.style.display = 'block';
        input.required = true; // บังคับกรอกข้อมูลเมื่อติ๊กถูก
    } else {
        wrap.style.display = 'none';
        input.required = false;
        input.value = ''; // ล้างข้อความข้างในออกหากผู้ใช้เปลี่ยนใจยกเลิกติ๊ก
    }
}

// รอให้โครงสร้างเอกสาร (DOM) โหลดเสร็จทั้งหมดก่อน จึงเริ่มทำงาน LIFF
document.addEventListener("DOMContentLoaded", function() {
    startLiff();
});