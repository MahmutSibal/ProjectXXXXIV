using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Categories.Queries;

public sealed record GetCategoriesByRestaurantQuery(string RestaurantId) : IRequest<IReadOnlyCollection<CategoryResponse>>;
