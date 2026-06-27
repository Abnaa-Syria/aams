# AAMS — تسليمات العميل (Client Deliverables)

> **المرحلة 10 (تكاملات خارجية) مؤجلة** — البنود أدناه مطلوبة عند البدء في التكاملات فقط.

## قرارات محتوى (مطلوبة أثناء المراحل 3–4)

- [ ] قائمة أنواع الرخص الجديدة (#1)
- [ ] قائمة أنواع العهد الإضافية (#8)
- [x] **#15 لتر/100كم** — يُحدَّد من الأدمن في **الإعدادات → الوقود** (افتراضي 10 لتر/100كم + حد التجاوز المشبوه 25%). ليس قراراً من العميل.

## خرائط — المرحلة 10

- [ ] Google Maps API Key (Maps JavaScript / Places)
- [ ] تقييد المفتاح بالدومين + bundle ID للموبايل
- [ ] قرار: Google Maps SDK أم WebView في الموبايل

## إشعارات — المرحلة 10

- [ ] Expo: `EXPO_ACCESS_TOKEN` + EAS project
- [ ] FCM: Service Account JSON (HTTP v1)
- [ ] APNs (عبر Expo أو مباشرة)
- [ ] SMS: مزود + API keys + sender ID
- [ ] WhatsApp: Business API + templates معتمدة

## بنية تحتية — المرحلة 10

- [ ] `CORS_ORIGIN` للداشبورد الإنتاجي
- [ ] MySQL production + backups
- [ ] S3/MinIO (`STORAGE_DRIVER=s3`)
- [ ] Redis (Socket.io multi-instance)
- [ ] TLS + domain نهائي

## خارج النطاق

- دفع السائق + دليل تحويل (#10)
- حساب الراتب (#17)
