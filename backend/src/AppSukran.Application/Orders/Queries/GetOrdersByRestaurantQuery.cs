using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Queries;

/// <param name="SessionStatus">
/// Verilirse yalnızca o durumdaki siparişler döner. Canlı sipariş ekranı yalnızca
/// Active olanları ister (doğal olarak masa sayısıyla sınırlı), geçmiş ekranı ise
/// Closed olanları sayfalayarak ister.
/// </param>
/// <param name="TableNo">Verilirse yalnızca o masanın siparişleri.</param>
/// <param name="CreatedFrom">Dahil; bu tarih ve sonrası (UTC).</param>
/// <param name="CreatedTo">Hariç; bu tarihten öncesi (UTC).</param>
public sealed record GetOrdersByRestaurantQuery(
    string RestaurantId,
    OrderSessionStatus? SessionStatus = null,
    int? Page = null,
    int? PageSize = null,
    int? TableNo = null,
    DateTime? CreatedFrom = null,
    DateTime? CreatedTo = null) : IRequest<PagedResult<OrderResponse>>;
