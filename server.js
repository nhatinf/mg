const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối Cơ sở dữ liệu MongoDB vĩnh viễn
mongoose.connect('mongodb://127.0.0.1:27017/admin_portal_db')
    .then(() => console.log('Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Định nghĩa Schema quản trị viên
const AdminSchema = new mongoose.Schema({
    user: { type: String, unique: true, required: true },
    pass: { type: String, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

// Khởi tạo tài khoản Admin mặc định nếu chưa có trong DB
async function seedAdmin() {
    const count = await Admin.countDocuments();
    if (count === 0) {
        await Admin.create({ user: 'admin', pass: 'admin123' });
        console.log('Tài khoản admin mặc định được tạo: admin / admin123');
    }
}
seedAdmin();

// API xử lý đăng nhập Backend
app.post('/api/admin/login', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const adminUser = await Admin.findOne({ user, pass });
        if (adminUser) {
            res.json({ success: true, msg: 'Đăng nhập thành công!', redirectUrl: '/dashboard.html' });
        } else {
            res.json({ success: false, msg: 'Tài khoản hoặc mật khẩu không chính xác!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Lỗi hệ thống server!' });
    }
});

// Chạy ứng dụng web server
app.listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000');
});
