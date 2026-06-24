const BACKEND_URL = CONFIG.BACKEND_URL;
const LIFF_ID = CONFIG.MY_LIFF_ID;

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
        .catch(err => console.error("LIFF Init Error:", err));
}

function handleLineLogin() {
    if (!liff.isLoggedIn()) {
        liff.login();
    } else {
        getUserLineProfile();
    }
}

function getUserLineProfile() {
    liff.getProfile().then(profile => {
        currentUser.lineId = profile.userId;
        currentUser.name = profile.displayName;
        currentUser.img = profile.pictureUrl || "https://via.placeholder.com/60";
        currentUser.role = "User";
        switchPageToDashboard();
    });
}

function handleNormalLogin(event) {
    event.preventDefault();
    const userInp = document.getElementById("username").value.trim();
    const passInp = document.getElementById("password").value.trim();

    if (userInp === "admin" && passInp === "admin") {
        currentUser.lineId = "ADMIN_BYPASS";
        currentUser.name = "ผู้ดูแลระบบ (Admin)";
        currentUser.img = "https://cdn-icons-png.flaticon.com/512/2206/2206368.png";
        currentUser.role = "Admin";
        switchPageToDashboard();
    } else {
        alert("❌ ชื่อผู้ใช้งานหรือรหัสผ่านระบบไม่ถูกต้องครับ");
    }
}

function switchPageToDashboard() {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("dashboard-page").style.display = "block";

    document.getElementById("u-img").src = currentUser.img;
    document.getElementById("u-name").innerText = currentUser.name;
    document.getElementById("u-id").innerText = currentUser.role === "Admin" ? "ระบบจัดการส่วนกลาง" : "LINE ID: " + currentUser.lineId;
    document.getElementById("u-role").innerText = currentUser.role === "Admin" ? "สถานะ: Admin 🛠️" : "สถานะ: User 👤";

    if (currentUser.role === "Admin") {
        document.getElementById("admin-section").style.display = "block";
        fetchAdminRequests();
    }
    fetchUserRequests();
}

function submitBorrowRequest(event) {
    event.preventDefault();
    const btn = document.getElementById("btn-submit-req");
    const isOutsider = document.getElementById('is_outsider').checked;
    
    const payload = {
        action: "submitRequest", 
        lineId: currentUser.lineId,
        userName: currentUser.name,
        deviceType: document.getElementById("device_type").value,
        qty: parseInt(document.getElementById("borrow_qty").value),
        startDate: document.getElementById("start_date").value,
        endDate: document.getElementById("end_date").value,
        detail: document.getElementById("borrow_detail").value,
        isOutsider: isOutsider ? "ใช่" : "ไม่ใช่",
        outsiderName: isOutsider ? document.getElementById("outsider_name").value : "",
        outsiderPhone: isOutsider ? document.getElementById("outsider_phone").value : ""
    };

    btn.disabled = true;
    btn.innerText = "⏳ กำลังส่งข้อมูล...";

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("🚀 ส่งคำขอสำเร็จ! รหัสงานคือ " + data.jobId + " กรุณารอแอดมินดำเนินการเตรียมเครื่องครับ");
            document.getElementById("borrowForm").reset();
            toggleOutsiderFields();
            if (currentUser.role === "Admin") fetchAdminRequests();
            fetchUserRequests();
        } else {
            alert("❌ ไม่สำเร็จ: " + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อหลังบ้าน");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "ส่งคำขอเบิกอุปกรณ์";
    });
}

