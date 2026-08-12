const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Giả lập session đơn giản bằng bộ nhớ cục bộ biến toàn cục
let currentAdminUser = null;

mongoose.connect('mongodb+srv://nhatinf_db_user:canthoit@mggg.7fj6vxb.mongodb.net/?appName=mggg')
    .then(() => console.log('MongoDB connected!'));

const UserSchema = new mongoose.Schema({
    user: { type: String, unique: true },
    pass: String,
    role: { type: String, enum: ['Quản lý', 'Tổ Trưởng', 'Nhân viên', 'Admin'] },
    permissions: [String] // lưu các giá trị checkbox
});
const UserModel = mongoose.model('AdminUserSystem', UserSchema);

// Seed admin mặc định
async function seed() {
    if(await UserModel.countDocuments({ role: 'Admin' }) === 0) {
        await UserModel.create({ user: 'admin', pass: 'admin123', role: 'Admin', permissions: ['nhap_don_hang', 'them_cong_doan'] });
    }
}
seed();


// Thêm API xử lý đăng ký tài khoản Admin mới lưu vào MongoDB
app.post('/api/register-admin', async (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) {
        return res.json({ success: false, msg: 'Vui lòng điền đầy đủ tài khoản và mật khẩu!' });
    }
    try {
        const existing = await UserModel.findOne({ user });
        if (existing) {
            return res.json({ success: false, msg: 'Tên tài khoản này đã tồn tại trong hệ thống!' });
        }
        await UserModel.create({ 
            user, 
            pass, 
            role: 'Admin', 
            permissions: ['nhap_don_hang', 'them_cong_doan', 'nhap_ban_thanh_pham', 'nhap_thanh_pham'] 
        });
        res.json({ success: true, msg: 'Đăng ký tài khoản Admin thành công!' });
    } catch (e) {
        res.json({ success: false, msg: 'Lỗi hệ thống khi tạo tài khoản!' });
    }
});

// API Auth & Quên/Đổi pass
app.post('/api/login', async (req, res) => {
    const { user, pass } = req.body;
    const u = await UserModel.findOne({ user, pass });
    if(u) { currentAdminUser = u; res.json({ success: true }); }
    else res.json({ success: false, msg: 'Sai tài khoản hoặc mật khẩu!' });
});

app.post('/api/forgot', async (req, res) => {
    const u = await UserModel.findOne({ user: req.body.user });
    if(u) { u.pass = '123456'; await u.save(); res.json({ success: true, msg: 'Đã cấp mật khẩu mới: 123456' }); }
    else res.json({ success: false, msg: 'Không tìm thấy tài khoản!' });
});

app.post('/api/change-password', async (req, res) => {
    if(!currentAdminUser) return res.json({ success: false, msg: 'Chưa đăng nhập!' });
    const { oldPass, newPass } = req.body;
    const u = await UserModel.findById(currentAdminUser._id);
    if(u.pass === oldPass) {
        u.pass = newPass; await u.save();
        res.json({ success: true, msg: 'Đổi mật khẩu thành công!' });
    } else res.json({ success: false, msg: 'Mật khẩu cũ không đúng!' });
});

app.get('/api/logout', (req, res) => { currentAdminUser = null; res.json({ success: true }); });

// API CRUD Thành viên & Phân quyền Checkbox
app.get('/api/users', async (req, res) => { res.json(await UserModel.find({ role: { $ne: 'Admin' } })); });

app.post('/api/users', async (req, res) => {
    try {
        await UserModel.create(req.body);
        res.json({ success: true });
    } catch(e) { res.json({ success: false, msg: 'Tài khoản tồn tại!' }); }
});

app.put('/api/users/:id', async (req, res) => {
    await UserModel.findByIdAndUpdate(req.params.id, { role: req.body.role, permissions: req.body.permissions });
    res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
    await UserModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000/login.html'));
