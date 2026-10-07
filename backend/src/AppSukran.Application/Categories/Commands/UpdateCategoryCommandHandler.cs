using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed class UpdateCategoryCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<UpdateCategoryCommand>
{
    public async Task Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Category>();
        var category = await repository.GetByIdAsync(request.CategoryId, cancellationToken)
            ?? throw new InvalidOperationException("Category not found.");

        restaurantAccessGuard.EnsureCanAccess(category.RestaurantId);

        category.Name = request.Name.Trim();
        category.Description = request.Description.Trim();
        category.ImageUrl = request.ImageUrl.Trim();

        await repository.ReplaceAsync(category, cancellationToken);
    }
}
