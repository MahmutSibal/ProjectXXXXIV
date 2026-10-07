using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Queries;

/// <summary>
/// Seçilen paket ve dönem için ödenecek tutarı sorar.
/// Ödeme ekranında gösterilen tutar buradan gelir; istemci kendi hesabını yapmaz.
/// </summary>
public sealed record GetPriceQuoteQuery(SubscriptionPlan Plan, int BillingPeriodMonths)
    : IRequest<PriceQuoteResponse>;
