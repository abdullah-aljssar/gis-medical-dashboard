// المطوّر: عبدالله زايد الجسار
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // متاح للمتصفح: المتصفح يفتح اتصال Socket.io مباشرة إلى السيرفر الحي،
    // لذا يجب تصدير الرابط للعميل (بادئة NEXT_PUBLIC_ ليصل إلى المتصفح).
    NEXT_PUBLIC_REALTIME_SERVER_URL:
      process.env.NEXT_PUBLIC_REALTIME_SERVER_URL ||
      process.env.REALTIME_SERVER_URL ||
      'http://localhost:4000',
  },
};

module.exports = nextConfig;
