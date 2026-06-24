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

// ==========================================
// 2. LINE LIFF INITIALIZATION
// ==========================================
window.onload = function() {
    initializeLiff();
};

function initializeLiff() {
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            if (liff.isLoggedIn()) {
                getUserLineProfile();
            } else {
                document.getElementById('login-page').style.display = 'block';
                document.getElementById('dashboard-page').style.display = 'none';
            }
        })
        .catch((err) => {
            console.error("LIFF Initialization failed", err);
            alert("ไม่สามารถเชื่อมต่อระบบ LINE ได้ กรุณารีเฟรชอีกครั้ง");
        });
}

function handleLineLogin() {
    if (!liff.isLoggedIn()) {
        liff.login();
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
        .catch(err => console.error("Error getting profile:", err));
}

function checkUserRoleAndRender(lineId) {
    document.getElementById('u-role').innerText = "สถานะ: ⏳ กำลังตรวจสอบสิทธิ์...";
    
    fetch(`${BACKEND_URL}?action=checkRole&lineId=${lineId}`)
        .then(res => res.json())
        .then(data => {
            currentUser.role = data.role;
            
            document.getElementById('login-page').style.none = 'none';
            document.getElementById('dashboard-page').style.display = 'block';
            
            if (currentUser.role === 'Admin') {
                document.getElementById('u-role').innerText = "สถานะ: ผู้ดูแลระบบ (Admin) 🛠️";
                document.getElementById('u-role').style.color = "#ef4444";
                document.getElementById('user-section').style.display = 'block';
                document.getElementById('admin-section').style.display = 'block';
                fetchAdminRequests();
                fetchUserRequests();
            } else {
                document.getElementById('u-role').innerText = "สถานะ: ผู้ยืม (User) 👤";
                document.getElementById('u-role').style.color = "#0ea5e9";
                document.getElementById('user-section').style.display = 'block';
                document.getElementById('admin-section').style.none = 'none';
                fetchUserRequests();
            }
        })
        .catch(err => {
            console.error("Error checking role:", err);
            document.getElementById('u-role').innerText = "สถานะ: ผู้ใช้งานทั่วไป (User)";
            document.getElementById('user-section').style.display = 'block';
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('dashboard-page').style.display = 'block';
            fetchUserRequests();
        });
}

function handleLogout() {
    if (liff.isLoggedIn()) {
        liff.logout();
    }
    window.location.reload();
}

function handleNormalLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    // ✨ กำหนด Username และ Password ที่ต้องการล็อกอินตรงนี้ได้เลยครับ
    if (user === "admin" && pass === "admin1234") {
        
        currentUser.lineId = "MANUAL_ADMIN";
        currentUser.name = "ผู้ดูแลระบบ (Manual)";
        currentUser.img = "https://via.placeholder.com/60";
        
        document.getElementById('u-img').src = currentUser.img;
        document.getElementById('u-name').innerText = currentUser.name;
        document.getElementById('u-id').innerText = "ID ระบบ: " + currentUser.lineId;
        
        checkUserRoleAndRender(currentUser.lineId);
    } else {
        alert("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
    }
}

// ==========================================
// 3. FRONTEND INTERACTION LOGIC (เปิด/ปิด กล่องคนนอกยืม)
// ==========================================
function toggleOutsiderFields() {
    const isChecked = document.getElementById('is_outsider').checked;
    const wrap = document.getElementById('outsider-info-wrap');
    const nameInput = document.getElementById('outsider_name');
    const phoneInput = document.getElementById('outsider_phone');
    
    if (isChecked) {
        wrap.style.display = 'block';
        nameInput.setAttribute('required', 'required');
        phoneInput.setAttribute('required', 'required');
    } else {
        wrap.style.display = 'none';
        nameInput.removeAttribute('required');
        phoneInput.removeAttribute('required');
        nameInput.value = '';
        phoneInput.value = '';
    }
}

// ==========================================
// 4. BORROW REQUEST SUBMISSION (อัปเดตส่งข้อมูลคนนอกยืม)
// ==========================================
function submitBorrowRequest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-submit-text');
    btn.disabled = true;
    btn.innerText = "⏳ กำลังส่งคำขอลงระบบ...";

    const payload = {
        action: "submitRequest",
        lineId: currentUser.lineId,
        userName: currentUser.name,
        deviceType: document.getElementById('device_type').value,
        qty: document.getElementById('borrow_qty').value,
        startDate: document.getElementById('start_date').value,
        endDate: document.getElementById('end_date').value,
        detail: document.getElementById('borrow_detail').value,
        
        // ส่งค่าข้อมูลคนนอกยืมแยกเป็น 3 คีย์ชัดเจนให้หลังบ้านเอาไปบันทึก
        isOutsider: document.getElementById('is_outsider').checked ? "ใช่" : "ไม่ใช่",
        outsiderName: document.getElementById('is_outsider').checked ? document.getElementById('outsider_name').value : "",
        outsiderPhone: document.getElementById('is_outsider').checked ? document.getElementById('outsider_phone').value : ""
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("🎉 บันทึกคำขอยืมลงระบบเรียบร้อยแล้ว! โปรดรอแอดมินดำเนินการจัดเตรียมเครื่อง");
            document.getElementById('borrowForm').reset();
            
            // รีเซ็ตการซ่อนกล่องข้อความคนนอกยืมหลังจากกดบันทึกสำเร็จ
            toggleOutsiderFields();
            
            if (currentUser.role === 'Admin') fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + data.message);
        }
    })
    .catch(err => {
        console.error("Error submitting:", err);
        alert("❌ ไม่สามารถติดต่อเซิร์ฟเวอร์หลังบ้านได้");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = `<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" /></svg> ขอเบิก`;
    });
}

