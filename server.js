const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Điều hướng để Frontend đọc được file style.css độc lập
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

// --- 1. KẾT NỐI CƠ SỞ DỮ LIỆU MONGODB ---npm install mongoose
const MONGO_URI = '115.79.24.85/32/nhatinf_db_user'; 
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('✅ Kết nối thành công tới cơ sở dữ liệu MongoDB!');
      seedInitialData();
  })
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- 2. ĐỊNH NGHĨA SCHEMAS (MÔ HÌNH DỮ LIỆU MONGODB) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['Quản lý', 'Tổ Trưởng', 'Nhân viên'] }
});
const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'Thành Phẩm' },
    completed: { type: Number, default: 0 },
    orderQty: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', ProductSchema);

const StageSchema = new mongoose.Schema({
    name: { type: String, required: true }
});
const Stage = mongoose.model('Stage', StageSchema);

// --- 3. ĐIỀU HƯỚNG TRANG CHỦ NGOÀI ĐẦU TRANG ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 4. HỆ THỐNG API CHỨC NĂNG ---

// Đăng Nhập
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, role: user.role, username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác!' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tạo tài khoản Admin mới bên ngoài
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const isExist = await User.findOne({ username });
        if (isExist) return res.json({ success: false, message: 'Tài khoản đã tồn tại trên MongoDB!' });

        const newUser = new User({ username, password, role });
        await newUser.save();
        res.json({ success: true, message: 'Khởi tạo tài khoản MongoDB thành công!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xử lý Quên mật khẩu
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'Tài khoản không chính xác!' });

        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Đặt lại mật khẩu thành công trên MongoDB!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lấy danh sách thành viên
app.get('/api/users', async (req, res) => {
    res.json(await User.find());
});

// Thêm thành viên mới
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const newUser = new User({ username, password, role });
        await newUser.save();
        res.json({ success: true, message: 'Đã thêm thành viên mới!' });
    } catch (err) { res.json({ success: false, message: 'Tên tài khoản bị trùng lặp!' }); }
});

// Sửa thông tin thành viên
app.put('/api/users/:id', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const updateData = { username, role };
        if(password) updateData.password = password; 

        await User.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true, message: 'Cập nhật thành viên thành công!' });
    } catch (err) { res.json({ success: false, message: 'Lỗi cập nhật dữ liệu!' }); }
});

// Xóa thành viên
app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa tài khoản thành công!' });
});

// Lấy danh sách sản phẩm và xử lý % tự động
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    const calculated = products.map(p => {
        const pct = p.orderQty > 0 ? Math.round((p.completed / p.orderQty) * 100) : 0;
        return {
            id: p.id, name: p.name, type: p.type,
            completed: p.completed, orderQty: p.orderQty,
            percentage: pct > 100 ? 100 : pct
        };
    });
    res.json(calculated);
});

// Quản lý nhập số lượng đơn đặt hàng
app.post('/api/products/order', async (req, res) => {
    const { id, orderQty } = req.body;
    await Product.findOneAndUpdate({ id }, { orderQty: parseInt(orderQty) });
    res.json({ success: true });
});

// Tổ trưởng/Nhân viên báo cáo cộng dồn số lượng thành phẩm nhập kho
app.post('/api/products/report', async (req, res) => {
    const { id, qtyCompleted } = req.body;
    await Product.findOneAndUpdate({ id }, { $inc: { completed: parseInt(qtyCompleted) } });
    res.json({ success: true });
});

// Quản lý và Thêm công đoạn sản xuất
app.get('/api/stages', async (req, res) => res.json(await Stage.find()));
app.post('/api/stages', async (req, res) => {
    if(req.body.name) {
        const newStage = new Stage({ name: req.body.name });
        await newStage.save();
    }
    res.json({ success: true });
});

// --- 5. HÀM KHỞI TẠO DỮ LIỆU MẪU KHI DATABASE TRỐNG ---
async function seedInitialData() {
    const userCount = await User.countDocuments();
    if(userCount === 0) {
        await User.insertMany([
            { username: 'quanly', password: '123', role: 'Quản lý' },
            { username: 'totruong', password: '123', role: 'Tổ Trưởng' },
            { username: 'nhanvien', password: '123', role: 'Nhân viên' }
        ]);
        console.log('🌱 Đã tạo tài khoản mẫu vào MongoDB (Mật khẩu: 123)');
    }
    const prodCount = await Product.countDocuments();
    if(prodCount === 0) {
        await Product.insertMany([
            { id: 'TP-01', name: 'Thép Cuộn Phi 6', type: 'Thành Phẩm', completed: 350, orderQty: 1000 },
            { id: 'TP-02', name: 'Ống Thép Tròn D60', type: 'Thành Phẩm', completed: 600, orderQty: 800 },
            { id: 'TP-03', name: 'Tôn Mạ Kẽm phẳng', type: 'Thành Phẩm', completed: 120, orderQty: 500 }
        ]);
        console.log('🌱 Đã tạo sản phẩm mẫu vào MongoDB');
    }
}

app.listen(PORT, () => console.log(`🚀 Hệ thống đang hoạt động tại địa chỉ: http://localhost:${PORT}`));
