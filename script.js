// Quản lý trạng thái dữ liệu (Lưu/Tải trực tiếp từ bộ nhớ trình duyệt LocalStorage)
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let myChart;

// Lấy các phần tử DOM cần thiết
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const transactionListEl = document.getElementById('transactionList');
const emptyStateEl = document.getElementById('emptyState');
const modalEl = document.getElementById('transactionModal');
const transactionForm = document.getElementById('transactionForm');

// Mở/Đóng ứng dụng Popup Form
document.getElementById('openModalBtn').addEventListener('click', () => modalEl.classList.add('open'));
document.getElementById('closeModalBtn').addEventListener('click', () => modalEl.classList.remove('open'));

// Đổi trạng thái hiển thị màu sắc của Tabs khi click chọn Thu/Chi
const tabLabels = document.querySelectorAll('.tab-label');
tabLabels.forEach(label => {
    label.addEventListener('click', () => {
        tabLabels.forEach(l => l.classList.remove('active'));
        label.classList.add('active');
    });
});

// Định dạng tiền tệ VND tự động đẹp mắt (Ví dụ: 50.000đ)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('𞋿', '');
}

// Hàm khởi tạo/cập nhật biểu đồ tròn phân tích (Chart.js)
function updateChart(income, expense) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (myChart) {
        myChart.destroy(); // Xóa biểu đồ cũ để tránh chồng chéo khi render lại
    }

    if (income === 0 && expense === 0) {
        // Nếu không có dữ liệu, hiển thị biểu đồ mặc định xám nhẹ
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chưa có dữ liệu'],
                datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        return;
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Thu nhập', 'Chi tiêu'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } }
                }
            },
            cutout: '70%' // Tạo độ mảnh khảnh, thanh lịch cho biểu đồ tròn
        }
    });
}

// Xử lý tính toán tổng tiền và xuất danh sách ra màn hình chính
function updateUI() {
    let incomeSum = 0;
    let expenseSum = 0;

    transactionListEl.innerHTML = '';

    if (transactions.length === 0) {
        transactionListEl.appendChild(emptyStateEl);
    } else {
        // Đảo ngược mảng để giao dịch mới nhất luôn ở trên đầu
        [...transactions].reverse().forEach(tx => {
            if (tx.type === 'income') incomeSum += tx.amount;
            else expenseSum += tx.amount;

            // Tạo các icon tương ứng cho từng danh mục
            let categoryIcon = '✨';
            if (tx.category === 'Lương') categoryIcon = '💰';
            if (tx.category === 'Ăn uống') categoryIcon = '🍔';
            if (tx.category === 'Di chuyển') categoryIcon = '🚗';
            if (tx.category === 'Mua sắm') categoryIcon = '🛍️';
            if (tx.category === 'Giải trí') categoryIcon = '🎬';

            const txItem = document.createElement('div');
            txItem.className = 'item-tx';
            txItem.innerHTML = `
                <div class="tx-info">
                    <div class="tx-icon">${categoryIcon}</div>
                    <div>
                        <p class="tx-title">${tx.category}</p>
                        <p class="tx-desc">${tx.description || 'Không có ghi chú'}</p>
                    </div>
                </div>
                <div class="tx-amount ${tx.type}">
                    ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                </div>
            `;
            transactionListEl.appendChild(txItem);
        });
    }

    // Gán dữ liệu hiển thị lên các thẻ
    totalIncomeEl.innerText = formatCurrency(incomeSum);
    totalExpenseEl.innerText = formatCurrency(expenseSum);
    
    const finalBalance = incomeSum - expenseSum;
    totalBalanceEl.innerText = formatCurrency(finalBalance);
    
    // Đổi màu số dư nếu bị âm tiền
    if (finalBalance < 0) totalBalanceEl.style.color = '#ef4444';
    else totalBalanceEl.style.color = '#ffffff';

    // Vẽ lại biểu đồ phân bổ
    updateChart(incomeSum, expenseSum);
}

// Sự kiện lắng nghe khi người dùng bấm Lưu Giao Dịch
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedType = document.querySelector('input[name="type"]:checked').value;
    const amountValue = parseFloat(document.getElementById('amount').value);
    const categoryValue = document.getElementById('category').value;
    const descriptionValue = document.getElementById('description').value;

    const newTransaction = {
        id: Date.now(),
        type: selectedType,
        amount: amountValue,
        category: categoryValue,
        description: descriptionValue
    };

    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // Reset lại form, đóng modal và đồng bộ UI
    transactionForm.reset();
    modalEl.classList.remove('open');
    updateUI();
});

// Chạy hàm hiển thị ban đầu khi tải trang
updateUI();