// ==========================================
// 5. USER SECTION LOGIC (List ที่ 2)
// ==========================================
function fetchUserRequests() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getUserRequests&lineId=${currentUser.lineId}`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:15px;">คุณยังไม่มีประวัติการขอยืมอุปกรณ์ในระบบ</td></tr>`;
                return;
            }

            data.forEach(row => {
                let statusBadge = "";
                let actionButton = "";

                if (row.status.includes("1. รอแอดมินเตรียมเครื่อง")) {
                    statusBadge = `<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">⏳ รอจัดเตรียม</span>`;
                    actionButton = `<span style="color:#94a3b8; font-size:12px;">รอแอดมินจ่ายเครื่อง</span>`;
                } else if (row.status.includes("2. รอผู้ยืมตรวจสอบและรับเครื่อง")) {
                    statusBadge = `<span style="background:#dbeafe; color:#2563eb; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">📦 เครื่องพร้อมส่งมอบ</span>`;
                    actionButton = `<button onclick="openUserChecklistModal('${row.jobId}', '${row.assignedDevices}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(16,185,129,0.2);">📝 ตรวจรับอุปกรณ์</button>`;
                } else if (row.status.includes("3. ผู้ยืมกำลังใช้งานอุปกรณ์")) {
                    statusBadge = `<span style="background:#dcfce7; color:#16a34a; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">📱 กำลังใช้งาน</span>`;
                    actionButton = `<span style="color:#16a34a; font-size:12px; font-weight:bold;">✓ ตรวจรับสำเร็จ</span>`;
                } else {
                    statusBadge = `<span style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:12px; font-size:12px;">${row.status}</span>`;
                    actionButton = `-`;
                }

                // แสดงป้ายข้อมูลคนนอกยืมในตารางประวัติผู้ยืม
                let outsiderTag = row.isOutsider === "ใช่" ? ` <br><small style="background:#ffedd5; color:#ea580c; padding:2px 4px; border-radius:4px; font-size:11px;">👤 คนนอก: ${row.outsiderName} (${row.outsiderPhone})</small>` : "";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:bold; color:#0ea5e9; text-align:center;">${row.jobId}</td>
                    <td style="text-align:left;">
                        <strong>${row.deviceType}</strong> (${row.qty} เครื่อง)${outsiderTag}
                        <br><small style="color:#64748b;">📅 ใช้: ${row.startDate} ถึง ${row.endDate}</small>
                    </td>
                    <td style="text-align:center;">${statusBadge}</td>
                    <td style="text-align:center;">${actionButton}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Error fetching user data:", err);
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; padding:15px;">❌ ไม่สามารถโหลดข้อมูลประวัติยืมได้</td></tr>`;
        });
}

function openUserChecklistModal(jobId, devices) {
    document.getElementById('us-md-job-id').innerText = jobId;
    document.getElementById('us-md-devices').innerText = devices || "รอยืนยันหมายเลขเครื่องจากแอดมิน";
    
    document.getElementById('chk-us-screen').checked = false;
    document.getElementById('chk-us-power').checked = false;
    document.getElementById('chk-us-access').checked = false;
    document.getElementById('user_receive_sign').value = "";
    
    document.getElementById('user-checklist-modal').style.display = 'flex';
}

function closeUserChecklistModal() {
    document.getElementById('user-checklist-modal').style.display = 'none';
}

