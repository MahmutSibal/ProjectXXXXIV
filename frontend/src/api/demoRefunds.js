const storagePrefix = 'sukran:demo-refund:';
const changeEvent = 'sukran:demo-refund-change';

export const refundMethods = {
  cash: 'Nakit',
  card: 'Kart',
  iban: 'IBAN',
};

function restaurantPrefix(restaurantId) {
  return `${storagePrefix}${encodeURIComponent(restaurantId)}:`;
}

export function createDemoRefund({ restaurantId, tableNo, content, method }) {
  if (
    !restaurantId ||
    !tableNo ||
    !content?.trim() ||
    !Object.hasOwn(refundMethods, method)
  ) {
    throw new Error('Masa bilgisi, iade açıklaması ve iade yöntemi gerekli.');
  }

  const request = {
    id: crypto.randomUUID(),
    tableNo,
    content: content.trim(),
    method,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(
    `${restaurantPrefix(restaurantId)}${request.id}`,
    JSON.stringify(request),
  );

  window.dispatchEvent(new Event(changeEvent));
}

export function getDemoRefunds(restaurantId) {
  if (!restaurantId) return [];

  const prefix = restaurantPrefix(restaurantId);

  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .flatMap((key) => {
      try {
        const request = JSON.parse(localStorage.getItem(key));
        return request?.id ? [request] : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function subscribeToDemoRefunds(restaurantId, onChange) {
  const prefix = restaurantPrefix(restaurantId);

  function handleStorage(event) {
    if (
      event.storageArea === localStorage &&
      (event.key === null || event.key.startsWith(prefix))
    ) {
      onChange();
    }
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(changeEvent, onChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(changeEvent, onChange);
  };
}