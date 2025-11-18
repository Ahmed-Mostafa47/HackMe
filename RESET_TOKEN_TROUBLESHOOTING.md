# حل مشكلة "Invalid or expired reset token"

## 🔴 المشكلة:
عند النقر على رابط الـ reset من الإيميل، تحصل على الخطأ:
```
Invalid or expired reset token
```

## 🔍 الأسباب الممكنة:

### 1️⃣ انتهاء صلاحية الـ Token
الـ token ينتهي بعد **ساعة واحدة** من الإرسال.

**الحل:** أعد إرسال الرابط (اضغط Forgot Password مجدداً)

---

### 2️⃣ الـ Token استُخدم مسبقاً
بعد استخدام الـ token مرة واحدة، يُصبح معطّل.

**الحل:** أعد إرسال الرابط

---

### 3️⃣ مشكلة في hash الـ Token
قد تكون هناك مشكلة تقنية في كيفية حفظ أو قراءة الـ hash.

---

## ✅ الحل السريع - استخدم اداة الاختبار:

### الطريقة 1: استخدام Generate Test Token (الأسهل)

```bash
# 1. افتح هذا الرابط في المتصفح:
http://localhost/graduatoin_project/src/components/auth/generate_test_token.php

# 2. ستحصل على نتيجة JSON تحتوي على:
{
  "reset_link": "http://localhost:5173/reset-password?token=xxxxx...",
  ...
}

# 3. انسخ الـ reset_link وافتحها في المتصفح

# 4. أدخل كلمة مرور جديدة وانقر UPDATE_PASSWORD
```

---

## 🔧 الحل الدائم - تحسين الكود:

تم إضافة Debug Logging في `reset_password.php` لتسهيل تتبع المشاكل:

```php
// يتم تسجيل:
- الـ token hash المبحوث عنه
- عدد الصفوف المجدة
- معلومات التحقق من صلاحية الـ token
```

تحقق من الأخطاء في:
```
C:\xampp\php\logs\php_error_log
```

---

## 📝 خطوات الاختبار الكاملة:

### Step 1: التحقق من قاعدة البيانات
```bash
# تشغيل في Terminal:
& "C:\xampp\mysql\bin\mysql.exe" -u root ctf_platform -e "SELECT COUNT(*) FROM password_resets;"
```

### Step 2: استخدام أداة Generate Test Token
```
http://localhost/graduatoin_project/src/components/auth/generate_test_token.php
```

### Step 3: فتح الـ Reset Link
انسخ الـ `reset_link` من الـ JSON وافتحها

### Step 4: تغيير الباسوورد
أدخل باسوورد جديد واضغط UPDATE_PASSWORD

---

## 🚨 إذا استمرت المشكلة:

### 1. تحقق من أن الـ token لم ينتهِ:
```bash
& "C:\xampp\mysql\bin\mysql.exe" -u root ctf_platform -e "SELECT expires_at FROM password_resets WHERE reset_id = (SELECT MAX(reset_id) FROM password_resets);"
```

### 2. تحقق من أن الـ token لم يُستخدم:
```bash
& "C:\xampp\mysql\bin\mysql.exe" -u root ctf_platform -e "SELECT is_used FROM password_resets WHERE reset_id = (SELECT MAX(reset_id) FROM password_resets);"
```

### 3. أعد تحديث الصلاحية:
```bash
& "C:\xampp\mysql\bin\mysql.exe" -u root ctf_platform -e "UPDATE password_resets SET expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE reset_id = 4;"
```

---

## 📊 الملفات ذات الصلة:

1. **reset_password.php** - يتحقق من الـ token والباسوورد
2. **forgot_password.php** - ينشئ الـ token ويرسل الإيميل
3. **generate_test_token.php** - أداة اختبار لتوليد token جديد
4. **db_diagnostics.php** - أداة تشخيصية لفحص قاعدة البيانات

---

## 🎯 الخلاصة:

إذا حصلت على الخطأ:
1. اضغط "Forgot Password" مجدداً
2. استخدم `generate_test_token.php` للاختبار
3. تأكد من أن الـ token لم ينتهِ (ساعة واحدة)

كل شيء يجب أن يعمل الآن! ✅
