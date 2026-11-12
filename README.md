# DarWeb — ASP.NET Core MVC (.NET 10)

## التشغيل في Visual Studio 2026
1. افتح `DarWeb.slnx` (أو `DarWeb/DarWeb.csproj` مباشرة).
2. انتظر استعادة الحزم (NuGet restore) ثم اضغط F5.

## قاعدة البيانات
1. شغّل `DarWeb/Database/dar_schema.sql` في SSMS لإنشاء قاعدة `DarDB`.
2. عدّل `ConnectionStrings:DarDb` في `DarWeb/appsettings.json` حسب خادمك.

## البنية
- `Views/Shared/_Layout.cshtml`: الهيدر والفوتر والـ toast في ملف واحد.
  - عنوان الصفحة: `ViewData["Title"]`، وصنف الـ body: `ViewData["BodyClass"]`.
  - الهيدر يعرض (تسجيل الدخول / إنشاء حساب) للزائر، وشريحة المستخدم عند وجود مستخدم مسجَّل.
  - ملفات `pages.css` / `pages.js` تُحمَّل في الصفحات التي تحتاجها فقط عبر `@section Styles/Scripts`.
- `Controllers/`: Home, Account, Properties, Owner, Tenant, Admin (كلها تعيد View حاليًا).
- `Data/`: مصنع اتصال ADO.NET و`UniversityRepository` كنموذج للنمط المعتمد.
- `wwwroot/`: css و js و assets كما هي (تم تغيير اسم الشعار إلى `dar-logo.png`).

## جدول الروابط
| الصفحة القديمة | المسار الجديد |
|---|---|
| index | /Home/Index (الجذر `/`) |
| login / register / forgot-password / reset-password | /Account/Login · Register · ForgotPassword · ResetPassword |
| search / property | /Properties/Search · Details |
| my-listings / add-listing / edit-listing / incoming-requests / owner-profile | /Owner/MyListings · AddListing · EditListing · IncomingRequests · Profile |
| my-requests / profile | /Tenant/MyRequests · Profile |
| admin-dashboard / admin-listings / admin-reviews / admin-users | /Admin/Dashboard · Listings · Reviews · Users |
