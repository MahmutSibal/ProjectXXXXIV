using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Categories.Queries;

public sealed class GetCategoriesByRestaurantQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetCategoriesByRestaurantQuery, IReadOnlyCollection<CategoryResponse>>
{
    public async Task<IReadOnlyCollection<CategoryResponse>> Handle(GetCategoriesByRestaurantQuery request, CancellationToken cancellationToken)
    {
        var categories = await unitOfWork.Repository<Category>().FindAsync(category => category.RestaurantId == request.RestaurantId, cancellationToken);
        return categories.Select(Map).ToList();
    }

    private static CategoryResponse Map(Category category)
        => new(category.Id, category.RestaurantId, category.Name, category.Description, category.ImageUrl);
}
