# راه‌اندازی ذخیره‌سازی مشترک

این سایت از API روی Vercel برای خواندن و نوشتن در Supabase استفاده می‌کند. کد دسترسی مشترک را به افرادی بدهید که باید اطلاعات را ببینند یا ویرایش کنند.

## ۱. ساخت دیتابیس Supabase

یک پروژه در [Supabase](https://supabase.com/) بسازید. در SQL Editor این دستور را اجرا کنید:

```sql
create table public.reading_progress (
  reader text primary key check (reader in ('mohammad', 'zahra')),
  days jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.reading_progress enable row level security;
```

از بخش Project Settings → API این دو مقدار را بردارید: Project URL و `service_role` key. کلید `service_role` را فقط در تنظیمات Vercel وارد کنید؛ آن را در فایل‌های سایت یا پیام عمومی قرار ندهید.

## ۲. تنظیم متغیرهای Vercel

در Vercel، پروژه را باز کنید و از Settings → Environment Variables این متغیرها را برای Production اضافه کنید:

| نام | مقدار |
| --- | --- |
| `SUPABASE_URL` | Project URL از Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید محرمانه `service_role` |
| `TRACKER_ACCESS_CODE` | یک رمز طولانی و تصادفی که بین کاربران مجاز به اشتراک می‌گذارید |

سپس پروژه را دوباره Deploy کنید. هر مرورگر در اولین بازدید رمز مشترک را می‌پرسد و آن را در همان دستگاه نگه می‌دارد. برای پاک‌کردن رمز ذخیره‌شده، کلید `daktash-tracker-access-code` را از localStorage مرورگر حذف کنید.

## رفتار همگام‌سازی

اطلاعات قبلی که در localStorage این دستگاه است، هنگام اولین اتصال در دیتابیس ثبت می‌شود، اگر برای آن خواننده هنوز داده‌ای در دیتابیس نباشد. تغییرات بعدی هر دو خواننده هر نیم‌ثانیه ذخیره می‌شوند و سایر مرورگرها حداکثر طی ۱۵ ثانیه به‌روز می‌شوند. localStorage نیز به‌عنوان نسخه پشتیبان همین دستگاه باقی می‌ماند.

اگر اطلاعات موجود در localStorage را قبلاً در دستگاه دیگری وارد کرده‌اید، ابتدا آن دستگاه را به نسخه جدید متصل کنید تا داده‌هایش به دیتابیس منتقل شود؛ مقدار دیتابیس در دستگاه‌های بعدی مرجع خواهد بود.
