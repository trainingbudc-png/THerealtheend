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

// ฟังก์ชันเปิด-ปิด ช่องกรอกข้อมูลบุคคลภายนอก (แก้ไข ID ให้ตรงกับ index.html แล้ว)
function toggleOutsiderFields() {
    const isChecked = document.getElementById('is_outsider').checked;
    const infoWrap = document.getElementById('outsider_info_fields');
    const nameInput = document.getElementById('outsider_name');
    const phoneInput = document.getElementById('outsider_phone');

    if (infoWrap) {
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
}

function initializeLiff() {
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            if (liff.isLoggedIn()) {
                getUserLineProfile();
            }
        })
        .catch(err => console.error("LIFF Init Error", err));
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
            
            checkUserRoleAndAccess();
        })
        .catch(err => console.error("Error getting profile", err));
}

// ฟังก์ชันเข้าสู่ระบบด้วยบัญชีระบบ (Username / Password)
function handleNormalLogin(event) {
    event.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if(user === 'admin' && pass === 'admin') {
        currentUser.lineId = "SYSTEM_ADMIN";
        currentUser.name = "ผู้ดูแลระบบ (Admin)";
        currentUser.img = "https://via.placeholder.com/60";
        currentUser.role = "Admin";

        // เปลี่ยนหน้าจอแสดงผล
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-page').style.display = 'block';
        
        // อัปเดตหน้าโปรไฟล์
        document.getElementById('u-img').src = currentUser.img;
        document.getElementById('u-name').innerText = currentUser.name;
        document.getElementById('u-id').innerText = "บัญชีควบคุมระบบ";
        document.getElementById('u-role').innerText = "สถานะ: Admin 🛠️";
        document.getElementById('u-role').className = "user-role-badge admin-role";

        // แสดงผลแผงแอดมิน
        document.getElementById('admin-section').style.display = 'block';
        
        fetchAdminRequests();
        fetchUserRequests();
        alert("🔓 เข้าสู่ระบบในฐานะ Admin สำเร็จ!");
    } else {
        alert("❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง!");
    }
}

function checkUserRoleAndAccess() {
    fetch(`${BACKEND_URL}?action=checkRole&lineId=${currentUser.lineId}&name=${encodeURIComponent(currentUser.name)}`)
        .then(res => res.json())
        .then(data => {
            currentUser.role = data.role || "User";
            
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('dashboard-page').style.display = 'block';
            
            document.getElementById('u-img').src = currentUser.img;
            document.getElementById('u-name').innerText = currentUser.name;
            document.getElementById('u-id').innerText = "LINE ID: " + currentUser.lineId.substring(0,10) + "...";
            
            const roleBadge = document.getElementById('u-role');
            if(currentUser.role === 'Admin') {
                roleBadge.innerText = "สถานะ: Admin 🛠️";
                roleBadge.className = "user-role-badge admin-role";
                document.getElementById('admin-section').style.display = 'block';
                fetchAdminRequests();
            } else {
                roleBadge.innerText = "สถานะ: User 👤";
                roleBadge.className = "user-role-badge";
                document.getElementById('admin-section').style.display = 'none';
            }
            
            fetchUserRequests();
        })
        .catch(err => {
            console.error("Role Check Error:", err);
            // กรณีติดต่อ Server ไม่ได้ ให้เข้าหน้า User ไปก่อน
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('dashboard-page').style.display = 'block';
            fetchUserRequests();
        });
}

function submitBorrowRequest(event) {
    event.preventDefault();
    
    const btn = document.getElementById('btn-submit-req');
    const btnText = document.getElementById('btn-submit-text');
    
    btn.disabled = true;
    btnText.innerText = "กำลังส่งคำขอ...";

    const type = document.getElementById('device_type').value;
    const qty = document.getElementById('borrow_qty').value;
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    const detail = document.getElementById('borrow_detail').value;
    
    const isOutsider = document.getElementById('is_outsider').checked ? "ใช่" : "ไม่ใช่";
    const outsiderName = document.getElementById('outsider_name').value || "-";
    const outsiderPhone = document.getElementById('outsider_phone').value || "-";

    const formData = new URLSearchParams();
    formData.append('action', 'borrowDevice');
    formData.append('lineId', currentUser.lineId);
    formData.append('userName', currentUser.name);
    formData.append('deviceType', type);
    formData.append('qty', qty);
    formData.append('startDate', start);
    formData.append('endDate', end);
    formData.append('detail', detail);
    formData.append('isOutsider', isOutsider);
    formData.append('outsiderName', outsiderName);
    formData.append('outsiderPhone', outsiderPhone);

    fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("🎉 ส่งคำขอยืมอุปกรณ์สำเร็จแล้ว! กรุณารอแอดมินอนุมัติ");
            document.getElementById('borrowForm').reset();
            toggleOutsiderFields();
            fetchUserRequests();
            if(currentUser.role === 'Admin') fetchAdminRequests();
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + data.message);
        }
    })
    .catch(err => {
        console.error("Submit Error:", err);
        alert("❌ ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ต");
    })
    .finally(() => {
        btn.disabled = false;
        btnText.innerText = "ส่งคำขอเบิกอุปกรณ์";
    });
}

