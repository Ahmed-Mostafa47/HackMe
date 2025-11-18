# Password Reset System - Setup Guide

## ✅ نظام استعادة كلمة المرور - دليل الإعداد

هذا النظام يوفر:
- ✅ صفحة Forgot Password لإدخال الإيميل
- ✅ إرسال رابط التحقق إلى الإيميل
- ✅ صفحة Reset Password للتحقق من الرابط وتغيير الباسوورد
- ✅ توثيق آمن مع tokens و hashing

---

## 📋 الملفات التي تم إنشاؤها:

### 1️⃣ Backend Files (PHP):
- `forgot_password.php` - استقبال الإيميل وإرسال رابط التحقق
- `reset_password.php` - التحقق من التوكن وتحديث الباسوورد

### 2️⃣ Frontend Files (React):
- `ForgotPasswordPage.jsx` - تم تحديثها للربط بـ API
- `ResetPasswordPage.jsx` - صفحة جديدة لتغيير الباسوورد

### 3️⃣ Database:
- `add_password_resets_table.sql` - جدول جديد للـ tokens

---

## 🚀 خطوات الإعداد:

### الخطوة 1: إضافة جدول قاعدة البيانات

قم بتنفيذ هذا الأمر في phpMyAdmin أو MySQL:

```sql
CREATE TABLE IF NOT EXISTS password_resets (
  reset_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  is_used TINYINT(1) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_email (email),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### الخطوة 2: تحديث إعدادات البريد الإلكتروني

افتح `forgot_password.php` وغيّر هذه المتغيرات:

```php
// في السطر 67-71
$mail->Host = 'smtp.gmail.com'; // استخدم Gmail أو خادم SMTP آخر
$mail->Username = 'your-email@gmail.com'; // إيميلك
$mail->Password = 'your-app-password'; // كلمة مرور تطبيقك
```

**للـ Gmail:**
1. فعّل 2-Step Verification في حسابك
2. اذهب إلى: https://myaccount.google.com/apppasswords
3. اختر Mail و Windows Computer
4. انسخ كلمة المرور التي تظهر واستخدمها

### الخطوة 3: تحديث رابط الـ Reset في `forgot_password.php`

في السطر 85، غيّر الرابط:

```php
// غيّر هذا الرابط ليطابق URL موقعك
$reset_link = 'http://localhost:5173/reset-password?token=' . $reset_token;

// مثال للإنتاج:
$reset_link = 'https://yoursite.com/reset-password?token=' . $reset_token;
```

### الخطوة 4: ربط الصفحات في React

في `App.jsx` أو ملف التوجيه الرئيسي، أضف هذه الصفحات:

```jsx
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';

// في الـ Routes:
<Route path="/forgot-password" element={
  <ForgotPasswordPage 
    onBackToLogin={() => navigate('/login')}
    onResetSent={(email) => console.log('Reset email sent to:', email)}
  />
} />

<Route path="/reset-password" element={
  <ResetPasswordPage 
    token={new URLSearchParams(window.location.search).get('token')}
    onBackToLogin={() => navigate('/login')}
    onResetSuccess={() => navigate('/login')}
  />
} />
```

### الخطوة 5: إضافة رابط Forgot Password في LoginPage

في `LoginPage.jsx`، أضف زر يشير إلى صفحة Forgot Password:

```jsx
<button 
  onClick={() => navigate('/forgot-password')}
  className="text-blue-400 hover:text-blue-300 text-sm"
>
  Forgot Password?
</button>
```

---

## 🔒 نقاط الأمان المطبقة:

✅ **Token Hashing**: التوكنات تُحفظ كـ SHA-256 في DB
✅ **Token Expiration**: الرابط ينتهي بعد ساعة واحدة
✅ **One-time Use**: التوكن يُستخدم مرة واحدة فقط
✅ **Password Hashing**: كلمات المرور تُحفظ بـ bcrypt
✅ **CORS Headers**: حماية من طلبات غير مصرح بها
✅ **SQL Injection Protection**: استخدام Prepared Statements

---

## 🔧 المتغيرات المهمة:

### في `forgot_password.php`:
- `$reset_link` - الرابط الذي يُرسل للإيميل
- مدة انتهاء الصلاحية: **1 ساعة** (غيّرها في: `strtotime('+1 hour')`)

### في `reset_password.php`:
- التحقق من انتهاء صلاحية التوكن
- التحقق من عدم استخدام التوكن مسبقاً

---

## 📱 تدفق العملية:

1. ❌ المستخدم ينسى كلمة المرور
2. 📧 يدخل إيميله في Forgot Password
3. 💌 يحصل على رابط في إيميله
4. 🔗 ينقر الرابط
5. 🔐 يدخل كلمة مرور جديدة
6. ✅ الباسوورد محدّث، يستطيع تسجيل الدخول

---

## ⚠️ ملاحظات هامة:

### قبل النشر على الإنتاج:
```php
// في forgot_password.php - غيّر هذه البيانات:
- SMTP Host (Gmail, Sendgrid, etc.)
- SMTP Username و Password
- البريد الإلكتروني الذي يُرسل منه
- رابط الـ Reset ليطابق موقعك الفعلي
```

### اختبار محلي:
- استخدم Mailtrap.io لاختبار الإيميلات محلياً بدون حساب Gmail
- أو استخدم Gmail App Password كما موضح أعلاه

---

## 🧪 اختبار سريع:

1. افتح `/forgot-password`
2. أدخل إيميل محقق في النظام
3. يجب أن تحصل على رابط في الإيميل
4. انقر الرابط
5. أدخل كلمة مرور جديدة
6. يجب أن تستطيع تسجيل الدخول بالكلمة الجديدة

---

## 📧 مثال الإيميل الذي سيُرسل:

```
Subject: Password Reset Request - CTF Platform

Hello [username],

You have requested to reset your password. Click the button below to proceed:

[RESET PASSWORD BUTTON]

Or copy this link: https://yoursite.com/reset-password?token=xxxxx

Note: This link will expire in 1 hour.

If you didn't request this, please ignore this email.
```

---

## ✨ الميزات:

✅ واجهة حديثة وآمنة
✅ تحذيرات خطأ واضحة
✅ مؤشر قوة كلمة المرور
✅ تأكيد مطابقة كلمة المرور
✅ معايير كلمة المرور محددة
✅ رسائل نجاح وفشل واضحة

---

**تم الإعداد! 🎉**
