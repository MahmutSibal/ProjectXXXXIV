using System.Linq.Expressions;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Queries;

public sealed class GetUsersQueryHandler(IUnitOfWork unitOfWork) : IRequestHandler<GetUsersQuery, PagedResult<UserResponse>>
{
    public async Task<PagedResult<UserResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var page = new PageRequest(request.Page, request.PageSize);
        var repository = unitOfWork.Repository<User>();

        // Arama ve rol filtresi veritabanına iniyor; istemcide süzülseydi yalnızca
        // açık sayfadaki kayıtlarda arardı.
        Expression<Func<User, bool>>? filter = null;

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            filter = ExpressionComposer.AndNullable(filter,
                user => user.Name.Contains(term) || user.Email.Contains(term));
        }

        if (request.Role is { } role)
        {
            filter = ExpressionComposer.AndNullable(filter, user => user.Role == role);
        }

        if (!string.IsNullOrWhiteSpace(request.RestaurantId))
        {
            var restaurantId = request.RestaurantId;
            filter = ExpressionComposer.AndNullable(filter, user => user.RestaurantId == restaurantId);
        }
        else if (request.OnlyWithoutRestaurant)
        {
            filter = ExpressionComposer.AndNullable(filter, user => user.RestaurantId == null || user.RestaurantId == "");
        }

        var totalCount = await repository.CountAsync(filter, cancellationToken);
        var users = await repository.QueryAsync(
            filter, user => user.Name, descending: false, page.Skip, page.PageSize, cancellationToken);

        return new PagedResult<UserResponse>(users.Select(Map).ToList(), page.Page, page.PageSize, totalCount);
    }

    private static UserResponse Map(User user)
        => new(user.Id, user.Name, user.Email, user.Role, user.RestaurantId, user.IsActive);
}
