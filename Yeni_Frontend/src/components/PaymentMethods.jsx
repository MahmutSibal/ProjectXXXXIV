import { useEffect, useState } from 'react';

import { platformSettingsApi } from '../api/platformSettings.js';
import usePaymentOptions from '../hooks/usePaymentOptions.js';
import IyzicoLogoBand from './IyzicoLogoBand.jsx';

import './PaymentMethods.css';

/**
 * Halka açık sitedeki paketlerin altında gösterilen "Ödeme Yöntemleri" bloğu.
 * Kredi kartı kutusu iyzico logoları açıkken, Havale/EFT kutusu yalnızca Süper Admin
 * havale/EFT'yi açıp bilgileri girdiyse görünür. İkisi de yoksa blok hiç çizilmez;
 * istek başarısız olursa sessizce gizlenir.
 */
function PaymentMethods() {
  const [bank, setBank] = useState(null);
  const { showIyzicoLogos } = usePaymentOptions();

  useEffect(() => {
    let isActive = true;

    platformSettingsApi
      .getPayment()
      .then((data) => {
        if (isActive && data?.isConfigured) {
          setBank(data);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  if (!showIyzicoLogos && !bank) return null;

  return (
    <div className="payment-methods">
      <h3 className="payment-methods__title">Ödeme Yöntemleri</h3>

      <div className="payment-methods__grid">
        {showIyzicoLogos && (
          <div className="payment-methods__item">
            <strong>Kredi Kartı</strong>

            <p>Kartınızla iyzico altyapısı üzerinden güvenle ödeyin.</p>

            <IyzicoLogoBand variant="colored" width={300} />
          </div>
        )}

        {bank && (
          <div className="payment-methods__item">
            <strong>Havale / EFT</strong>

            <dl>
              <div>
                <dt>Banka</dt>
                <dd>{bank.bankName}</dd>
              </div>

              <div>
                <dt>Hesap Sahibi</dt>
                <dd>{bank.accountHolder}</dd>
              </div>

              <div>
                <dt>IBAN</dt>
                <dd className="payment-methods__iban">{bank.iban}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentMethods;
