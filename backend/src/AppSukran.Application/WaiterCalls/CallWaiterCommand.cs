using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.WaiterCalls;

/// <summary>Müşterinin garsonu neden çağırdığı; personel ekranında farklı metinle gösterilir.</summary>
public enum WaiterCallReason
{
    Service = 0,
    Bill = 1,
}

/// <summary>
/// Masadaki müşteri garson çağırır. Restoran ve masa istemciden DEĞİL, QR oturum
/// token'ından alınır; başka masa adına çağrı yapılamaz. Çağrı veritabanına yazılmaz,
/// yalnızca restoranın personel ekranlarına anlık bildirim olarak gider.
/// </summary>
public sealed record CallWaiterCommand(WaiterCallReason Reason, string? Note = null) : IRequest;

public sealed class CallWaiterCommandValidator : AbstractValidator<CallWaiterCommand>
{
    public CallWaiterCommandValidator()
    {
        RuleFor(x => x.Reason).IsInEnum();
        RuleFor(x => x.Note).MaximumLength(200);
    }
}

public sealed class CallWaiterCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IOrderRealtimePublisher realtimePublisher) : IRequestHandler<CallWaiterCommand>
{
    public async Task Handle(CallWaiterCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        var tableNo = currentUserService.TableNo;
        if (!currentUserService.IsInRole(nameof(UserRole.Customer)) || string.IsNullOrWhiteSpace(restaurantId) || tableNo is null)
        {
            throw new UnauthorizedAccessException("Garson yalnızca masadaki QR oturumundan çağrılabilir.");
        }

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(restaurantId, cancellationToken)
            ?? throw new InvalidOperationException("İşletme bulunamadı.");
        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == tableNo.Value);
        if (table is null || table.Status != RestaurantTableStatus.Occupied || table.SessionClosedAt.HasValue)
        {
            throw new InvalidOperationException("Masa oturumu kapalı; lütfen personele seslenin.");
        }

        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        await realtimePublisher.PublishWaiterCalledAsync(
            new WaiterCallNotification(restaurantId, tableNo.Value, request.Reason, note, DateTime.UtcNow),
            cancellationToken);
    }
}
