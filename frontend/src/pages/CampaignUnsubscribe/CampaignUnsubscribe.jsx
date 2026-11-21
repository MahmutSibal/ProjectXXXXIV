import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { campaignsApi } from '../../api/campaigns.js';
import { ApiError } from '../../api/client.js';

/**
 * Kampanya e-postasındaki "abonelikten çık" bağlantısının açtığı sayfa.
 * Bağlantı imzalıdır; kullanıcı giriş yapmadan kampanya iznini kapatabilir.
 */
export default function CampaignUnsubscribe() {
  const [params] = useSearchParams();
  const userId = params.get('u') ?? '';
  const token = params.get('t') ?? '';
  const [state, setState] = useState({ status: 'idle', message: '' });

  const hasLink = Boolean(userId && token);

  async function unsubscribe() {
    setState({ status: 'saving', message: '' });
    try {
      await campaignsApi.unsubscribe(userId, token);
      setState({ status: 'done', message: '' });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof ApiError ? err.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      });
    }
  }

  return (
    <div className="bg-[#F8F9FA] px-4 py-8 sm:py-14">
      <article className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-[#DFE4E0] bg-white p-6 shadow-sm sm:p-9">
        <h1 className="text-2xl font-bold text-[#002819]">Kampanya bildirimleri</h1>

        {!hasLink && (
          <p className="mt-3 text-sm leading-7 text-[#404943]">
            Bağlantı eksik ya da geçersiz. E-postadaki bağlantıyı yeniden açın ya da hesabınızdaki
            “Hesabım” sayfasından tercihinizi değiştirin.
          </p>
        )}

        {hasLink && state.status !== 'done' && (
          <>
            <p className="mt-3 text-sm leading-7 text-[#404943]">
              Şükran App kampanya e-postalarını almaktan vazgeçmek için aşağıdaki düğmeye basın. Hesabınız ve
              işlemsel e-postalar (doğrulama kodu, şifre sıfırlama vb.) etkilenmez.
            </p>
            <button
              type="button"
              onClick={unsubscribe}
              disabled={state.status === 'saving'}
              className="mt-5 rounded-lg bg-[#002819] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {state.status === 'saving' ? 'İşleniyor…' : 'Kampanya e-postalarını almak istemiyorum'}
            </button>
            {state.status === 'error' && (
              <p role="alert" className="mt-3 text-sm text-red-700">{state.message}</p>
            )}
          </>
        )}

        {state.status === 'done' && (
          <p role="status" className="mt-3 text-sm leading-7 text-[#002819]">
            Tercihiniz kaydedildi; artık kampanya e-postası göndermeyeceğiz.
          </p>
        )}

        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#002819] underline">
          Ana sayfaya dön
        </Link>
      </article>
    </div>
  );
}
