export const OrderSessionStatus = { Active: 1, Closed: 2 };
export const OrderItemStatus = { Pending: 1, Kitchen: 2, Preparing: 3, Ready: 4, Delivered: 5 };
export const PaymentStatus = { Unpaid: 1, Processing: 2, Paid: 3 };
export const RestaurantTableStatus = { Available: 1, Reserved: 2, Occupied: 3, Closed: 4 };
export const ComplaintStatus = { New: 1, Investigating: 2, Responded: 3 };

export const ORDER_ITEM_STATUS_LABEL = {
  [OrderItemStatus.Pending]: 'Beklemede',
  [OrderItemStatus.Kitchen]: 'Mutfakta',
  [OrderItemStatus.Preparing]: 'Hazırlanıyor',
  [OrderItemStatus.Ready]: 'Servise Hazır',
  [OrderItemStatus.Delivered]: 'Teslim Edildi',
};

export function formatKurus(amountInKurus) {
  return `₺${((amountInKurus ?? 0) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