function fetchUserRequests() {
    const tbody = document.getElementById("user-table-body");
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getUserRequests&lineId=${currentUser.lineId}`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">ยังไม่มีประวัติการยืมของคุณ</td></tr>`;
                return;
            }
            data.forEach(item => {
                let statusBadge = "";
                let actionBtn = "";

                if (item.status === "1. รอแอดมินเตรียมเครื่อง") {
                    statusBadge = `<span class="status-badge" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 4px; font-size:12px;">รอแอดมินเตรียมเครื่อง</span>`;
                } else if (item.status === "2. รอผู้ยืมตรวจสอบและรับเครื่อง") {
                    statusBadge = `<span class="status-badge" style="background:#dbeafe; color:#2563eb; padding: 4px 8px; border-radius: 4px; font-size:12px;">เตรียมเครื่องเสร็จแล้ว</span>`;
                    actionBtn = `<button class="btn-table-action" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-top:5px; font-size:12px;" onclick="openUserReceiveModal('${item.jobId}', '${item.assignedDevices}')">📥 ตรวจรับเครื่อง</button>`;
                } else if (item.status === "3. ผู้ยืมกำลังใช้งานอุปกรณ์") {
                    statusBadge = `<span class="status-badge" style="background:#dcfce7; color:#15803d; padding: 4px 8px; border-radius: 4px; font-size:12px;">กำลังใช้งาน</span>`;
                } else {
                    statusBadge = `<span class="status-badge" style="background:#f1f5f9; color:#64748b; padding: 4px 8px; border-radius: 4px; font-size:12px;">คืนสำเร็จ</span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.jobId}</strong></td>
                        <td>
                            <div style="font-weight:600;">${item.deviceType} (${item.qty} เครื่อง)</div>
                            <div style="font-size:11px; color:#64748b;">กำหนดคืน: ${item.endDate}</div>
                            ${item.assignedDevices ? `<div style="font-size:11px; color:#ea580c; font-weight:bold;">เลขเครื่อง: ${item.assignedDevices}</div>` : ''}
                        </td>
                        <td style="text-align:center;">${statusBadge}<br>${actionBtn}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">ดึงข้อมูลผิดพลาด</td></tr>`;
        });
}

