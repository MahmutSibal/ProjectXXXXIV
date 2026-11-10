import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ngrok ile dışarıya açarken tek tünel yeterlidir: tarayıcı yalnızca Vite sunucusunu
 * görür, /api istekleri buradan backend'e (localhost:5021) iletilir. Aksi hâlde uzaktaki
 * tarayıcı "localhost:5021"e bağlanmaya çalışır ve kendi makinesini arar.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Kütüphaneler ayrı dosyalara bölünür: tek dev dosya (500 KB üstü) yerine
        // tarayıcı bunları paralel indirir ve uygulama güncellense de önbellekte kalır.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'signalr', test: /node_modules[\\/]@microsoft[\\/]signalr[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
      onwarn(warning, defaultHandler) {
        // SignalR paketindeki /*#__PURE__*/ yorumu hatalı yerde; bizim kodumuzla ilgisi
        // yok ve çıktıyı etkilemiyor. Yalnızca node_modules kaynaklı olanı susturuyoruz.
        if (warning.code === 'INVALID_ANNOTATION' && /node_modules/.test(warning.id ?? warning.message)) return;
        defaultHandler(warning);
      },
    },
  },
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
