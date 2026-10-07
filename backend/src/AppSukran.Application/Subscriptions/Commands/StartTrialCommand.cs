using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>Yeni oluşturulan bir restoran için ücretsiz deneme aboneliği başlatır.</summary>
public sealed record StartTrialCommand(string RestaurantId) : IRequest<string>;
