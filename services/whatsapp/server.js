/**
 * Şükran App — WhatsApp doğrulama servisi (Baileys).
 *
 * NEDEN BAILEYS, NEDEN wppconnect DEĞİL:
 * wppconnect, WhatsApp Web'i gerçek bir Chromium penceresinde sürüyordu; tek başına
 * 400 MB–1 GB bellek ister. Barındırma planı 256 MB veriyor, oraya sığmıyordu.
 * Baileys ise WhatsApp'ın çoklu cihaz protokolünü doğrudan WebSocket üzerinden
 * konuşur — tarayıcı açmaz, bellek ihtiyacı onlarca MB'tır.
 *
 * HTTP SÖZLEŞMESİ DEĞİŞMEDİ: /status, /session/start, /session/logout, /send
 * uçları ve döndürdükleri alanlar aynıdır; backend tarafında hiçbir değişiklik
 * gerekmez.
 *
 * GÜVENLİK:
 * Bu servis WhatsApp hesabınız adına mesaj gönderebilir. Her istek paylaşılan bir
 * jeton ister. IIS arkasında çalışırken dışarıdan erişilebilir olur — jetonun
 * uzun ve gizli kalması TEK korumadır.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';

const BURASI = path.dirname(fileURLToPath(import.meta.url));

/**
 * Aynı klasördeki .env dosyasını okur. Bağımlılık eklememek için basit tutuldu;
 * zaten tanımlı olan ortam değişkenlerinin ÜZERİNE YAZMAZ, böylece sunucuda
 * gerçek ortam değişkenleri .env'e göre önceliklidir.
 */
function loadDotEnv() {
  const envPath = path.join(BURASI, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

// IIS (httpPlatformHandler) portu her başlatmada yeniden seçer. MonsterASP'ın
// örneği bunu PORT değişkenine bağlar; ikisini de okuyoruz ki yapılandırma
// hangi adı kullanırsa kullansın servis doğru portu dinlesin.
const PORT = Number(process.env.PORT ?? process.env.HTTP_PLATFORM_PORT ?? process.env.WHATSAPP_PORT ?? 5055);
const HOST = process.env.WHATSAPP_HOST ?? '127.0.0.1';
const AUTH_TOKEN = process.env.WHATSAPP_SERVICE_TOKEN ?? '';
const TOKENS_DIR = path.join(BURASI, process.env.WHATSAPP_SESSION_DIR ?? 'tokens');

if (!AUTH_TOKEN) {
  console.error(
    '[whatsapp] WHATSAPP_SERVICE_TOKEN tanımlı değil. Servis, kimliği doğrulanmamış ' +
      'isteklerle WhatsApp hesabınız adına mesaj göndermemek için başlatılmıyor.\n\n' +
      'Çözüm: bu klasörde .env dosyası oluşturun —\n' +
      '  WHATSAPP_SERVICE_TOKEN=<rastgele-uzun-deger>\n\n' +
      'AYNI değeri backend tarafında da tanımlayın:\n' +
      '  SUKRAN_WHATSAPP_TOKEN ortam değişkeni veya user-secrets WhatsApp:ServiceToken',
  );
  process.exit(1);
}

// Servis IIS arkasında internete açık çalışabildiği için jeton tek savunmadır.
// Kısa bir jeton kaba kuvvetle bulunabilir; baştan reddediyoruz.
if (AUTH_TOKEN.length < 24) {
  console.error(
    `[whatsapp] WHATSAPP_SERVICE_TOKEN çok kısa (${AUTH_TOKEN.length} karakter). ` +
      'En az 24 karakter olmalı: bu servis internete açık çalıştığında jeton, ' +
      'WhatsApp hattınızı koruyan tek engeldir.',
  );
  process.exit(1);
}

/** Oturum durumu. QR yalnızca eşleşme beklenirken doludur. */
const state = {
  status: 'disconnected', // disconnected | starting | qr | connected | failed
  qrDataUrl: null,
  phoneNumber: null,
  lastError: null,
  connectedAt: null,
};

let sock = null;
let starting = false;

/**
 * Oturumu kurar. Kayıtlı kimlik bilgisi varsa QR gerekmez.
 *
 * Baileys bağlantıyı sık sık yeniler; kapanma sebebine bakıp yeniden bağlanmak
 * normal işleyişin parçasıdır, hata değildir.
 */
async function startSession() {
  if (starting || sock) return;
  starting = true;
  state.status = 'starting';
  state.lastError = null;

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(TOKENS_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: authState,
      // Terminale QR basmıyoruz; QR yönetim panelinde gösterilecek.
      printQRInTerminal: false,
      // Telefondaki "Bağlı Cihazlar" listesinde bu adla görünür.
      browser: ['Sukran App', 'Chrome', '1.0.0'],
      // Sunucu tarafında geçmiş mesajları senkronlamaya gerek yok; kapatmak
      // hem belleği hem ilk bağlantı süresini belirgin biçimde düşürür.
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Panel bunu doğrudan <img src> olarak gösteriyor.
        state.status = 'qr';
        state.qrDataUrl = await QRCode.toDataURL(qr);
      }

      if (connection === 'open') {
        state.status = 'connected';
        state.qrDataUrl = null;
        state.lastError = null;
        state.connectedAt = new Date().toISOString();
        state.phoneNumber = sock?.user?.id?.split(':')[0]?.split('@')[0] ?? null;
        console.log('[whatsapp] bağlandı:', state.phoneNumber);
      }

      if (connection === 'close') {
        const kod = lastDisconnect?.error?.output?.statusCode;
        sock = null;

        if (kod === DisconnectReason.loggedOut) {
          // Telefondan çıkış yapılmış: kayıtlı kimlik artık geçersiz, yeni QR gerekir.
          state.status = 'disconnected';
          state.qrDataUrl = null;
          state.phoneNumber = null;
          state.connectedAt = null;
          temizleOturumDosyalari();
          console.log('[whatsapp] oturum kapatıldı (telefondan çıkış yapıldı)');
          return;
        }

        // Diğer tüm sebepler geçicidir (ör. 515 restartRequired eşleşmeden hemen
        // sonra beklenen bir davranıştır). Yeniden bağlanmak normal akıştır.
        state.status = 'starting';
        state.lastError = `Bağlantı koptu (kod ${kod ?? 'bilinmiyor'}), yeniden bağlanılıyor.`;
        console.log('[whatsapp]', state.lastError);
        setTimeout(() => { startSession().catch(() => {}); }, 2000);
      }
    });
  } catch (error) {
    state.status = 'failed';
    state.lastError = String(error?.message ?? error);
    sock = null;
    console.error('[whatsapp] oturum başlatılamadı:', error);
  } finally {
    starting = false;
  }
}