function fetchUserRequests() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">กำลังดึงประวัติของคุณ...</td></tr>`;

    fetch(`${BACKEND_URL}?action=getUserRequests&lineId=${currentUser.lineId}`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if(!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">ไม่พบประวัติการยืมอุปกรณ์ของคุณ</td></tr>`;
                return;
            }
            
            data.forEach(item => {
                let statusClass = "status-pending";
                if(item.status === "อนุมัติพร้อมรับเครื่อง") statusClass = "status-approved";
                if(item.status === "กำลังใช้งาน") statusClass = "status-using";
                if(item.status === "คืนสำเร็จ") statusClass = "status-returned";
                if(item.status === "ปฏิเสธคำขอ") statusClass = "status-rejected";

                let actionBtn = "";
                if(item.status === "อนุมัติพร้อมรับเครื่อง") {
                    actionBtn = `<br><button class="btn-table-action" style="background-color:#10b981; margin-top:5px;" onclick="openUserReceiveModal('${item.jobId}', '${item.assignedDevice || '-'}')">📦 ตรวจรับเครื่อง</button>`;
                }

                let outsiderBadge = "";
                if(item.isOutsider === "ใช่") {
                    outsiderBadge = `<div style="font-size:11px; color:#ea580c; background-color:#ffedd5; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:3px;">ยืมให้: ${item.outsiderName}</div>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.jobId}</strong></td>
                        <td>
                            <div style="font-weight:600;">${item.deviceType} (${item.qty} เครื่อง)</div>
                            <div style="font-size:12px; color:#64748b;">📅 ${item.startDate} ถึง ${item.endDate}</div>
                            ${outsiderBadge}
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            ${actionBtn}
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error("Fetch User Error:", err);
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">โหลดข้อมูลประวัติไม่สำเร็จ</td></tr>`;
        });
}

function fetchAdminRequests() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">กำลังโหลดข้อมูลคำขอทั้งหมด...</td></tr>`;

    fetch(`${BACKEND_URL}?action=getAllRequests`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if(!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">ไม่มีรายการคำขอในระบบ</td></tr>`;
                return;
            }

            data.forEach(item => {
                let statusClass = "status-pending";
                if(item.status === "อนุมัติพร้อมรับเครื่อง") statusClass = "status-approved";
                if(item.status === "กำลังใช้งาน") statusClass = "status-using";
                if(item.status === "คืนสำเร็จ") statusClass = "status-returned";
                if(item.status === "ปฏิเสธคำขอ") statusClass = "status-rejected";

                let actionHtml = "<span style='color:#94a3b8; font-size:12px;'>สิ้นสุดรายการ</span>";
                
                if(item.status === "รออนุมัติ") {
                    actionHtml = `
                        <div style="display:flex; gap:5px;">
                            <button class="btn-table-action" onclick="openChecklistModal('${item.jobId}', '${item.deviceType}', '${item.qty}')">อนุมัติ</button>
                            <button class="btn-table-action" style="background-color:#ef4444;" onclick="rejectRequest('${item.jobId}')">ปฏิเสธ</button>
                        </div>
                    `;
                } else if(item.status === "กำลังใช้งาน") {
                    actionHtml = `
                        <button class="btn-table-action" style="background-color:#6366f1;" onclick="processReturnItem('${item.jobId}')">🔄 รับคืนเครื่อง</button>
                    `;
                } else if(item.status === "อนุมัติพร้อมรับเครื่อง") {
                    actionHtml = `<span style="color:#0ea5e9; font-size:12px; font-weight:600;">รอผู้ยืมมาตรวจรับ</span>`;
                }

                let userDetail = `
                    <div style="font-weight:600;">${item.userName}</div>
                    <div style="font-size:11px; color:#94a3b8;">LINE ID: ${item.lineId.substring(0,6)}...</div>
                `;
                if(item.isOutsider === "ใช่") {
                    userDetail += `<div style="font-size:11px; color:#ea580c; font-weight:bold;">👤 คนนอก: ${item.outsiderName} (${item.outsiderPhone})</div>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.jobId}</strong></td>
                        <td>
                            <span style="font-weight:600; color:#334155;">${item.deviceType}</span> (${item.qty} เครื่อง)
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">📝 เหตุผล: ${item.detail}</div>
                            <div style="font-size:11px; color:#475569;">📅 ${item.startDate} ~ ${item.endDate}</div>
                        </td>
                        <td>${userDetail}</td>
                        <td>
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            ${item.assignedDevice ? `<div style="font-size:11px; font-weight:bold; color:#f59e0b; margin-top:3px;">เลขเครื่อง: ${item.assignedDevice}</div>` : ''}
                        </td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error("Fetch Admin Error:", err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">โหลดข้อมูลผู้ดูแลไม่สำเร็จ</td></tr>`;
        });
}

function rejectRequest(jobId) {
    const reason = prompt("❌ ระบุเหตุผลที่ไม่คำขออนุมัติ:");
    if(reason === null) return;
    if(!reason.trim()) { alert("ต้องระบุเหตุผลในการปฏิเสธครับ"); return; }

    fetch(`${BACKEND_URL}?action=rejectRequest&jobId=${jobId}&reason=${encodeURIComponent(reason)}`)
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("ปฏิเสธคำขอยืมอุปกรณ์เรียบร้อย");
                fetchAdminRequests();
                fetchUserRequests();
            } else {
                alert("เกิดข้อผิดพลาด: " + data.message);
            }
        });
}

