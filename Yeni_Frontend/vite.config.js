import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ngrok ile dışarıya açarken tek tünel yeterlidir: tarayıcı yalnızca Vite sunucusunu
 * görür, /api istekleri buradan backend'e (localhost:5021) iletilir. Aksi hâlde uzaktaki
 * tarayıcı "localhost:5021"e bağlanmaya çalışır ve kendi makinesini arar.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite, Host başlığını tanımadığı isteklerde "Blocked request" döner.
    // ngrok alan adı burada izinli olmazsa sayfa hiç açılmaz.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:5021',
        changeOrigin: true,
      },
      // Yüklenen görseller backend'in wwwroot'undan servis edilir.
      '/uploads': {
        target: 'http://localhost:5021',
        changeOrigin: true,
      },
      // SignalR canlı sipariş kanalı (WebSocket yükseltmesi gerekir).
      '/hubs': {
        target: 'http://localhost:5021',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
