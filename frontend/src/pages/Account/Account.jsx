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

const inputClass = 'w-full bg-white border border-neutral-300 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-emerald-800';

/**
 * Hesabım: şifre değiştirme ve "Hesabımı sil" (KVKK m.11 — kişisel verilerin
 * silinmesini isteme hakkı). Her rol için ortak sayfa.
 */
export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-lg flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Hesabım</h1>
          <Link to={home} className="text-sm text-emerald-900 hover:underline">Geri dön</Link>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm border border-neutral-200">
          <p className="text-sm text-neutral-600">{user?.name}</p>
          <p className="text-sm text-neutral-600">{user?.email}</p>
        </section>

        <form onSubmit={handlePassword} className="rounded-2xl bg-white p-5 shadow-sm border border-neutral-200 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Şifre değiştir</h2>
          <input type="password" autoComplete="current-password" placeholder="Mevcut şifre" className={inputClass}
            value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} />
          <input type="password" autoComplete="new-password" placeholder="Yeni şifre (en az 8 karakter)" className={inputClass}
            value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} />
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.ok ? 'text-emerald-800' : 'text-red-700'}`}>{passwordMessage.text}</p>
          )}
          <button type="submit" disabled={isSavingPassword}
            className="self-start rounded-lg bg-emerald-900 px-5 py-2.5 text-sm text-white disabled:opacity-50">
            {isSavingPassword ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
          </button>
        </form>

        {!isSuperAdmin && (
          <form onSubmit={handleDelete} className="rounded-2xl bg-white p-5 shadow-sm border border-red-200 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-red-800">Hesabımı sil</h2>
            {isOwner ? (
              <p className="text-sm text-neutral-700">
                İşletme hesabınız için silme talebi oluşturulur. Aboneliğiniz ve hakedişleriniz
                kapatıldıktan sonra kişisel verileriniz silinir. Fatura ve ödeme kayıtları yasal
                saklama süresi boyunca tutulur.
              </p>
            ) : (
              <p className="text-sm text-neutral-700">
                Adınız, e-postanız, telefonunuz ve adresiniz kalıcı olarak silinir; yorumlarınızda
                isminiz yerine &quot;Silinmiş kullanıcı&quot; görünür. Bu işlem geri alınamaz.
              </p>
            )}
            <input type="password" autoComplete="current-password" placeholder="Şifreniz" className={inputClass}
              value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            <input type="text" placeholder="Onaylamak için SİL yazın" className={inputClass}
              value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            {deleteMessage && (
              <p className={`text-sm ${deleteMessage.ok ? 'text-emerald-800' : 'text-red-700'}`}>{deleteMessage.text}</p>
            )}
            <button type="submit" disabled={isDeleting || !deletePassword}
              className="self-start rounded-lg bg-red-700 px-5 py-2.5 text-sm text-white disabled:opacity-50">
              {isDeleting ? 'İşleniyor...' : isOwner ? 'Silme Talebi Gönder' : 'Hesabımı Kalıcı Olarak Sil'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
