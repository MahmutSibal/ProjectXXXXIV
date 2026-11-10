using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Support.Commands;

/// <summary>SuperAdmin destek talebine cevap yazar; cevap işletme sahibinin Destek sayfasında görünür.</summary>
public sealed record ReplySupportRequestCommand(string Id, string Reply) : IRequest<Unit>;

public sealed class ReplySupportRequestCommandValidator : AbstractValidator<ReplySupportRequestCommand>
{
    public ReplySupportRequestCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Reply).NotEmpty().WithMessage("Cevap boş olamaz.").MaximumLength(2000);
    }
}

public sealed class ReplySupportRequestCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<ReplySupportRequestCommand, Unit>
{
    public async Task<Unit> Handle(ReplySupportRequestCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<SupportRequest>();
        var entity = await repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new InvalidOperationException("Destek talebi bulunamadı.");

        entity.Reply = request.Reply.Trim();
        entity.RepliedAt = DateTime.UtcNow;

        await repository.ReplaceAsync(entity, cancellationToken);
        return Unit.Value;
    }
}