function openChecklistModal(jobId, deviceType, qty) {
    document.getElementById('modal-job-id').value = jobId;
    document.getElementById('modal-display-jobid').innerText = jobId;
    document.getElementById('modal-display-type').innerText = deviceType;
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
    const deviceNo = document.getElementById('admin_assign_device').value.trim();

    if(!deviceNo) { alert("⚠️ กรุณาระบุหมายเลขเครื่องหรือรหัสครุภัณฑ์ก่อนครับ!"); return; }
    if(!document.getElementById('chk-adm-clear').checked ||
       !document.getElementById('chk-adm-body').checked ||
       !document.getElementById('chk-adm-power').checked ||
       !document.getElementById('chk-adm-access').checked) {
        alert("⚠️ กรุณาตรวจสอบและติ๊กถูก Checklist การเตรียมเครื่องให้ครบทุกข้อก่อนส่งมอบครับ!");
        return;
    }

    const btn = document.getElementById('btn-admin-confirm');
    btn.disabled = true;
    btn.innerText = "กำลังบันทึกอนุมัติ...";

    fetch(`${BACKEND_URL}?action=approveRequest&jobId=${jobId}&assignedDevice=${encodeURIComponent(deviceNo)}`)
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("🎯 อนุมัติคำขอสำเร็จ! ระบบปรับสถานะเป็น 'อนุมัติพร้อมรับเครื่อง' เพื่อรอผู้ยืมมาสแกนตรวจรับ");
                closeChecklistModal();
                fetchAdminRequests();
                fetchUserRequests();
            } else {
                alert("❌ เกิดข้อผิดพลาด: " + data.message);
            }
        })
        .catch(err => alert("ネットワークエラーが発生しました"))
        .finally(() => {
            btn.disabled = false;
            btn.innerText = "ยืนยันความพร้อมและ [ให้ยืม]";
        });
}

function openUserReceiveModal(jobId, devices) {
    document.getElementById('user-modal-job-id').value = jobId;
    document.getElementById('user-display-jobid').innerText = jobId;
    document.getElementById('user-display-devices').innerText = devices;
    
    document.getElementById('chk-us-body').checked = false;
    document.getElementById('chk-us-power').checked = false;
    document.getElementById('chk-us-access').checked = false;
    document.getElementById('user_receive_sign').value = "";

    document.getElementById('userReceiveModal').style.display = 'flex';
}

function closeUserReceiveModal() {
    document.getElementById('userReceiveModal').style.display = 'none';
}

function confirmUserReceive() {
    const jobId = document.getElementById('user-modal-job-id').value;
    const signature = document.getElementById('user_receive_sign').value.trim();

    if(!document.getElementById('chk-us-body').checked ||
       !document.getElementById('chk-us-power').checked ||
       !document.getElementById('chk-us-access').checked) {
        alert("⚠️ กรุณาติ๊กตรวจสอบสภาพอุปกรณ์ให้ครบทุกข้อก่อนกดยืนยันรับเครื่องครับ!");
        return;
    }
    if(!signature) { alert("⚠️ กรุณาพิมพ์ชื่อ-นามสกุลจริง เพื่อลงชื่อรับเครื่องแบบดิจิทัลก่อนครับ!"); return; }

    const btn = document.getElementById('btn-user-confirm');
    btn.disabled = true;
    btn.innerText = "กำลังบันทึกการรับเครื่อง...";

    fetch(`${BACKEND_URL}?action=confirmReceive&jobId=${jobId}&signature=${encodeURIComponent(signature)}`)
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert("🎉 ยืนยันการรับเครื่องเสร็จสมบูรณ์! ขอให้ใช้งานด้วยความระมัดระวัง ระบบได้เปลี่ยนสถานะเป็น 'กำลังใช้งาน' เรียบร้อยครับ");
            closeUserReceiveModal();
            
            if (currentUser.role === 'Admin') {
                fetchAdminRequests();
            } else {
                fetchUserRequests();
            }
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
                
                if (currentUser.role === 'Admin') {
                    fetchAdminRequests();
                } else {
                    fetchUserRequests();
                }
            } else {
                alert("❌ ทำรายการไม่สำเร็จ: " + data.message);
            }
        })
        .catch(err => {
            console.error("Return Error:", err);
            alert("❌ เกิดปัญหาในการส่งข้อมูลคืนอุปกรณ์");
        });
}