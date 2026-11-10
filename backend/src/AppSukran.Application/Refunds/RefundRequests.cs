using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Refunds;

/// <param name="Iban">Yalnızca IBAN iadesinde; yanıtta maskeli döner.</param>
public sealed record RefundRequestResponse(
    string Id,
    string RestaurantId,
    int TableNo,
    string Content,
    RefundMethod Method,
    string? Iban,
    string? AccountHolderName,
    RefundRequestStatus Status,
    string? ResolutionNote,
    DateTime CreatedAt,
    DateTime? ResolvedAt);

internal static class RefundRequestMapping
{
    public static RefundRequestResponse ToResponse(RefundRequest request, bool showFullIban) => new(
        request.Id,
        request.RestaurantId,
        request.TableNo,
        request.Content,
        request.Method,
        string.IsNullOrEmpty(request.Iban) ? null : showFullIban ? TurkishIban.Format(request.Iban) : TurkishIban.Mask(request.Iban),
        request.AccountHolderName,
        request.Status,
        request.ResolutionNote,
        request.CreatedAt,
        request.ResolvedAt);
}

// --- Müşteri: talep oluşturma -------------------------------------------------

/// <summary>
/// QR ile masadan bağlanan müşteri iade talebi açar. Restoran ve masa istemciden DEĞİL,
/// müşterinin QR oturum token'ından alınır; başka masa adına talep açılamaz.
/// </summary>
public sealed record CreateRefundRequestCommand(
    string Content,
    RefundMethod Method,
    string? Iban = null,
    string? AccountHolderName = null) : IRequest<string>;

public sealed class CreateRefundRequestCommandValidator : AbstractValidator<CreateRefundRequestCommand>
{
    public CreateRefundRequestCommandValidator()
    {
        RuleFor(x => x.Content).NotEmpty().WithMessage("İade açıklaması girin.")
            .MinimumLength(5).MaximumLength(1000);
        RuleFor(x => x.Method).IsInEnum().WithMessage("İade yöntemini seçin.");
        RuleFor(x => x.Iban).NotEmpty().WithMessage("IBAN ile iade için IBAN girin.")
            .When(x => x.Method == RefundMethod.Iban);
        RuleFor(x => x.AccountHolderName).NotEmpty().WithMessage("IBAN ile iade için hesap sahibinin adını girin.")
            .MaximumLength(150)
            .When(x => x.Method == RefundMethod.Iban);
    }
}

public sealed class CreateRefundRequestCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IOrderRealtimePublisher realtimePublisher,
    IAuditLogService auditLogService) : IRequestHandler<CreateRefundRequestCommand, string>
{
    public async Task<string> Handle(CreateRefundRequestCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        var tableNo = currentUserService.TableNo;
        if (!currentUserService.IsInRole(nameof(UserRole.Customer)) || string.IsNullOrWhiteSpace(restaurantId) || tableNo is null)
        {
            throw new UnauthorizedAccessException("İade talebi yalnızca masadaki QR oturumundan açılabilir.");
        }

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(restaurantId, cancellationToken)
            ?? throw new InvalidOperationException("İşletme bulunamadı.");
        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == tableNo.Value);
        if (table is null || table.Status != RestaurantTableStatus.Occupied || table.SessionClosedAt.HasValue)
        {
            throw new InvalidOperationException("Masa oturumu kapalı; iade talebini personele iletin.");
        }

        string? iban = null;
        if (request.Method == RefundMethod.Iban)
        {
            iban = TurkishIban.Normalize(request.Iban);
            if (!TurkishIban.IsValid(iban))
            {
                throw new InvalidOperationException("Geçerli bir IBAN girin (TR ile başlayan 26 karakter).");
            }
        }

        var entity = new RefundRequest
        {
            RestaurantId = restaurantId,
            TableNo = tableNo.Value,
            TableSessionId = table.TableSessionId,
            Content = request.Content.Trim(),
            Method = request.Method,
            Iban = iban,
            AccountHolderName = request.Method == RefundMethod.Iban ? request.AccountHolderName?.Trim() : null,
        };

        await unitOfWork.Repository<RefundRequest>().InsertAsync(entity, cancellationToken);
        await realtimePublisher.PublishRefundRequestChangedAsync(entity, cancellationToken);
        await auditLogService.RecordAsync(
            "RefundRequestCreated", nameof(RefundRequest), entity.Id,
            $"Masa {entity.TableNo}, yöntem {entity.Method}.", currentUserService.UserId, cancellationToken);

        return entity.Id;
    }
}

// --- Personel: listeleme ------------------------------------------------------

/// <param name="Status">Boşsa tüm talepler; yeniden eskiye.</param>
public sealed record GetRefundRequestsQuery(string RestaurantId, RefundRequestStatus? Status = null)
    : IRequest<IReadOnlyCollection<RefundRequestResponse>>;

public sealed class GetRefundRequestsQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    ICurrentUserService currentUserService) : IRequestHandler<GetRefundRequestsQuery, IReadOnlyCollection<RefundRequestResponse>>
{
    public async Task<IReadOnlyCollection<RefundRequestResponse>> Handle(GetRefundRequestsQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var items = await unitOfWork.Repository<RefundRequest>().FindAsync(
            refund => refund.RestaurantId == request.RestaurantId
                && (request.Status == null || refund.Status == request.Status),
            cancellationToken);

        // Tam IBAN'ı yalnızca havaleyi yapacak olan işletme sahibi görür; mutfak maskeli görür.
        var showFullIban = currentUserService.IsInRole(nameof(UserRole.RestaurantOwner))
            || currentUserService.IsInRole(nameof(UserRole.SuperAdmin));

        return items
            .OrderByDescending(refund => refund.CreatedAt)
            .Take(200)
            .Select(refund => RefundRequestMapping.ToResponse(refund, showFullIban))
            .ToList();
    }
}

// --- Personel: sonuçlandırma --------------------------------------------------

public sealed record UpdateRefundRequestStatusCommand(string Id, RefundRequestStatus Status, string? ResolutionNote = null)
    : IRequest<Unit>;

public sealed class UpdateRefundRequestStatusCommandValidator : AbstractValidator<UpdateRefundRequestStatusCommand>
{
    public UpdateRefundRequestStatusCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.ResolutionNote).MaximumLength(500);
    }
}

public sealed class UpdateRefundRequestStatusCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    ICurrentUserService currentUserService,
    IOrderRealtimePublisher realtimePublisher,
    IAuditLogService auditLogService) : IRequestHandler<UpdateRefundRequestStatusCommand, Unit>
{
    public async Task<Unit> Handle(UpdateRefundRequestStatusCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<RefundRequest>();
        var entity = await repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new InvalidOperationException("İade talebi bulunamadı.");

        restaurantAccessGuard.EnsureCanAccess(entity.RestaurantId);

        entity.Status = request.Status;
        entity.ResolutionNote = string.IsNullOrWhiteSpace(request.ResolutionNote) ? null : request.ResolutionNote.Trim();
        entity.ResolvedAt = request.Status == RefundRequestStatus.Pending ? null : DateTime.UtcNow;
        entity.ResolvedByUserId = request.Status == RefundRequestStatus.Pending ? null : currentUserService.UserId;

        await repository.ReplaceAsync(entity, cancellationToken);
        await realtimePublisher.PublishRefundRequestChangedAsync(entity, cancellationToken);
        await auditLogService.RecordAsync(
            "RefundRequestUpdated", nameof(RefundRequest), entity.Id,
            $"Durum: {entity.Status}.", currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
