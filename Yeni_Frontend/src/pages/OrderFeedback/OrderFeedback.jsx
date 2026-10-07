import { useEffect, useState } from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  customerComplaintsApi,
  customerMenuApi,
  customerReviewsApi,
} from '../../api/customer.js';

import './OrderFeedback.css';

const feedbackTypes = [
  {
    id: 'comment',
    label: 'Yorum',
    description:
      'Deneyiminizi bizimle paylaşın.',
    icon: 'chat_bubble',
  },
  {
    id: 'suggestion',
    label: 'Öneri',
    description:
      'Hizmetimizi geliştirmemize yardımcı olun.',
    icon: 'lightbulb',
  },
  {
    id: 'complaint',
    label: 'Şikâyet',
    description:
      'Yaşadığınız problemi bize bildirin.',
    icon: 'report',
  },
];

const complaintSubjects = [
  'Ürün kalitesi',
  'Sipariş gecikmesi',
  'Eksik veya yanlış sipariş',
  'Personel davranışı',
  'Ödeme sorunu',
  'Diğer',
];

const ratingInformation = {
  1: {
    label: 'Çok kötü',
    description:
      'Deneyiminiz beklentinizin oldukça altında kaldı.',
  },
  2: {
    label: 'Geliştirilmeli',
    description:
      'Daha iyi bir deneyim sunabilmemiz için geliştirmeler gerekli.',
  },
  3: {
    label: 'Orta',
    description:
      'Deneyiminiz genel olarak ortalama seviyedeydi.',
  },
  4: {
    label: 'İyi',
    description:
      'Deneyiminizden memnun kalmanıza sevindik.',
  },
  5: {
    label: 'Mükemmel',
    description:
      'Harika bir deneyim yaşamanıza çok sevindik.',
  },
};