function confirmUserReceive() {
    const jobId = document.getElementById('us-md-job-id').innerText;
    const chk1 = document.getElementById('chk-us-screen').checked;
    const chk2 = document.getElementById('chk-us-power').checked;
    const chk3 = document.getElementById('chk-us-access').checked;
    const signName = document.getElementById('user_receive_sign').value.trim();

    if(!chk1 || !chk2 || !chk3) {
        alert("⚠️ ขออภัยครับ! กรุณาตรวจสอบและติ๊กเลือกการยืนยันสภาพอุปกรณ์ให้ครบทั้ง 3 ข้อ เพื่อความปลอดภัยของท่านขณะใช้งาน");
        return;
    }

    if(!signName) {
        alert("⚠️ กรุณาพิมพ์ชื่อ-นามสกุลจริงของคุณ เพื่อใช้เป็นลายเซ็นดิจิทัลในการยืนยันสิทธิ์ตรวจรับอุปกรณ์ด้วยครับ");
        return;
    }

    const btn = document.getElementById('btn-user-confirm');
    btn.disabled = true;
    btn.innerText = "⏳ ระบบกำลังบันทึกใบตรวจรับ...";

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
            alert("✨ ยอดเยี่ยมมากครับคุณ! ระบบทำการบันทึกใบตรวจรับอุปกรณ์เรียบร้อยแล้ว สถานะของคุณถูกเปลี่ยนเป็น 'กำลังใช้งานอุปกรณ์' สำเร็จ 100%");
            closeUserChecklistModal();
            if (currentUser.role === 'Admin') fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ ไม่สามารถบันทึกได้เนื่องจาก: " + data.message);
        }
    })
    .catch(err => {
        console.error("Error on user confirm:", err);
        alert("❌ เกิดปัญหาในการส่งข้อมูลไปที่ Google Sheets กรุณาลองอีกครั้ง");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "ลงชื่อยืนยันการรับเครื่อง";
    });
}

// ==========================================
// 6. ADMIN SECTION LOGIC (List ที่ 1)
// ==========================================
let currentAdminActiveJob = null;