function fetchAdminRequests() {
    const tbody = document.getElementById("admin-table-body");
    if (!tbody) return;

    fetch(`${BACKEND_URL}?action=getAdminRequests`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ไม่มีข้อมูลคำขอคงค้างในระบบ</td></tr>`;
                return;
            }
            data.forEach(item => {
                let statusStyle = "";
                let actionHtml = "";

                if (item.status === "1. รอแอดมินเตรียมเครื่อง") {
                    statusStyle = "background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:4px;";
                    actionHtml = `<button class="btn-table-action" style="background:#0284c7; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="openChecklistModal('${item.jobId}', '${item.deviceType}', '${item.qty}')">⚙️ เตรียมเครื่อง & อนุมัติ</button>`;
                } else if (item.status === "2. รอผู้ยืมตรวจสอบและรับเครื่อง") {
                    statusStyle = "background:#dbeafe; color:#2563eb; padding:4px 8px; border-radius:4px;";
                    actionHtml = `<span style="font-size:12px; color:#64748b;">รอผู้ยืมมาตรวจรับของ</span>`;
                } else if (item.status === "3. ผู้ยืมกำลังใช้งานอุปกรณ์") {
                    statusStyle = "background:#dcfce7; color:#15803d; padding:4px 8px; border-radius:4px;";
                    actionHtml = `<button class="btn-table-action" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="processReturnItem('${item.jobId}')">🔄 ยืนยันการรับคืน</button>`;
                } else {
                    statusStyle = "background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:4px;";
                    actionHtml = `<span style="font-size:12px; color:#10b981;">ปิดงานสำเร็จ</span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.jobId}</strong></td>
                        <td>${item.deviceType} (${item.qty} เครื่อง)<br><small style="color:#64748b;">${item.startDate} ถึง ${item.endDate}</small></td>
                        <td>${item.userName}<br>${item.isOutsider === 'ใช่' ? `<small style="color:#f97316;">(ยืมให้: ${item.outsiderName})</small>` : ''}</td>
                        <td><span class="status-badge" style="${statusStyle}">${item.status.split(". ")[1] || item.status}</span></td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            });
        });
}

function openChecklistModal(jobId, type, qty) {
    document.getElementById("modal-job-id").value = jobId;
    document.getElementById("modal-display-jobid").innerText = jobId;
    document.getElementById("modal-display-type").innerText = type;
    document.getElementById("modal-display-qty").innerText = qty;

    document.getElementById("admin_assign_device").value = "";
    document.getElementById("chk-adm-clear").checked = false;
    document.getElementById("chk-adm-body").checked = false;
    document.getElementById("chk-adm-power").checked = false;
    document.getElementById("chk-adm-access").checked = false;

    document.getElementById("checklistModal").style.display = "flex";
}

function closeChecklistModal() {
    document.getElementById("checklistModal").style.display = "none";
}

function confirmAdminGive() {
    const jobId = document.getElementById("modal-job-id").value;
    const assignedDevice = document.getElementById("admin_assign_device").value.trim();

    if (!assignedDevice) {
        alert("⚠️ กรุณาระบุรหัสเครื่องหรือหมายเลขครุภัณฑ์อุปกรณ์ก่อนอนุมัติครับ");
        return;
    }

    if (!document.getElementById("chk-adm-clear").checked ||
        !document.getElementById("chk-adm-body").checked ||
        !document.getElementById("chk-adm-power").checked ||
        !document.getElementById("chk-adm-access").checked) {
        alert("⚠️ เจ้าหน้าที่แอดมินต้องทำการตรวจสอบและติ๊กเลือก Checklist ให้ครบถ้วนทั้ง 4 ข้อก่อนครับ");
        return;
    }

    const btn = document.getElementById("btn-admin-confirm");
    btn.disabled = true;

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
        if (data.success) {
            alert("✅ จัดเตรียมอุปกรณ์สำเร็จ เปลี่ยนสถานะเป็น 'รอผู้ยืมตรวจสอบและรับเครื่อง' เรียบร้อยครับ");
            closeChecklistModal();
            if (currentUser.role === 'Admin') fetchAdminRequests();
            fetchUserRequests();
        }
    })
    .finally(() => { btn.disabled = false; });
}

function openUserReceiveModal(jobId, assignedDevice) {
    document.getElementById("user-modal-job-id").value = jobId;
    document.getElementById("user-display-jobid").innerText = jobId;
    document.getElementById("user-display-devices").innerText = assignedDevice;

    document.getElementById("chk-us-body").checked = false;
    document.getElementById("chk-us-power").checked = false;
    document.getElementById("chk-us-access").checked = false;
    document.getElementById("user_receive_sign").value = "";

    document.getElementById("userReceiveModal").style.display = "flex";
}

function closeUserReceiveModal() {
    document.getElementById("userReceiveModal").style.display = "none";
}

function confirmUserReceive() {
    const jobId = document.getElementById("user-modal-job-id").value;
    const userSign = document.getElementById("user_receive_sign").value.trim();

    if (!document.getElementById("chk-us-body").checked ||
        !document.getElementById("chk-us-power").checked ||
        !document.getElementById("chk-us-access").checked) {
        alert("⚠️ กรุณาตรวจสอบสภาพของที่เคาน์เตอร์และติ๊ก Checklist ให้ครบทั้ง 3 ข้อครับ");
        return;
    }

    if (!userSign) {
        alert("⚠️ กรุณาพิมพ์ชื่อจริงของคุณลงในช่องลายเซ็นดิจิทัลเพื่อทำการเซ็นรับของด้วยครับ");
        return;
    }

    const btn = document.getElementById("btn-user-confirm");
    btn.disabled = true;

    const payload = {
        action: "confirmUserReceive", 
        jobId: jobId,
        userSign: userSign
    };

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("🎉 ยืนยันการรับเครื่องสำเร็จ ระบบเปิดสถานะเป็น 'ผู้ยืมกำลังใช้งานอุปกรณ์' เรียบร้อยครับ");
            closeUserReceiveModal();
            if (currentUser.role === 'Admin') fetchAdminRequests();
            fetchUserRequests();
        }
    })
    .finally(() => { btn.disabled = false; });
}

function processReturnItem(jobId) {
    if (!confirm(`ยืนยันการบันทึกรับคืนอุปกรณ์สำหรับคำขอเลขที่ ${jobId} หรือไม่?`)) return;

    fetch(`${BACKEND_URL}?action=returnDevice&jobId=${jobId}&adminName=${encodeURIComponent(currentUser.name)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("🔄 บันทึกรับคืนอุปกรณ์เข้าคลังและเคลียร์อุปกรณ์เรียบร้อยครับ");
                if (currentUser.role === 'Admin') fetchAdminRequests();
                fetchUserRequests();
            }
        });
}