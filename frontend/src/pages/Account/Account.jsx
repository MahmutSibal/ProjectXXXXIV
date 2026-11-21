import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { profileApi } from '../../api/profile.js';
import { ApiError } from '../../api/client.js';
import { ROLES } from '../../api/auth.js';

const HOME_BY_ROLE = {
  [ROLES.RestaurantOwner]: '/admin',
  [ROLES.SuperAdmin]: '/super-admin',
  [ROLES.Kitchen]: '/kitchen',
  [ROLES.Waiter]: '/kitchen',
};

const ROLE_LABEL = {
  [ROLES.RestaurantOwner]: 'İşletme Sahibi',
  [ROLES.SuperAdmin]: 'Platform Yöneticisi',
  [ROLES.Kitchen]: 'Mutfak Personeli',
  [ROLES.Waiter]: 'Garson',
  [ROLES.Customer]: 'Müşteri',
};

const inputClass =
  'w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/15 placeholder:text-neutral-400';

function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Metin + yanında şifre göster/gizle düğmesi olan alan. */
function PasswordField({ value, onChange, placeholder, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-700"
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        tabIndex={-1}
      >
        <span className="material-symbols-outlined text-[20px]">{visible ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

function Feedback({ message }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
        message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{message.ok ? 'check_circle' : 'error'}</span>
      {message.text}
    </p>
  );
}

function Card({ icon, title, subtitle, danger, children }) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 sm:p-6 shadow-sm border ${danger ? 'border-red-200' : 'border-neutral-200'}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
            danger ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h2 className={`text-base font-semibold ${danger ? 'text-red-800' : 'text-neutral-900'}`}>{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Hesabım: şifre değiştirme, kampanya tercihi ve "Hesabımı sil" (KVKK m.11 —
 * kişisel verilerin silinmesini isteme hakkı). Her rol için ortak sayfa.
 */
export default function Account() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [marketing, setMarketing] = useState(Boolean(user?.marketingConsent));
  const [marketingMessage, setMarketingMessage] = useState(null);
  const [isSavingMarketing, setIsSavingMarketing] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.role === ROLES.RestaurantOwner;
  const isSuperAdmin = user?.role === ROLES.SuperAdmin;
  const home = HOME_BY_ROLE[user?.role] ?? '/';

  const handlePassword = async (event) => {
    event.preventDefault();
    if (passwords.next.length < 8) {
      setPasswordMessage({ ok: false, text: 'Yeni şifre en az 8 karakter olmalı.' });
      return;
    }
    setIsSavingPassword(true);
    setPasswordMessage(null);
    try {
      await profileApi.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setPasswordMessage({ ok: true, text: 'Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.' });
    } catch (err) {
      setPasswordMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Şifre değiştirilemedi.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleMarketing = async (event) => {
    event.preventDefault();
    setIsSavingMarketing(true);
    setMarketingMessage(null);
    try {
      await profileApi.updateMe({ name: user?.name ?? '', marketingConsent: marketing });
      await refresh?.();
      setMarketingMessage({ ok: true, text: marketing ? 'Kampanya e-postaları açıldı.' : 'Kampanya e-postaları kapatıldı.' });
    } catch (err) {
      setMarketingMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Tercih kaydedilemedi.' });
    } finally {
      setIsSavingMarketing(false);
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'SİL' && confirmText.trim().toUpperCase() !== 'SIL') {
      setDeleteMessage({ ok: false, text: 'Onaylamak için kutuya SİL yazın.' });
      return;
    }
    setIsDeleting(true);
    setDeleteMessage(null);
    try {
      const result = await profileApi.deleteMe(deletePassword);
      if (result?.deleted) {
        await logout();
        navigate('/', { replace: true, state: { message: result.message } });
        return;
      }
      setDeleteMessage({ ok: true, text: result?.message ?? 'Talebiniz alındı.' });
      setDeletePassword('');
      setConfirmText('');
    } catch (err) {
      setDeleteMessage({ ok: false, text: err instanceof ApiError ? err.message : 'İşlem yapılamadı.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl flex flex-col gap-5">
        <Link to={home} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 hover:underline">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Panele dön
        </Link>

        {/* Profil başlığı */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-sm">
          <div className="p-6 sm:p-7 flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xl font-bold">
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{user?.name || 'Hesabım'}</h1>
              <p className="text-sm text-emerald-100/90 truncate">{user?.email}</p>
              <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold tracking-wide">
                {ROLE_LABEL[user?.role] ?? 'Hesap'}
              </span>
            </div>
          </div>
        </section>

        {/* Şifre değiştir */}
        <Card icon="lock" title="Şifre değiştir" subtitle="Hesabınızı korumak için güçlü bir şifre kullanın.">
          <form autoComplete="off" onSubmit={handlePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-600">Mevcut şifre</label>
              <PasswordField
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                placeholder="Mevcut şifreniz"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-600">Yeni şifre</label>
              <PasswordField
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                placeholder="En az 8 karakter"
              />
            </div>
            <Feedback message={passwordMessage} />
            <button
              type="submit"
              disabled={isSavingPassword}
              className="self-start rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSavingPassword ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
            </button>
          </form>
        </Card>

        {/* Kampanya bildirimleri */}
        <Card icon="campaign" title="Kampanya bildirimleri" subtitle="İsteğe bağlı; istediğiniz zaman kapatabilirsiniz.">
          <form onSubmit={handleMarketing} className="flex flex-col gap-3">
            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 cursor-pointer hover:border-emerald-700/40">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-emerald-800"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span className="text-sm text-neutral-700">
                Kampanya ve duyuru e-postaları almak istiyorum.{' '}
                <Link to="/kampanya-bildirimleri" className="text-emerald-900 underline">
                  Bilgilendirme
                </Link>
              </span>
            </label>
            <Feedback message={marketingMessage} />
            <button
              type="submit"
              disabled={isSavingMarketing}
              className="self-start rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSavingMarketing ? 'Kaydediliyor…' : 'Tercihi Kaydet'}
            </button>
          </form>
        </Card>

        {/* Hesabı sil */}
        {!isSuperAdmin && (
          <Card
            icon="delete_forever"
            title="Hesabımı sil"
            subtitle={isOwner ? 'İşletme hesabınız için silme talebi oluşturulur.' : 'Bu işlem geri alınamaz.'}
            danger
          >
            <form autoComplete="off" onSubmit={handleDelete} className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600 leading-relaxed">
                {isOwner
                  ? 'Aboneliğiniz ve hakedişleriniz kapatıldıktan sonra kişisel verileriniz silinir. Fatura ve ödeme kayıtları yasal saklama süresi boyunca tutulur.'
                  : 'Adınız, e-postanız, telefonunuz ve adresiniz kalıcı olarak silinir; yorumlarınızda isminiz yerine “Silinmiş kullanıcı” görünür.'}
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600">Şifreniz</label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Şifreniz"
                  className={inputClass}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600">Onay</label>
                <input
                  type="text"
                  placeholder="Onaylamak için SİL yazın"
                  className={inputClass}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
              <Feedback message={deleteMessage} />
              <button
                type="submit"
                disabled={isDeleting || !deletePassword}
                className="self-start rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? 'İşleniyor…' : isOwner ? 'Silme Talebi Gönder' : 'Hesabımı Kalıcı Olarak Sil'}
              </button>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}
