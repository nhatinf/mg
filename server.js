const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

setTimeout(function() {
  window.location.href = "views/index.html";
}, 3000); // 3000 mili-giây = 3 giây


// Cấu hình Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB (Thay đổi chuỗi kết nối phù hợp với máy của bạn)
mongoose.connect('mongodb+srv://nhatinf_db_user:canthoit@mggg.7fj6vxb.mongodb.net/?appName=mggg')
  .then(() => console.log('Đã kết nối MongoDB thành công!'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// --- 1. ĐỊNH NGHĨA SCHEMA CƠ SỞ DỮ LIỆU ---

// Schema Thành viên (Tài khoản)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Quản lý', 'Tổ Trưởng', 'Nhân viên'], default: 'Nhân viên' }
});
const User = mongoose.model('User', UserSchema);

// Schema Sản phẩm / Tiến độ sản xuất
const ProductSchema = new mongoose.Schema({
  productCode: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  type: { type: String, required: true },
  stages: [{ name: String, status: String }], // Các công đoạn sản xuất
  orderQuantity: { type: Number, default: 0 }, // Số lượng đơn hàng
  semiFinishedQty: { type: Number, default: 0 }, // Bán thành phẩm
  finishedQty: { type: Number, default: 0 } // Thành phẩm hoàn thành
});
const Product = mongoose.model('Product', ProductSchema);

// Tự động tạo tài khoản Admin mặc định ban đầu nếu chưa có
async function createDefaultAdmin() {
  const adminExist = await User.findOne({ role: 'Admin' });
  if (!adminExist) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'Admin'
    });
    console.log('Đã tạo tài khoản Admin mặc định: admin / admin123');
  }
}
createDefaultAdmin();

// --- 2. XỬ LÝ CÁC ĐƯỜNG DẪN / ROUTING ---

// Trả về giao diện chính
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại!' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Sai mật khẩu!' });

    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
});

// API Xử lý Quên mật khẩu (Đặt lại mật khẩu đơn giản)
app.post('/api/forgot-password', async (req, res) => {
  const { username, newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate({ username }, { password: hashedPassword });
    if (!user) return res.status(400).json({ success: false, message: 'Không tìm thấy tài khoản!' });
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý' });
  }
});

// --- API QUẢN LÝ THÀNH VIÊN (Dành cho ADMIN) ---
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword, role });
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Tên tài khoản đã tồn tại!' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- API QUẢN LÝ SẢN PHẨM & TIẾN ĐỘ (Dành cho các vai trò) ---
app.get('/api/products', async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

// Quản lý: Nhập đơn hàng & thêm công đoạn
app.post('/api/products/manager', async (req, res) => {
  const { productCode, productName, type, orderQuantity, stageName } = req.body;
  let product = await Product.findOne({ productCode });
  
  if (!product) {
    product = new Product({ productCode, productName, type, orderQuantity });
  } else {
    if (orderQuantity) product.orderQuantity = orderQuantity;
  }
  
  if (stageName) {
    product.stages.push({ name: stageName, status: 'Đang triển khai' });
  }
  
  await product.save();
  res.json({ success: true, product });
});

// Tổ trưởng & Nhân viên: Nhập bán thành phẩm và thành phẩm hoàn thành
app.post('/api/products/worker', async (req, res) => {
  const { productCode, semiFinishedQty, finishedQty } = req.body;
  const product = await Product.findOne({ productCode });
  if (!product) return res.status(404).json({ success: false, message: 'Không thấy sản phẩm' });

  if (semiFinishedQty) product.semiFinishedQty += parseInt(semiFinishedQty);
  if (finishedQty) product.finishedQty += parseInt(finishedQty);

  await product.save();
  res.json({ success: true, product });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại port http://localhost:${PORT}`);
});