function fetchAdminRequests() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getAdminRequests`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#64748b;">ไม่มีคำขอยืมอุปกรณ์ค้างในระบบ</td></tr>`;
                return;
            }

            data.forEach(row => {
                let statusColor = "#64748b";
                let actionBtn = "";

                if (row.status.includes("1. รอแอดมินเตรียมเครื่อง")) {
                    statusColor = "#d97706";
                    actionBtn = `<button class="btn-action-process" onclick="openChecklistModal('${row.jobId}', '${row.userName}', '${row.deviceType}', ${row.qty})">🛠️ เตรียมเครื่อง</button>`;
                } else if (row.status.includes("2. รอผู้ยืมตรวจสอบและรับเครื่อง")) {
                    statusColor = "#2563eb";
                    actionBtn = `<span style="color:#2563eb; font-size:12px; font-weight:bold;">📦 รอผู้ยืมรับของ</span>`;
                } else if (row.status.includes("3. ผู้ยืมกำลังใช้งานอุปกรณ์")) {
                    statusColor = "#16a34a";
                    actionBtn = `<button class="btn-action-return" onclick="processReturnItem('${row.jobId}')" style="background-color:#6366f1;">🔄 รับเครื่องคืน</button>`;
                }

                // แสดงป้ายข้อมูลคนนอกยืมในตารางของแอดมิน
                let outsiderBadge = row.isOutsider === "ใช่" ? `<br><span style="background-color:#fee2e2; color:#ef4444; font-size:11px; padding:2px 4px; border-radius:4px; display:inline-block; margin-top:3px;">👤 คนนอก: ${row.outsiderName} (${row.outsiderPhone})</span>` : "";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:bold; text-align:center;">${row.jobId}</td>
                    <td style="text-align:left;"><strong>${row.deviceType}</strong> (${row.qty} ตัว)${outsiderBadge}</td>
                    <td style="font-size:12px; text-align:center;">${row.startDate} ถึง ${row.endDate}</td>
                    <td style="text-align:left; font-size:13px;">${row.userName}</td>
                    <td style="color:${statusColor}; font-weight:bold; font-size:13px; text-align:center;">${row.status}</td>
                    <td style="text-align:center;">${actionBtn}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Admin table load error:", err);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:15px;">❌ ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้</td></tr>`;
        });
}

function openChecklistModal(jobId, userName, deviceType, qty) {
    currentAdminActiveJob = { jobId, userName, deviceType, qty };
    
    document.getElementById('md-job-id').innerText = jobId;
    document.getElementById('md-admin-name').innerText = currentUser.name;
    document.getElementById('md-user-name').innerText = userName;

    const container = document.getElementById('dynamic-checklist-container');
    container.innerHTML = "";

    const listWrap = document.createElement('div');
    listWrap.style.margin = "15px 0";
    listWrap.style.display = "flex";
    listWrap.style.flexDirection = "column";
    listWrap.style.gap = "8px";
    listWrap.style.textAlign = "left";

    const items = [
        "เช็ดทำความสะอาดตัวเครื่องและหน้าจอเรียบร้อยแล้ว",
        "ตรวจสอบแล้วว่าไม่มีข้อมูลหรือบัญชี Apple ID เก่าค้างอยู่",
        "อุปกรณ์ชาร์จ สาย และหัวชาร์จสภาพสมบูรณ์พร้อมจ่าย",
        "ชาร์จแบตเตอรี่อุปกรณ์เต็มพร้อมใช้งาน"
    ];

    items.forEach((text, i) => {
        listWrap.innerHTML += `
            <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer;">
                <input type="checkbox" class="admin-chk-item" style="width:16px; height:16px;"> [ข้อ ${i+1}] ${text}
            </label>
        `;
    });
    container.appendChild(listWrap);

    const deviceSelectorWrap = document.createElement('div');
    deviceSelectorWrap.className = "input-group";
    deviceSelectorWrap.style.textAlign = "left";
    deviceSelectorWrap.style.marginTop = "15px";
    deviceSelectorWrap.innerHTML = `
        <label style="font-weight:bold; font-size:13px; margin-bottom:5px; display:block; color:#1e293b;">🏷️ ระบุรหัส/หมายเลขตัวเครื่อง (สำหรับจ่ายให้ผู้ยืม):</label>
        <input type="text" id="admin_assigned_device" placeholder="ตัวอย่าง: IPAD-001, PENCIL-002" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
    `;
    container.appendChild(deviceSelectorWrap);

    document.getElementById('checklist-modal').style.display = 'flex';
}

function closeChecklistModal() {
    document.getElementById('checklist-modal').style.display = 'none';
    currentAdminActiveJob = null;
}

function confirmAndGiveItem() {
    if (!currentAdminActiveJob) return;

    const checkboxes = document.querySelectorAll('.admin-chk-item');
    let allChecked = true;
    checkboxes.forEach(chk => { if(!chk.checked) allChecked = false; });

    if (!allChecked) {
        alert("⚠️ แจ้งเตือนแอดมิน: กรุณาตรวจสภาพเครื่องและติ๊กยืนยันความสมบูรณ์ให้ครบทั้ง 4 ข้อก่อนส่งมอบระบบครับ");
        return;
    }

    const deviceNum = document.getElementById('admin_assigned_device').value.trim();
    if (!deviceNum) {
        alert("⚠️ แจ้งเตือนแอดมิน: กรุณาระบุรหัสครุภัณฑ์หรือหมายเลขตัวเครื่องลงในช่องว่างด้วยครับ");
        return;
    }

    const btn = document.getElementById('btn-modal-confirm-id');
    btn.disabled = true;
    btn.innerText = "⏳ กำลังบันทึกสถานะ...";

    const payload = {
        action: "confirmAdminGive",
        jobId: currentAdminActiveJob.jobId,
        adminName: currentUser.name,
        assignedDevice: deviceNum
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("📦 สำเร็จ! แอดมินได้ทำการเช็กเตรียมอุปกรณ์เสร็จสิ้น ระบบส่งไม้ต่อให้ผู้ยืมตรวจรับในขั้นตอนถัดไปเรียบร้อยครับ");
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

function processReturnItem(jobId) {
    if(!confirm(`ยืนยันการรับคืนอุปกรณ์คำขอเลขที่ ${jobId} ใช่หรือไม่?`)) return;

    fetch(`${BACKEND_URL}?action=returnDevice&jobId=${jobId}&adminName=${encodeURIComponent(currentUser.name)}`)
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("🔄 รับคืนอุปกรณ์และเคลียร์ประวัติลง Google Sheets สำเร็จเรียบร้อยแล้ว!");
                fetchAdminRequests();
                fetchUserRequests();
            } else {
                alert("❌ เกิดข้อผิดพลาด: " + data.message);
            }
        })
        .catch(err => alert("❌ ไม่สามารถเชื่อมต่อกับระบบเซิร์ฟเวอร์ในการทำเรื่องคืนได้"));
}