using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed class DeleteCategoryCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<DeleteCategoryCommand>
{
    public async Task Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Category>();
        var category = await repository.GetByIdAsync(request.CategoryId, cancellationToken)
            ?? throw new InvalidOperationException("Category not found.");

        restaurantAccessGuard.EnsureCanAccess(category.RestaurantId);

        await repository.DeleteAsync(request.CategoryId, cancellationToken);
    }
}
