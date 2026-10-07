using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed class CreateCategoryCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<CreateCategoryCommand, string>
{
    public async Task<string> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var category = new Category
        {
            RestaurantId = request.RestaurantId,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            ImageUrl = request.ImageUrl.Trim()
        };

        await unitOfWork.Repository<Category>().InsertAsync(category, cancellationToken);
        return category.Id;
    }
}
