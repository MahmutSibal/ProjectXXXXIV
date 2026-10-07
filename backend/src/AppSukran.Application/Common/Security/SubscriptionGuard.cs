using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;

namespace AppSukran.Application.Common.Security;

public sealed class SubscriptionGuard(IUnitOfWork unitOfWork, ICurrentUserService currentUserService) : ISubscriptionGuard
{
    public async Task EnsureActiveAsync(string restaurantId, CancellationToken cancellationToken = default)
        => await LoadActiveAsync(restaurantId, cancellationToken);

    public async Task EnsureCanAddTableAsync(string restaurantId, int currentTableCount, CancellationToken cancellationToken = default)
    {
        var subscription = await LoadActiveAsync(restaurantId, cancellationToken);
        if (subscription is null)
        {
            return;
        }

        var maxTables = PlanCatalog.Get(subscription.Plan).Features.MaxTables;
        if (maxTables.HasValue && currentTableCount >= maxTables.Value)
        {
            throw new SubscriptionRequiredException(
                $"Mevcut paketiniz en fazla {maxTables.Value} masaya izin veriyor. Daha fazlası için paketinizi yükseltin.");
        }
    }

    public async Task EnsureFeatureAsync(string restaurantId, SubscriptionFeature feature, CancellationToken cancellationToken = default)
    {
        var subscription = await LoadActiveAsync(restaurantId, cancellationToken);
        if (subscription is null)
        {
            return;
        }

        var definition = PlanCatalog.Get(subscription.Plan);
        var allowed = feature switch
        {
            SubscriptionFeature.StaffPanels => definition.Features.HasStaffPanels,
            SubscriptionFeature.DetailedReports => definition.Features.HasDetailedReports,
            SubscriptionFeature.Events => definition.Features.HasEvents,
            SubscriptionFeature.Ordering => definition.Features.HasOrdering,
            _ => true,
        };

        if (!allowed)
        {
            throw new SubscriptionRequiredException(
                $"Bu özellik {definition.DisplayName} paketinde bulunmuyor. Paketinizi yükselterek kullanabilirsiniz.");
        }
    }

    public async Task EnsureCanCreateOrderAsync(string restaurantId, CancellationToken cancellationToken = default)
    {
        var subscription = await LoadActiveAsync(restaurantId, cancellationToken);
        if (subscription is null)
        {
            return;
        }

        var definition = PlanCatalog.Get(subscription.Plan);

        if (!definition.Features.HasOrdering)
        {
            throw new SubscriptionRequiredException(
                $"{definition.DisplayName} paketi yalnızca QR menü içerir; sipariş alınamaz. " +
                "Sipariş sistemi için Pro veya Business paketine geçin.");
        }

        var limit = definition.Features.MaxQrOrdersPerPeriod;
        if (limit is null)
        {
            return;
        }

        // Limit DÖNEM BAŞINA uygulanır: sayım, aboneliğin içinde bulunduğu
        // dönemin başlangıcından itibaren yapılır (takvim ayı değil).
        var periodStart = subscription.CurrentPeriodStart;
        var orderCount = await unitOfWork.Repository<Order>()
            .CountAsync(order => order.RestaurantId == restaurantId && order.CreatedAt >= periodStart, cancellationToken);

        if (orderCount >= limit.Value)
        {
            throw new SubscriptionRequiredException(
                $"Bu dönem için {limit.Value} sipariş sınırına ulaştınız. " +
                "Daha fazlası için paketinizi yükseltebilirsiniz.");
        }
    }

    /// <summary>
    /// Aboneliği yükler ve erişim hakkı verip vermediğini denetler.
    /// SuperAdmin için denetim yapılmaz (null döner) — platform yöneticisi her restorana müdahale edebilmelidir.
    /// </summary>
    private async Task<Subscription?> LoadActiveAsync(string restaurantId, CancellationToken cancellationToken)
    {
        if (currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            return null;
        }

        var subscriptions = await unitOfWork.Repository<Subscription>()
            .FindAsync(subscription => subscription.RestaurantId == restaurantId, cancellationToken);

        var subscription = subscriptions.FirstOrDefault()
            ?? throw new SubscriptionRequiredException("Bu işletmenin aktif bir aboneliği bulunmuyor.");

        if (!subscription.GrantsAccess(DateTime.UtcNow))
        {
            throw new SubscriptionRequiredException(
                subscription.Status == SubscriptionStatus.Cancelled
                    ? "Aboneliğiniz iptal edilmiş. Devam etmek için yeni bir paket seçin."
                    : "Abonelik süreniz doldu. Hizmete devam etmek için paketinizi yenileyin.");
        }

        return subscription;
    }
}
