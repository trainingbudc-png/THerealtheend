// ==========================================
// 0. CONNECT WITH CONFIG FROM SETTINGS.JS
// ==========================================
const BACKEND_URL = CONFIG.BACKEND_URL;
const LIFF_ID = CONFIG.MY_LIFF_ID;

// ==========================================
// 1. CONFIG & GLOBAL VARIABLES
// ==========================================
let currentUser = {
    lineId: "",
    name: "",
    img: "",
    role: "User"
};

window.onload = function() {
    initializeLiff();
};

function toggleOutsiderFields() {
    const isChecked = document.getElementById('is_outsider').checked;
    const infoWrap = document.getElementById('outsider-info-wrap');
    const nameInput = document.getElementById('outsider_name');
    const phoneInput = document.getElementById('outsider_phone');

    if (isChecked) {
        infoWrap.style.display = 'block';
        nameInput.setAttribute('required', 'required');
        phoneInput.setAttribute('required', 'required');
    } else {
        infoWrap.style.display = 'none';
        nameInput.removeAttribute('required');
        phoneInput.removeAttribute('required');
        nameInput.value = '';
        phoneInput.value = '';
    }
}

// ⚠️ เช็กความปลอดภัยเพื่อให้หน้าล็อกอินพร้อมเสมอ
function initializeLiff() {
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            // บังคับให้ค้างไว้ที่หน้าล็อกอินหลักก่อนเสมอ
            document.getElementById('login-page').style.display = 'block';
            document.getElementById('dashboard-page').style.display = 'none';
        })
        .catch((err) => {
            console.error("LIFF Initialization failed", err);
            document.getElementById('login-page').style.display = 'block';
        });
}

function handleLineLogin() {
    if (!liff.isLoggedIn()) {
        liff.login();
    } else {
        getUserLineProfile();
    }
}

function getUserLineProfile() {
    liff.getProfile()
        .then(profile => {
            currentUser.lineId = profile.userId;
            currentUser.name = profile.displayName;
            currentUser.img = profile.pictureUrl || "https://via.placeholder.com/60";

            document.getElementById('u-img').src = currentUser.img;
            document.getElementById('u-name').innerText = currentUser.name;
            document.getElementById('u-id').innerText = "LINE ID: " + currentUser.lineId;

            checkUserRoleAndRender(currentUser.lineId);
        })
        .catch(err => {
            console.error("Error getting profile", err);
        });
}

