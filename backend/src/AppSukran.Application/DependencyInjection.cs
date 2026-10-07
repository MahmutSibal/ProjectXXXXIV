using AppSukran.Application.Common.Behaviors;
using AppSukran.Application.Common.Security;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace AppSukran.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped<IRestaurantAccessGuard, RestaurantAccessGuard>();
        services.AddScoped<ISubscriptionGuard, SubscriptionGuard>();
        return services;
    }
}