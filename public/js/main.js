let currentUser = null;

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  
  if(data.success) {
    currentUser = data.user;
    setupDashboard();
  } else {
    alert(data.message);
  }
});

document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('forgot-username').value;
  const newPassword = document.getElementById('new-password').value;

  const res = await fetch('/api/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, newPassword })
  });
  const data = await res.json();
  alert(data.message);
  if(data.success) toggleForgotBox(false);
});

function toggleForgotBox(show) {
  document.getElementById('login-box').style.display = show ? 'none' : 'block';
  document.getElementById('forgot-box').style.display = show ? 'block' : 'none';
}

// Thiết lập trạng thái hiển thị giao diện tùy theo Phân Quyền tài khoản
function setupDashboard() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('current-user').innerText = currentUser.username;
  document.getElementById('current-role').innerText = currentUser.role;

  // Ẩn tất cả các khu vực chức năng trước
  document.querySelectorAll('.admin-only, .manager-only, .worker-only').forEach(el => el.style.display = 'none');

  // Mở tính năng tương ứng quyền
  if (currentUser.role === 'Admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    loadUsers();
  } else if (currentUser.role === 'Quản lý') {
    document.querySelectorAll('.manager-only').forEach(el => el.style.display = 'block');
  } else if (currentUser.role === 'Tổ Trưởng' || currentUser.role === 'Nhân viên') {
    document.querySelectorAll('.worker-only').forEach(el => el.style.display = 'block');
  }
}

function logout() {
  location.reload();
}

// --- LOGIC XỬ LÝ CỦA ADMIN ---
function updateBanner() {
  const newTitle = document.getElementById('banner-input').value;
  if(newTitle) document.getElementById('banner-text').innerText = newTitle;
}

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('new-user').value;
  const password = document.getElementById('new-pass').value;
  const role = document.getElementById('new-role').value;

  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });
  loadUsers();
  document.getElementById('add-user-form').reset();
});

async function loadUsers() {
  const res = await fetch('/api/users');
  const users = await res.json();
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '';
  users.forEach(user => {
    if(user.role === 'Admin') return; // Không cho sửa tài khoản Admin chính
    tbody.innerHTML += `
      <tr>
        <td>${user.username}</td>
        <td>
          <select onchange="changeRole('${user._id}', this.value)">
            <option value="Quản lý" ${user.role === 'Quản lý' ? 'selected' : ''}>Quản lý</option>
            <option value="Tổ Trưởng" ${user.role === 'Tổ Trưởng' ? 'selected' : ''}>Tổ Trưởng</option>
            <option value="Nhân viên" ${user.role === 'Nhân viên' ? 'selected' : ''}>Nhân viên</option>
          </select>
        </td>
        <td><button class="btn-danger" onclick="deleteUser('${user._id}')">Xóa</button></td>
      </tr>
    `;
  });
}

async function changeRole(id, role) {
  await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
}

async function deleteUser(id) {
  if(confirm('Bạn chắc chắn muốn xóa thành viên này?')) {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    loadUsers();
  }
}

// --- LOGIC XỬ LÝ CỦA QUẢN LÝ ---
document.getElementById('manager-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    productCode: document.getElementById('m-code').value,
    productName: document.getElementById('m-name').value,
    type: document.getElementById('m-type').value,
    orderQuantity: document.getElementById('m-qty').value,
    stageName: document.getElementById('m-stage').value
  };
  await fetch('/api/products/manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  loadProducts();
  document.getElementById('manager-form').reset();
});

// --- LOGIC XỬ LÝ CỦA TỔ TRƯỞNG & NHÂN VIÊN ---
document.getElementById('worker-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    productCode: document.getElementById('w-code').value,
    semiFinishedQty: document.getElementById('w-semi').value,
    finishedQty: document.getElementById('w-finished').value
  };
  const res = await fetch('/api/products/worker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(res.ok) {
    loadProducts();
    document.getElementById('worker-form').reset();
  } else {
    alert('Không tìm thấy mã sản phẩm này trong hệ thống!');
  }
});

// --- TẢI BẢNG THÀNH PHẨM TOÀN HỆ THỐNG ---
async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';
  
  products.forEach(p => {
    // Công thức tính số % tiến độ hiển thị trực quan dựa trên số đơn đặt hàng
    const percent = p.orderQuantity > 0 ? Math.min(Math.round((p.finishedQty / p.orderQuantity) * 100), 100) : 0;
    
    tbody.innerHTML += `
      <tr>
        <td><strong>${p.productCode}</strong></td>
        <td>${p.productName}</td>
        <td>${p.type}</td>
        <td>${p.finishedQty} (Bán TP: ${p.semiFinishedQty})</td>
        <td>${p.orderQuantity}</td>
        <td>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percent}%">${percent}%</div>
          </div>
        </td>
      </tr>
    `;
  });
}

// Mặc định luôn tải danh sách sản phẩm khi vừa vào trang chủ để mọi người xem chung
loadProducts();
