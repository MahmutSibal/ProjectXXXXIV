using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Subscriptions.Commands;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class CreateRestaurantCommandHandler(IUnitOfWork unitOfWork, IMediator mediator) : IRequestHandler<CreateRestaurantCommand, string>
{
    public async Task<string> Handle(CreateRestaurantCommand request, CancellationToken cancellationToken)
    {
        var restaurant = new Restaurant
        {
            Name = request.Name.Trim(),
            Slug = SlugGenerator.Create(request.Slug),
            OwnerId = request.OwnerId,
            Address = request.Address.Trim(),
            Longitude = request.Longitude,
            Latitude = request.Latitude
        };

        await unitOfWork.Repository<Restaurant>().InsertAsync(restaurant, cancellationToken);

        // Her yeni restoran ücretsiz deneme ile başlar.
        await mediator.Send(new StartTrialCommand(restaurant.Id), cancellationToken);

        return restaurant.Id;
    }
}