export default function OrderFeedback() {
  const { restaurantId, tableNo, orderId } =
    useParams();

  const [rating, setRating] = useState(0);

  const [hoveredRating, setHoveredRating] =
    useState(0);

  const [feedbackType, setFeedbackType] =
    useState('comment');

  const [
    complaintSubject,
    setComplaintSubject,
  ] = useState(complaintSubjects[0]);

  const [customerName, setCustomerName] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [formError, setFormError] =
    useState('');

  const [restaurantName, setRestaurantName] =
    useState('');

  const [isSubmitted, setIsSubmitted] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const visibleRating =
    hoveredRating || rating;

  // Restoran adı şikâyet kaydında (SuperAdmin "İşletme Şikâyetleri") gösterilir;
  // QR menüyle aynı herkese açık uçtan okunur. Yüklenemezse gönderimde
  // yeniden denenir.
  useEffect(() => {
    let cancelled = false;

    customerMenuApi
      .getRestaurant(restaurantId)
      .then((data) => {
        if (!cancelled) setRestaurantName(data?.name ?? '');
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  // Yorum/öneri: ReviewsController { restaurantId, comment, rating } alır.
  // Şikâyet: ComplaintsController { restaurantName, userName, content,
  // restaurantId } alır (puan gerekmez) — yoruma karıştırılmaz.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError('');

    const isComplaint = feedbackType === 'complaint';

    if (!isComplaint && rating === 0) {
      setFormError(
        'Lütfen deneyiminizi yıldız vererek değerlendirin.',
      );

      return;
    }

    if (!message.trim()) {
      setFormError(
        'Lütfen yorum, öneri veya şikâyetinizi açıklayın.',
      );

      return;
    }

    setIsSubmitting(true);
    try {
      if (isComplaint) {
        let name = restaurantName;

        if (!name) {
          try {
            const restaurant =
              await customerMenuApi.getRestaurant(
                restaurantId,
              );
            name = restaurant?.name ?? '';
          } catch {
            // Ad alınamazsa aşağıdaki varsayılan kullanılır.
          }
        }

        await customerComplaintsApi.create({
          restaurantName: name || 'Bilinmeyen işletme',
          userName: customerName.trim() || 'Misafir',
          content: `[${complaintSubject}] ${message.trim()}`,
          restaurantId,
        });
      } else {
        const commentParts = [];

        if (feedbackType === 'suggestion') {
          commentParts.push('[Öneri]');
        }

        commentParts.push(message.trim());

        if (customerName.trim()) {
          commentParts.push(`— ${customerName.trim()}`);
        }

        await customerReviewsApi.create({
          restaurantId,
          comment: commentParts.join(' '),
          rating,
        });
      }
      setIsSubmitted(true);
    } catch (err) {
      setFormError(err.message ?? 'Geri bildirim gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="feedback-page">
        <section className="feedback-success">
          <div className="feedback-success__logo">
            <img
              src="/sukranapp.png"
              alt="Şükran App"
            />
          </div>

          <div className="feedback-success__icon">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              favorite
            </span>
          </div>

          <span className="feedback-eyebrow">
            Geri bildirim alındı
          </span>

          <h1>Teşekkür ederiz</h1>

          <p>
            Görüşünüz işletmeye iletildi. Paylaştığınız
            geri bildirim hizmet kalitesinin
            geliştirilmesine yardımcı olacaktır.
          </p>

          {feedbackType !== 'complaint' && (
            <div className="feedback-success__rating">
              {Array.from(
                {
                  length: 5,
                },
                (_, index) => {
                  const starValue = index + 1;

                  return (
                    <span
                      key={starValue}
                      className="material-symbols-outlined"
                      style={{
                        fontVariationSettings:
                          "'FILL' 1",
                      }}
                    >
                      star
                    </span>
                  );
                },
              )}
            </div>
          )}

          <div className="feedback-success__information">
            <div>
              <span>Sipariş</span>

              <strong>#{orderId}</strong>
            </div>

            <div>
              <span>Masa</span>

              <strong>
                Masa {tableNo}
              </strong>
            </div>

            <div>
              <span>
                {feedbackType === 'complaint'
                  ? 'Tür'
                  : 'Puanınız'}
              </span>

              <strong>
                {feedbackType === 'complaint'
                  ? 'Şikâyet'
                  : `${rating}/5`}
              </strong>
            </div>
          </div>

          <Link
            to={`/menu/${restaurantId}/${tableNo}`}
            className="feedback-success__button"
          >
            Menüye Dön
          </Link>

          <footer className="feedback-footer">
            <img
              src="/sukranapp.png"
              alt=""
              aria-hidden="true"
            />

            <span>
              Powered by{' '}
              <strong>Şükran App</strong>
            </span>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="feedback-page">
      <header className="feedback-header">
        <Link
          to={`/menu/${restaurantId}/${tableNo}`}
          aria-label="Menüye dön"
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_back
          </span>
        </Link>

        <div>
          <span>
            Masa {tableNo}
          </span>

          <h1>Deneyimi Değerlendir</h1>
        </div>

        <img
          src="/sukranapp.png"
          alt="Şükran App"
        />
      </header>

      <div className="feedback-content">
        <section className="feedback-intro">
          <span className="feedback-eyebrow">
            Görüşünüz bizim için değerli
          </span>

          <h2>Deneyiminiz nasıldı?</h2>

          <p>
            Değerlendirmeniz hem işletmenin hem de
            hizmet kalitesinin gelişmesine yardımcı
            olur.
          </p>

          <div className="feedback-order-badge">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              receipt_long
            </span>

            <span>Sipariş #{orderId}</span>
          </div>
        </section>

        <form
          className="feedback-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <fieldset className="feedback-rating">
            <legend>
              İşletmeyi değerlendirin
            </legend>

            <div
              className="feedback-stars"
              onMouseLeave={() =>
                setHoveredRating(0)
              }
            >
              {[1, 2, 3, 4, 5].map(
                (starValue) => (
                  <button
                    type="button"
                    key={starValue}
                    className={
                      starValue <= visibleRating
                        ? 'feedbackfeedback-star feedback-star--active'
                        : 'feedback-star'
                    }
                    onClick={() => {
                      setRating(starValue);
                      setFormError('');
                    }}
                    onMouseEnter={() =>
                      setHoveredRating(
                        starValue,
                      )
                    }
                    aria-label={`${starValue} yıldız`}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      star
                    </span>
                  </button>
                ),
              )}
            </div>

            <div className="feedback-rating__information">
              {visibleRating > 0 ? (
                <>
                  <strong>
                    {
                      ratingInformation[
                        visibleRating
                      ].label
                    }
                  </strong>

                  <span>
                    {
                      ratingInformation[
                        visibleRating
                      ].description
                    }
                  </span>
                </>
              ) : (
                <span>
                  Değerlendirmek için yıldızlara
                  dokunun.
                </span>
              )}
            </div>
          </fieldset>

          <fieldset className="feedback-type">
            <legend>
              Geri bildirim türü
            </legend>

            <div className="feedback-type__grid">
              {feedbackTypes.map((type) => (
                <label
                  key={type.id}
                  className={
                    feedbackType === type.id
                      ? 'feedback-type-card feedback-type-card--active'
                      : 'feedback-type-card'
                  }
                >
                  <input
                    type="radio"
                    name="feedbackType"
                    value={type.id}
                    checked={
                      feedbackType === type.id
                    }
                    onChange={() =>
                      setFeedbackType(type.id)
                    }
                  />

                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    {type.icon}
                  </span>

                  <strong>{type.label}</strong>

                  <small>
                    {type.description}
                  </small>
                </label>
              ))}
            </div>
          </fieldset>

          {feedbackType === 'complaint' && (
            <div className="feedback-field">
              <label htmlFor="complaintSubject">
                Şikâyet konusu
              </label>

              <div className="feedback-select">
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  topic
                </span>

                <select
                  id="complaintSubject"
                  value={complaintSubject}
                  onChange={(event) =>
                    setComplaintSubject(
                      event.target.value,
                    )
                  }
                >
                  {complaintSubjects.map(
                    (subject) => (
                      <option
                        value={subject}
                        key={subject}
                      >
                        {subject}
                      </option>
                    ),
                  )}
                </select>

                <span
                  className="material-symbols-outlined feedback-select__arrow"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>
          )}

          <div className="feedback-field">
            <label htmlFor="feedbackMessage">
              {feedbackType === 'complaint'
                ? 'Şikâyetiniz'
                : feedbackType === 'suggestion'
                  ? 'Öneriniz'
                  : 'Yorumunuz'}
            </label>

            <div className="feedback-textarea">
              <textarea
                id="feedbackMessage"
                rows="6"
                maxLength="750"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder={
                  feedbackType === 'complaint'
                    ? 'Yaşadığınız problemi ayrıntılı şekilde açıklayın...'
                    : feedbackType ===
                        'suggestion'
                      ? 'Hizmetimizi nasıl geliştirebileceğimizi paylaşın...'
                      : 'Deneyiminizi bizimle paylaşın...'
                }
              />

              <span>
                {message.length}/750
              </span>
            </div>
          </div>

          <div className="feedback-field">
            <label htmlFor="customerName">
              Adınız
              <span>İsteğe bağlı</span>
            </label>

            <div className="feedback-input">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                person
              </span>

              <input
                id="customerName"
                type="text"
                maxLength="80"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value,
                  )
                }
                placeholder="Adınızı yazabilirsiniz"
              />
            </div>
          </div>

          {formError && (
            <div
              className="feedback-error"
              role="alert"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                error
              </span>

              <span>{formError}</span>
            </div>
          )}

          <button
            className="feedback-submit"
            type="submit"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Gönderiliyor...' : 'Geri Bildirimi Gönder'}</span>

            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </button>

          <p className="feedback-privacy-note">
            Geri bildiriminiz hizmet kalitesini
            geliştirmek amacıyla işletmeyle
            paylaşılacaktır.
          </p>
        </form>
      </div>
    </main>
  );
}