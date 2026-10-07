import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { customerReviewsApi } from '../../../api/customer.js';
import { parseApiDate } from '../../../lib/date.js';

import './QrMenuSheets.css';

function Stars({ value }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span className="qr-stars" aria-label={`5 üzerinden ${value}`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '';
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ReviewsController GET /reviews/restaurant/{id} → ReviewResponse[]:
// { id, userName, comment, rating, createdAt, replies: [{ id, userName, comment, createdAt }] }
export default function QrReviewsSection({ restaurantId }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    customerReviewsApi
      .getByRestaurant(restaurantId)
      .then((data) => {
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Yorumlar alınamadı.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviews.length;
  }, [reviews]);

  return (
    <>
      <section className="qr-reviews-card" aria-label="Yorumlar">
        <div className="qr-reviews-card__summary">
          <span className="qr-reviews-card__score">
            {reviews.length > 0 ? average.toFixed(1).replace('.', ',') : '—'}
          </span>

          <div className="qr-reviews-card__meta">
            <Stars value={average} />

            <span>
              {isLoading
                ? 'Yükleniyor...'
                : reviews.length > 0
                  ? `${reviews.length} yorum`
                  : 'Henüz yorum yok'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="qr-reviews-card__button"
          onClick={() => setIsOpen(true)}
        >
          Yorumlar
        </button>
      </section>

      {isOpen &&
        createPortal(
          <div className="qr-sheet" role="dialog" aria-modal="true" aria-label="Yorumlar">
            <button
              type="button"
              className="qr-sheet__backdrop"
              aria-label="Kapat"
              onClick={() => setIsOpen(false)}
            />

            <div className="qr-sheet__panel">
              <div className="qr-sheet__handle" />

              <header className="qr-sheet__header">
                <div>
                  <span>Misafir görüşleri</span>

                  <h2>
                    Yorumlar
                    {reviews.length > 0 && ` · ${average.toFixed(1).replace('.', ',')} ★`}
                  </h2>
                </div>

                <button
                  type="button"
                  className="qr-sheet__close"
                  aria-label="Kapat"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </header>

              <div className="qr-sheet__body">
                {error ? (
                  <p className="qr-sheet__error">{error}</p>
                ) : reviews.length === 0 ? (
                  <p className="qr-sheet__empty">Henüz yorum yok.</p>
                ) : (
                  reviews.map((review) => (
                    <article key={review.id} className="qr-review">
                      <div className="qr-review__head">
                        <strong>{review.userName || 'Misafir'}</strong>

                        <Stars value={review.rating ?? 0} />
                      </div>

                      <p>{review.comment}</p>

                      <time>{formatDate(review.createdAt)}</time>

                      {(review.replies ?? []).map((reply) => (
                        <div key={reply.id} className="qr-review__reply">
                          <strong>{reply.userName || 'İşletme'}</strong>

                          <p>
                            {reply.mentionedUserName && `@${reply.mentionedUserName} `}
                            {reply.comment}
                          </p>
                        </div>
                      ))}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
