using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// Paket seçimi/yükseltme.
///
/// SuperAdmin çağırırsa paket hemen aktifleşir (ödeme havale ile alındıktan sonra).
/// İşletme sahibi çağırırsa paket AKTİFLEŞMEZ; SuperAdmin'e bir "paket talebi" düşer.
/// Eskiden sahibi ödeme yapmadan istediği paketi kendisi açabiliyordu.
/// PayTR bağlandığında işletme sahibinin yolu ödeme adımına bağlanacak.
/// </summary>
public sealed record ChangePlanCommand(
    string RestaurantId,
    SubscriptionPlan Plan,
    int BillingPeriodMonths) : IRequest<ChangePlanResult>;

/// <param name="Activated">true: paket aktifleşti; false: talep oluşturuldu, ekip dönüş yapacak.</param>
public sealed record ChangePlanResult(bool Activated, string Message);
