<div align="center">

# 🎬 MediaNet Ultra Engine

**محرك بث وإدارة وسائط خفيف وعالي الأداء (High-Performance Media CMS)**

[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](#)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)](#)
[![Node.js](https://img.shields.io/badge/Node.js-Express_Engine-339933?style=for-the-badge&logo=nodedotjs)](#)
[![Tailwind](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](#)
[![Architecture](https://img.shields.io/badge/Architecture-SPA-8A2BE2?style=for-the-badge)](#)

</div>

---

## 🚀 نظرة هندسية (System Overview)

**MediaNet Ultra** ليس مجرد منصة عرض، بل هو "محرك" (Engine) متكامل مبني لتقديم تجربة بث سينمائية سريعة. تم التخلي عن قواعد البيانات التقليدية (SQL) لصالح نظام **File-based JSON Storage** لضمان سرعة الاستجابة (Low Latency) وسهولة النقل (Portability)، مع معمارية SPA للواجهات الأمامية.

---

## 🧠 العقل المدبر للمشروع (Core Mechanics)

هذا النظام يعتمد على 3 ركائز برمجية قوية:

1. **Zero-Config Initialization:** السيرفر (`server.js`) مبرمج ليقوم بفحص وبناء بيئته بنفسه. عند التشغيل الأول، يقوم تلقائياً ببناء شجرة المجلدات (`uploads/posters`, `data/db.json`...) مما يمنع أي انهيار للسيرفر بسبب نقص الملفات.
2. **Dynamic Media Routing:** نظام رفع ملفات ذكي عبر `Multer` يقوم بتصنيف الملفات (صور، فيديو، ترجمة) وتوجيهها للمجلد الصحيح مع حماية المسارات الإدارية بـ `x-admin-token`.
3. **Subtitle Regex Engine:** محول ترجمات مدمج (`conv.html`) يعالج مشاكل الـ `UTF-8 BOM` ويستخدم تعبيرات نمطية (Regex) لتحويل تواقيت `SRT` إلى `VTT` لضمان توافقية 100% مع مشغل `Video.js`.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

| الطبقة (Layer) | التقنية (Technology) | الدور التقني (Purpose) |
| :--- | :--- | :--- |
| **Backend API** | `Node.js` + `Express` | معالجة الطلبات، حماية المسارات، وتقديم الملفات الثابتة. |
| **Database** | `JSON System` (NoSQL Logic) | تخزين البيانات الوصفية وهيكلة العلاقات (أفلام - ممثلين). |
| **Frontend UI** | `Vanilla JS` + `Tailwind` | معالجة الـ State، التنقل بدون تحميل (Router)، والتصميم المتجاوب. |
| **Media Player** | `Video.js` | تشغيل الفيديو التكيفي ودعم مسارات الترجمة (Tracks). |

---

## 📍 خارطة المسارات (Routing Matrix)

تم فصل واجهة العميل عن لوحة التحكم برمجياً لضمان الأمان وسرعة التحميل.

### 🌐 واجهة المستخدم (Client SPA Routes)
| المسار (Hash) | الوظيفة (Function) |
| :--- | :--- |
| `#/home` | جلب وعرض أحدث الأفلام، المسلسلات، والسلايدر التفاعلي. |
| `#/details?id={id}` | استدعاء بيانات المحتوى (فيديو، قصة، طاقم العمل) وتهيئتها في المشغل. |
| `404.html` | معالج أخطاء مخصص (Fallback UI) للروابط غير الصالحة. |

### 🔐 لوحة الإدارة (Admin API Endpoints)
| الـ Method | المسار (Endpoint) | الوظيفة (Action) |
| :---: | :--- | :--- |
| `GET` | `/api/data` | جلب كائن قاعدة البيانات بالكامل. |
| `POST` | `/api/upload` | استقبال الوسائط المتعددة وفلترتها. |
| `PUT` | `/api/series/:id` | تحديث بيانات المحتوى وإعادة كتابة ملف الـ JSON. |
| `POST` | `/api/login` | التحقق من المشرفين وتوليد التوكن (Auth Token). |

*(جميع مسارات الـ PUT و POST والـ DELETE محمية وتتطلب Headers مصادقة).*

---

## 📁 الهيكل التنظيمي (Directory Structure)

```text
Media-Server/
├── ⚙️ server.js             # نقطة الدخول ومحرك الـ API
├── 🎨 index.html            # الواجهة السينمائية للمستخدم
├── 🛡️ admin.html            # مركز التحكم (CMS)
├── 🔤 conv.html             # محرك تحويل الترجمات (SRT->VTT)
├── 📂 data/                 # قاعدة البيانات الحية (تُنشأ تلقائياً)
│   ├── db.json              # جداول (Movies, Series, Actors)
│   └── admins.json          # سجلات الدخول المشفرة
└── 📂 uploads/              # مستودع الوسائط (يُنظم تلقائياً)
    ├── posters/             # الأغلفة
    ├── actors/              # طاقم العمل
    └── episodes/            # الحلقات والترجمات
