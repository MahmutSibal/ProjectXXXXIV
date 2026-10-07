using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Complaints.Commands;

public sealed class UpdateComplaintCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateComplaintCommand>
{
    public async Task Handle(UpdateComplaintCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Complaint>();
        var entity = await repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new InvalidOperationException("Complaint not found.");

        entity.Status = request.Status;
        entity.Response = request.Response?.Trim() ?? string.Empty;

        await repository.ReplaceAsync(entity, cancellationToken);
    }
}