function checkUserRoleAndRender(lineId) {
    fetch(`${BACKEND_URL}?action=checkRole&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            currentUser.role = data.role;
            renderDashboard();
        })
        .catch(err => {
            console.error("Check role failed, default to User", err);
            currentUser.role = "User";
            renderDashboard();
        });
}

// ==========================================
// 3. MANUAL / NORMAL LOGIN SYSTEM
// ==========================================
function handleNormalLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim(); // ล็อกตรงกับไอดีใน html แน่นอน
    
    if (user === "admin" && pass === "admin1234") { 
        currentUser.lineId = "MANUAL_ADMIN";
        currentUser.name = "ผู้ดูแลระบบ (Admin)";
        currentUser.img = "https://via.placeholder.com/60";
        currentUser.role = "Admin"; 
        
        document.getElementById('u-img').src = currentUser.img;
        document.getElementById('u-name').innerText = currentUser.name;
        document.getElementById('u-id').innerText = "สิทธิ์: ผู้ดูแลระบบสูงสุด";

        renderDashboard();
    } else {
        alert("❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
    }
}

function renderDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
    
    if (currentUser.role === 'Admin') {
        document.getElementById('u-role').innerText = "สถานะ: Admin 🛠️";
        document.getElementById('u-role').style.backgroundColor = "#e0f2fe";
        document.getElementById('u-role').style.color = "#0369a1";
        document.getElementById('admin-section').style.display = 'block';
        
        fetchAdminRequests();
        fetchUserRequests();
    } else {
        document.getElementById('u-role').innerText = "สถานะ: User 👤";
        document.getElementById('u-role').style.backgroundColor = "#f1f5f9";
        document.getElementById('u-role').style.color = "#475569";
        document.getElementById('admin-section').style.display = 'none';
        
        fetchUserRequests();
    }
}

// ==========================================
// 4. BORROW REQUEST FORM SUBMISSION
// ==========================================
function submitBorrowRequest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-submit-req');
    const btnText = document.getElementById('btn-submit-text');
    
    btn.disabled = true;
    btnText.innerText = "⏳ กำลังส่งบันทึกคำขอ...";

    const isOutsiderChecked = document.getElementById('is_outsider').checked;

    const payload = {
        action: "submitRequest",
        lineId: currentUser.lineId,
        userName: currentUser.name,
        deviceType: document.getElementById('device_type').value,
        qty: document.getElementById('borrow_qty').value,
        startDate: document.getElementById('start_date').value,
        endDate: document.getElementById('end_date').value,
        detail: document.getElementById('borrow_detail').value,
        isOutsider: isOutsiderChecked ? "ใช่" : "ไม่ใช่",
        outsiderName: isOutsiderChecked ? document.getElementById('outsider_name').value : "",
        outsiderPhone: isOutsiderChecked ? document.getElementById('outsider_phone').value : ""
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert(`🎉 บันทึกคำขอสำเร็จ!\nรหัสอ้างอิงคำขอของคุณคือ: ${data.jobId}`);
            document.getElementById('borrowForm').reset();
            toggleOutsiderFields();
            
            // เรียกทั้งสองตารางให้อัปเดตข้อมูลขึ้นมาใหม่พร้อมกันแบบเรียลไทม์ทันที
            fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + data.message);
        }
    })
    .catch(err => {
        console.error("Error submitting request:", err);
        alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้");
    })
    .finally(() => {
        btn.disabled = false;
        btnText.innerText = "ส่งคำขอเบิกอุปกรณ์";
    });
}

// ==========================================
// 5. FETCH DATA & RENDER TABLES
// ==========================================
function fetchUserRequests() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getUserRequests&lineId=${currentUser.lineId}`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if(data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">ยังไม่มีประวัติการส่งคำขอยืมอุปกรณ์</td></tr>`;
                return;
            }

            data.forEach(row => {
                let statusStyle = "";
                let actionBtn = "";

                if(row.status.startsWith("1")) statusStyle = "background-color: #fef3c7; color: #d97706;";
                else if(row.status.startsWith("2")) {
                    statusStyle = "background-color: #dbeafe; color: #2563eb; font-weight: bold;";
                    actionBtn = `<br><button class="btn-table-action" style="background:#10b981; margin-top:6px; padding:4px 8px; font-size:11px;" onclick="openUserReceiveModal('${row.jobId}', '${row.assignedDevices}')">👉 กดยืนยันรับเครื่อง</button>`;
                }
                else if(row.status.startsWith("3")) statusStyle = "background-color: #d1fae5; color: #059669;";
                else if(row.status.startsWith("4")) statusStyle = "background-color: #f1f5f9; color: #64748b; text-decoration: line-through;";

                let outsiderTag = row.isOutsider === "ใช่" ? `<br><small style="color: #ea580c; font-weight:bold;">👤 คนนอกยืม: ${row.outsiderName} (${row.outsiderPhone})</small>` : "";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${row.jobId}</strong></td>
                    <td>
                        <span style="font-weight:600; color:#334155;">${row.deviceType}</span> (${row.qty} เครื่อง)
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">📅 ${row.startDate} ถึง ${row.endDate}</div>
                        ${outsiderTag}
                    </td>
                    <td>
                        <span class="status-badge" style="${statusStyle}">${row.status}</span>
                        ${actionBtn}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Error loading user table:", err);
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444;">โหลดข้อมูลประวัติล้มเหลว</td></tr>`;
        });
}

function fetchAdminRequests() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getAdminRequests`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if(data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ไม่มีรายการค้างดำเนินการสำหรับแอดมิน 🎉</td></tr>`;
                return;
            }

            data.forEach(row => {
                let actionTd = "";
                if(row.status.startsWith("1")) {
                    actionTd = `<button class="btn-table-action" onclick="openChecklistModal('${row.jobId}', '${row.deviceType}', '${row.qty}')">⚙️ เตรียมอุปกรณ์</button>`;
                } else if(row.status.startsWith("2")) {
                    actionTd = `<span style="font-size:12px; color:#2563eb;">⏳ รอผู้ยืมกดรับเครื่อง</span>`;
                } else if(row.status.startsWith("3")) {
                    actionTd = `<button class="btn-table-action" style="background-color: #ef4444;" onclick="processReturnItem('${row.jobId}')">🔄 กดรับคืนเครื่อง</button>`;
                }

                let outsiderBadge = row.isOutsider === "ใช่" ? `<br><span style="background:#ffedd5; color:#ea580c; padding:2px 6px; border-radius:4px; font-size:11px; display:inline-block; margin-top:3px;">👤 คนนอก: ${row.outsiderName} (${row.outsiderPhone})</span>` : "";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${row.jobId}</strong></td>
                    <td><strong>${row.deviceType}</strong> (${row.qty} เครื่อง)${outsiderBadge}</td>
                    <td><span style="font-size:13px;">${row.userName}</span></td>
                    <td><span style="font-size:12px; color:#475569;">${row.status}</span></td>
                    <td>${actionTd}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Error loading admin table:", err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444;">โหลดข้อมูลแอดมินล้มเหลว</td></tr>`;
        });
}

// ==========================================
// 6. MODALS INTERACTION & WORKFLOWS
// ==========================================
function openChecklistModal(jobId, type, qty) {
    document.getElementById('modal-job-id').value = jobId;
    document.getElementById('modal-display-jobid').innerText = jobId;
    document.getElementById('modal-display-type').innerText = type;
    document.getElementById('modal-display-qty').innerText = qty;
    
    document.getElementById('admin_assign_device').value = "";
    document.getElementById('chk-adm-clear').checked = false;
    document.getElementById('chk-adm-body').checked = false;
    document.getElementById('chk-adm-power').checked = false;
    document.getElementById('chk-adm-access').checked = false;

    document.getElementById('checklistModal').style.display = 'flex';
}

function closeChecklistModal() {
    document.getElementById('checklistModal').style.display = 'none';
}

function confirmAdminGive() {
    const jobId = document.getElementById('modal-job-id').value;
    const assignedDevice = document.getElementById('admin_assign_device').value.trim();
    
    if(!assignedDevice) {
        alert("⚠️ โปรดระบุหมายเลขเครื่องหรือรหัสครุภัณฑ์เพื่อบันทึกก่อนให้ยืมครับ");
        return;
    }
    
    const c1 = document.getElementById('chk-adm-clear').checked;
    const c2 = document.getElementById('chk-adm-body').checked;
    const c3 = document.getElementById('chk-adm-power').checked;
    const c4 = document.getElementById('chk-adm-access').checked;

    if(!c1 || !c2 || !c3 || !c4) {
        alert("⚠️ แอดมินต้องทำการตรวจสอบสภาพเครื่องให้ครบถ้วนทั้ง 4 ขั้นตอนก่อนส่งมอบครับ");
        return;
    }

    const btn = document.getElementById('btn-admin-confirm');
    btn.disabled = true;
    btn.innerText = "⏳ กำลังบันทึกเข้าระบบ...";

    const payload = {
        action: "confirmAdminGive",
        jobId: jobId,
        assignedDevice: assignedDevice
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("📦 สำเร็จ! แอดมินเช็กเตรียมอุปกรณ์เสร็จสิ้น ระบบส่งไม้ต่อให้ผู้ยืมตรวจรับเรียบร้อยครับ");
            closeChecklistModal();
            fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ ไม่สามารถบันทึกได้เนื่องจาก: " + data.message);
        }
    })
    .catch(err => {
        console.error("Admin confirm error:", err);
        alert("❌ เกิดข้อผิดพลาดทางเทคนิค ไม่สามารถบันทึกข้อมูลลงชีตได้");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "ยืนยันความพร้อมและ [ให้ยืม]";
    });
}

function openUserReceiveModal(jobId, assignedDevices) {
    document.getElementById('user-modal-job-id').value = jobId;
    document.getElementById('user-display-jobid').innerText = jobId;
    document.getElementById('user-display-devices').innerText = assignedDevices || "ไม่มีระบุ";
    
    document.getElementById('user_receive_sign').value = "";
    document.getElementById('chk-us-body').checked = false;
    document.getElementById('chk-us-power').checked = false;
    document.getElementById('chk-us-access').checked = false;

    document.getElementById('userReceiveModal').style.display = 'flex';
}

function closeUserReceiveModal() {
    document.getElementById('userReceiveModal').style.display = 'none';
}

function confirmUserReceive() {
    const jobId = document.getElementById('user-modal-job-id').value;
    const signName = document.getElementById('user_receive_sign').value.trim();

    if(!signName) {
        alert("⚠️ โปรดิมพ์ชื่อ-นามสกุลจริงของคุณ เพื่อใช้เป็นหลักฐานการเซ็นรับเครื่องดิจิทัล");
        return;
    }

    const u1 = document.getElementById('chk-us-body').checked;
    const u2 = document.getElementById('chk-us-power').checked;
    const u3 = document.getElementById('chk-us-access').checked;

    if(!u1 || !u2 || !u3) {
        alert("⚠️ โปรดตรวจสอบร่วมกับเจ้าหน้าที่ และติ๊กยืนยันสภาพอุปกรณ์ให้ครบทุกช่องก่อนกดรับเครื่องครับ");
        return;
    }

    const btn = document.getElementById('btn-user-confirm');
    btn.disabled = true;
    btn.innerText = "⏳ กำลังบันทึกการตรวจรับ...";

    const payload = {
        action: "confirmUserReceive",
        jobId: jobId,
        userSign: signName
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("🎉 ยืนยันการรับเครื่องเสร็จสมบูรณ์! ระบบได้เปลี่ยนสถานะเป็น 'กำลังใช้งาน' เรียบร้อยครับ");
            closeUserReceiveModal();
            if (currentUser.role === 'Admin') fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ เกิดความผิดพลาดจากระบบ: " + data.message);
        }
    })
    .catch(err => {
        console.error("User receive error:", err);
        alert("❌ ไม่สามารถส่งข้อมูลยืนยันได้เนื่องจากปัญหาทางระบบเครือข่าย");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "บันทึกการตรวจรับและรับเครื่องไปใช้งาน";
    });
}

function processReturnItem(jobId) {
    if(!confirm(`ยืนยันการรับคืนอุปกรณ์คำขอเลขที่ ${jobId} ใช่หรือไม่?`)) return;

    fetch(`${BACKEND_URL}?action=returnDevice&jobId=${jobId}&adminName=${encodeURIComponent(currentUser.name)}`)
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("🔄 รับคืนอุปกรณ์และเคลียร์ประวัติลง Google Sheets สำเร็จเรียบร้อยครับ");
                fetchAdminRequests();
                fetchUserRequests();
            } else {
                alert("❌ ทำรายการไม่สำเร็จ: " + data.message);
            }
        })
        .catch(err => {
            console.error("Return device error:", err);
            alert("❌ ระบบขัดข้อง ไม่สามารถเรียกคำสั่งคืนอุปกรณ์ได้");
        });
}