using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed class DeleteSupportRequestCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteSupportRequestCommand>
{
    public async Task Handle(DeleteSupportRequestCommand request, CancellationToken cancellationToken)
    {
        await unitOfWork.Repository<SupportRequest>().DeleteAsync(request.Id, cancellationToken);
    }
}
