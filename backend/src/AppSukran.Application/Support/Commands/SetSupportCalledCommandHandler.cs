using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed class SetSupportCalledCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<SetSupportCalledCommand>
{
    public async Task Handle(SetSupportCalledCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<SupportRequest>();
        var entity = await repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new InvalidOperationException("Support request not found.");

        entity.IsCalled = request.IsCalled;
        await repository.ReplaceAsync(entity, cancellationToken);
    }
}
