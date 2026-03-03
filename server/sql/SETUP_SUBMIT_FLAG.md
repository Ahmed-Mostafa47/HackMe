# إعداد الجداول لـ submit_flag API

## الترتيب المطلوب

1. **إنشاء Schema كامل** (إذا لم يكن موجوداً):
   ```
   mysql -u root -p ctf_platform < ctf_platform.sql
   ```
   أو استورد `ctf_platform.sql` من phpMyAdmin.

2. **إضافة Labs و Challenges و Flags**:
   ```
   mysql -u root -p ctf_platform < seed_challenges_testcases.sql
   ```

3. **التحقق** عبر المتصفح:
   ```
   http://localhost/HackMe/server/api/verify_submit_flag_tables.php
   ```
   أو لإصلاح البيانات تلقائياً:
   ```
   http://localhost/HackMe/server/api/verify_submit_flag_tables.php?fix=1
   ```

## الجداول المطلوبة

| الجدول         | الغرض                                |
|----------------|--------------------------------------|
| users          | المستخدمون (يجب وجود واحد على الأقل) |
| labs           | اللابات                              |
| lab_types      | أنواع اللابات                        |
| challenges     | التحديات مرتبطة باللابات             |
| testcases      | الفلاجات (secret_flag_plain/hash)     |
| lab_instances  | نسخ اللاب للمستخدم                   |
| submissions    | إرسال الفلاجات                       |
| leaderboard    | النقاط                              |
