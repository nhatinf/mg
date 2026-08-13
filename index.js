const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// THAY THẾ CHUỖI NÀY BẰNG MONGODB ATLAS URI CỦA BẠN
const MONGODB_URI = 'mongodb+srv://nhatinf_db_user:123@cluster.mongodb.net/myDatabase?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Đã kết nối thành công với MongoDB Atlas (Online)!'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: 'Đăng ký vào Database Online thành công!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Tài khoản đã tồn tại hoặc lỗi kết nối.' });
    }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });

    res.json({ success: true, message: 'Đăng nhập Database Online thành công!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));