/** Kayıtlı oturum dosyalarını siler; sonraki başlatmada QR istenir. */
function temizleOturumDosyalari() {
  try {
    fs.rmSync(TOKENS_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error('[whatsapp] oturum dosyaları silinemedi:', error);
  }
}

const app = express();
app.use(express.json());

// Paylaşılan jeton kontrolü — bu servise yalnızca backend erişmeli.
app.use((request, response, next) => {
  if (request.headers['x-service-token'] !== AUTH_TOKEN) {
    return response.status(401).json({ error: 'unauthorized' });
  }
  return next();
});

app.get('/status', (_request, response) => {
  response.json({
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    phoneNumber: state.phoneNumber,
    lastError: state.lastError,
    connectedAt: state.connectedAt,
  });
});

/** Oturumu başlatır (gerekiyorsa QR üretir). Zaten bağlıysa bir şey yapmaz. */
app.post('/session/start', (_request, response) => {
  startSession().catch(() => {});
  response.json({ status: state.status });
});

/** Oturumu kapatır ve kayıtlı kimliği siler; yeni QR gerekir. */
app.post('/session/logout', async (_request, response) => {
  try {
    if (sock) await sock.logout();
  } catch (error) {
    console.error('[whatsapp] çıkış hatası:', error);
  } finally {
    sock = null;
    temizleOturumDosyalari();
    state.status = 'disconnected';
    state.qrDataUrl = null;
    state.phoneNumber = null;
    state.connectedAt = null;
    state.lastError = null;
  }

  response.json({ status: state.status });
});

app.post('/send', async (request, response) => {
  const { phone, message } = request.body ?? {};

  if (!phone || !message) {
    return response.status(400).json({ error: 'phone ve message zorunlu' });
  }

  if (!sock || state.status !== 'connected') {
    return response.status(503).json({ error: 'not_connected', status: state.status });
  }

  // WhatsApp kimliği: ülke kodu dahil yalnızca rakamlar.
  const digits = String(phone).replace(/\D/g, '');

  try {
    // Numara WhatsApp'ta kayıtlı değilse mesaj sessizce kaybolur; kullanıcı
    // boşuna kod bekler. Kontrol başarısız olursa GÖNDERİMİ ENGELLEMİYORUZ —
    // protokol değişikliklerinde bu sorgu bozulabiliyor ve doğrulamayı tamamen
    // durdurması, eksik bir uyarıdan daha kötü olurdu.
    try {
      const [kayit] = await sock.onWhatsApp(digits);
      if (kayit && kayit.exists === false) {
        return response.status(422).json({ error: 'number_not_on_whatsapp' });
      }
    } catch (checkError) {
      console.warn('[whatsapp] numara kontrolü yapılamadı, gönderime devam:',
        String(checkError?.message ?? checkError));
    }

    const result = await sock.sendMessage(`${digits}@s.whatsapp.net`, { text: message });
    return response.json({ ok: true, id: result?.key?.id ?? null });
  } catch (error) {
    console.error('[whatsapp] gönderim hatası:', error);
    return response.status(500).json({ error: 'send_failed', detail: String(error?.message ?? error) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[whatsapp] servis çalışıyor: http://${HOST}:${PORT}`);
  // Kayıtlı oturum varsa QR gerekmeden bağlanır.
  startSession().catch(() => {});
});
