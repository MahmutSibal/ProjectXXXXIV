using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class CreateCustomerCardCommandHandler(
    IUnitOfWork unitOfWork,
    ICardNumberProtectionService cardProtectionService,
    ICurrentUserService currentUserService)
    : IRequestHandler<CreateCustomerCardCommand, CustomerCardResponse>
{
    private const int MaxCardsPerUser = 5;

    public async Task<CustomerCardResponse> Handle(CreateCustomerCardCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        if (!cardProtectionService.IsValidCardNumber(request.CardNumber))
        {
            throw new InvalidOperationException("Card number is invalid.");
        }

        if (!cardProtectionService.IsExpiryValid(request.ExpiryMonth, request.ExpiryYear))
        {
            throw new InvalidOperationException("Card expiry date is invalid.");
        }

        var repository = unitOfWork.Repository<CustomerCard>();
        // Yalnızca bu kullanıcının kartlarını veritabanı tarafında filtreleyerek getir
        // (tüm koleksiyonu belleğe çekmek yerine).
        var userCards = (await repository.FindAsync(c => c.UserId == userId, cancellationToken)).ToList();
        var normalizedNumber = cardProtectionService.NormalizeCardNumber(request.CardNumber);
        var cardHash = cardProtectionService.HashCardNumber(normalizedNumber);
        var last4 = cardProtectionService.GetLast4(normalizedNumber);
        var brand = cardProtectionService.DetectBrand(normalizedNumber);

        // Kart limiti
        if (userCards.Count(c => c.IsActive) >= MaxCardsPerUser)
        {
            throw new InvalidOperationException($"En fazla {MaxCardsPerUser} kart kaydedebilirsiniz.");
        }

        // Mükerrer kart engeli: aynı kullanıcının aynı PAN'i (hash ile doğrula) tekrar eklemesini önle.
        if (userCards.Any(c => cardProtectionService.VerifyCardNumber(normalizedNumber, c.CardHash)))
        {
            throw new InvalidOperationException("Bu kart zaten kayıtlı.");
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            // İlk kart otomatik varsayılan olur.
            var makeDefault = request.IsDefault || userCards.All(c => !c.IsActive);

            if (makeDefault)
            {
                foreach (var existingCard in userCards.Where(c => c.IsDefault))
                {
                    existingCard.IsDefault = false;
                    await repository.ReplaceAsync(existingCard, cancellationToken);
                }
            }

            var card = new CustomerCard
            {
                UserId = userId,
                CardHash = cardHash,
                Last4 = last4,
                CardholderName = request.CardholderName.Trim(),
                Brand = brand,
                ExpiryMonth = request.ExpiryMonth,
                ExpiryYear = request.ExpiryYear,
                IsDefault = makeDefault,
                IsActive = true
            };

            await repository.InsertAsync(card, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            return new CustomerCardResponse(card.Id, card.CardholderName, card.Brand, card.Last4, card.ExpiryMonth, card.ExpiryYear, card.IsDefault, card.IsActive, card.CreatedAt);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}