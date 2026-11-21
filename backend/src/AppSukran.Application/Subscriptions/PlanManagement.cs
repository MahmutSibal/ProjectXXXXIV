using AppSukran.Application.Common.Models;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Subscriptions;

// --- Katalogu veritabanından yükleme -------------------------------------------------

/// <summary>
/// SuperAdmin'in paket ayarlarını veritabanından okuyup <see cref="PlanCatalog"/>'a yükler.
/// Uygulama açılışında, her değişiklikten hemen sonra ve (birden fazla sunucu olduğu için)
/// düzenli aralıklarla çağrılır.
/// </summary>
public static class PlanCatalogLoader
{
    public static async Task LoadAsync(IUnitOfWork unitOfWork, CancellationToken cancellationToken = default)
    {
        var settings = await unitOfWork.Repository<PlanSetting>().GetAllAsync(cancellationToken);
        var global = await unitOfWork.Repository<PlanCatalogSettings>().GetByIdAsync(PlanCatalogSettings.SingletonId, cancellationToken);

        var plans = settings.Select(ToDefinition).ToList();
        PlanCatalog.Apply(new PlanCatalogSnapshot(
            plans,
            global?.AnnualDiscountPercent ?? PlanCatalog.DefaultAnnualDiscountPercent,
            global?.TrialDays ?? PlanCatalog.DefaultTrialDays,
            global?.PriceVersion ?? PlanCatalog.DefaultPriceVersion));
    }

    private static PlanDefinition ToDefinition(PlanSetting setting)
    {
        var fallback = PlanCatalog.Defaults.First(definition => definition.Plan == setting.Plan);
        return fallback with
        {
            DisplayName = setting.DisplayName,
            Summary = setting.Summary,
            MonthlyPrice = setting.MonthlyPrice,
            DiscountPercent = setting.DiscountPercent,
            IsVisible = setting.IsVisible,
            IsHighlighted = setting.IsHighlighted,
            Bullets = PlanBullets.Split(setting.Bullets),
            Features = fallback.Features with
            {
                HasOrdering = setting.HasOrdering,
                MaxQrOrdersPerPeriod = setting.MaxQrOrdersPerPeriod,
                MaxKitchenPanels = setting.MaxKitchenPanels,
                MaxWaiterPanels = setting.MaxWaiterPanels,
                HasDetailedReports = setting.HasDetailedReports,
                HasEvents = setting.HasEvents,
                MaxTables = setting.MaxTables,
            },
        };
    }
}

internal static class PlanBullets
{
    public static IReadOnlyList<string> Split(string? value)
        => (value ?? string.Empty).Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static string Join(IEnumerable<string>? bullets)
        => string.Join('\n', (bullets ?? []).Select(line => line.Trim()).Where(line => line.Length > 0));
}

// --- Yanıt modelleri ---------------------------------------------------------------------

public sealed record PlanAdminResponse(
    SubscriptionPlan Plan,
    string Code,
    string DisplayName,
    string Summary,
    long MonthlyPrice,
    int DiscountPercent,
    bool IsVisible,
    bool IsHighlighted,
    IReadOnlyList<string> Bullets,
    bool IsQuoteOnly,
    bool AllowsTrial,
    bool IsCustomized,
    int ActiveSubscriptions,
    PlanFeaturesResponse Features);

public sealed record PlanCatalogAdminResponse(
    int AnnualDiscountPercent,
    int TrialDays,
    string PriceVersion,
    IReadOnlyCollection<PlanAdminResponse> Plans);

// --- Okuma (SuperAdmin) -------------------------------------------------------------------

public sealed record GetPlanCatalogAdminQuery : IRequest<PlanCatalogAdminResponse>;

public sealed class GetPlanCatalogAdminQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<GetPlanCatalogAdminQuery, PlanCatalogAdminResponse>
{
    public async Task<PlanCatalogAdminResponse> Handle(GetPlanCatalogAdminQuery request, CancellationToken cancellationToken)
    {
        PlanAdminGuard.Ensure(currentUserService);
        await PlanCatalogLoader.LoadAsync(unitOfWork, cancellationToken);

        var customized = (await unitOfWork.Repository<PlanSetting>().GetAllAsync(cancellationToken))
            .Select(setting => setting.Plan).ToHashSet();
        var now = DateTime.UtcNow;
        var counts = (await unitOfWork.Repository<Subscription>().GetAllAsync(cancellationToken))
            .Where(subscription => subscription.GrantsAccess(now))
            .GroupBy(subscription => subscription.Plan)
            .ToDictionary(group => group.Key, group => group.Count());

        var plans = PlanCatalog.All.Select(definition => new PlanAdminResponse(
                definition.Plan,
                definition.Code,
                definition.DisplayName,
                definition.Summary,
                definition.MonthlyPrice,
                definition.DiscountPercent,
                definition.IsVisible,
                definition.IsHighlighted,
                definition.BulletList,
                definition.IsQuoteOnly,
                definition.AllowsTrial,
                customized.Contains(definition.Plan),
                counts.GetValueOrDefault(definition.Plan),
                definition.Features.ToResponse()))
            .ToList();

        return new PlanCatalogAdminResponse(PlanCatalog.AnnualDiscountPercent, PlanCatalog.TrialDays, PlanCatalog.PriceVersion, plans);
    }
}

internal static class PlanAdminGuard
{
    public static void Ensure(ICurrentUserService currentUserService)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Paket ayarlarını yalnızca platform yöneticisi değiştirebilir.");
        }
    }

    /// <summary>Her değişiklikte fiyat listesi sürümü yenilenir: yeni abonelikler hangi listeyle ücretlendiğini kaydeder.</summary>
    public static async Task<PlanCatalogSettings> TouchGlobalAsync(IUnitOfWork unitOfWork, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<PlanCatalogSettings>();
        var global = await repository.GetByIdAsync(PlanCatalogSettings.SingletonId, cancellationToken);
        var isNew = global is null;
        global ??= new PlanCatalogSettings
        {
            AnnualDiscountPercent = PlanCatalog.AnnualDiscountPercent,
            TrialDays = PlanCatalog.TrialDays,
        };

        global.PriceVersion = $"{DateTime.UtcNow:yyyyMMdd-HHmmss}";
        global.UpdatedAt = DateTime.UtcNow;
        if (isNew) await repository.InsertAsync(global, cancellationToken);
        else await repository.ReplaceAsync(global, cancellationToken);
        return global;
    }
}

// --- Paket güncelleme ----------------------------------------------------------------------

/// <param name="MonthlyPrice">Kuruş.</param>
/// <param name="MaxQrOrdersPerPeriod">null = sınırsız.</param>
public sealed record UpdatePlanCommand(
    SubscriptionPlan Plan,
    string DisplayName,
    string? Summary,
    long MonthlyPrice,
    int DiscountPercent,
    bool IsVisible,
    bool IsHighlighted,
    IReadOnlyList<string>? Bullets,
    bool HasOrdering,
    int? MaxQrOrdersPerPeriod,
    int? MaxKitchenPanels,
    int? MaxWaiterPanels,
    bool HasDetailedReports,
    bool HasEvents,
    int? MaxTables) : IRequest<PlanAdminResponse>;

public sealed class UpdatePlanCommandValidator : AbstractValidator<UpdatePlanCommand>
{
    public UpdatePlanCommandValidator()
    {
        RuleFor(x => x.Plan).IsInEnum();
        RuleFor(x => x.DisplayName).NotEmpty().WithMessage("Paket adını girin.").MaximumLength(40);
        RuleFor(x => x.Summary).MaximumLength(300);
        RuleFor(x => x.MonthlyPrice).InclusiveBetween(0, 100_000_000).WithMessage("Aylık fiyat 0 ile 1.000.000 TL arasında olmalı.");
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 90).WithMessage("İndirim %0 ile %90 arasında olmalı.");
        RuleFor(x => x.Bullets).Must(list => list is null || list.Count(line => !string.IsNullOrWhiteSpace(line)) <= 20)
            .WithMessage("En fazla 20 özellik maddesi girilebilir.");
        RuleForEach(x => x.Bullets).MaximumLength(80).WithMessage("Bir özellik maddesi en fazla 80 karakter olabilir.");
        RuleFor(x => x.MaxQrOrdersPerPeriod).GreaterThanOrEqualTo(0).When(x => x.MaxQrOrdersPerPeriod.HasValue);
        RuleFor(x => x.MaxKitchenPanels).GreaterThanOrEqualTo(0).When(x => x.MaxKitchenPanels.HasValue);
        RuleFor(x => x.MaxWaiterPanels).GreaterThanOrEqualTo(0).When(x => x.MaxWaiterPanels.HasValue);
        RuleFor(x => x.MaxTables).GreaterThanOrEqualTo(1).When(x => x.MaxTables.HasValue).WithMessage("Masa sınırı en az 1 olmalı.");
    }
}

public sealed class UpdatePlanCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IAuditLogService auditLogService,
    IMediator mediator) : IRequestHandler<UpdatePlanCommand, PlanAdminResponse>
{
    public async Task<PlanAdminResponse> Handle(UpdatePlanCommand request, CancellationToken cancellationToken)
    {
        PlanAdminGuard.Ensure(currentUserService);
        var fallback = PlanCatalog.Defaults.FirstOrDefault(definition => definition.Plan == request.Plan)
            ?? throw new InvalidOperationException("Paket bulunamadı.");

        if (request.Plan == SubscriptionPlan.Trial && request.MonthlyPrice != 0)
        {
            throw new InvalidOperationException("Ücretsiz deneme paketinin fiyatı olamaz.");
        }

        var repository = unitOfWork.Repository<PlanSetting>();
        var setting = await repository.GetByIdAsync(fallback.Code, cancellationToken);
        var isNew = setting is null;
        setting ??= new PlanSetting { Id = fallback.Code, Plan = request.Plan };

        setting.DisplayName = request.DisplayName.Trim();
        setting.Summary = (request.Summary ?? string.Empty).Trim();
        setting.MonthlyPrice = fallback.IsQuoteOnly ? 0 : request.MonthlyPrice;
        setting.DiscountPercent = request.DiscountPercent;
        setting.IsVisible = request.Plan != SubscriptionPlan.Trial && request.IsVisible;
        setting.IsHighlighted = request.IsHighlighted;
        setting.Bullets = PlanBullets.Join(request.Bullets);
        setting.HasOrdering = request.HasOrdering;
        setting.MaxQrOrdersPerPeriod = request.HasOrdering ? request.MaxQrOrdersPerPeriod : 0;
        setting.MaxKitchenPanels = request.MaxKitchenPanels;
        setting.MaxWaiterPanels = request.MaxWaiterPanels;
        setting.HasDetailedReports = request.HasDetailedReports;
        setting.HasEvents = request.HasEvents;
        setting.MaxTables = request.MaxTables;
        setting.UpdatedAt = DateTime.UtcNow;

        if (isNew) await repository.InsertAsync(setting, cancellationToken);
        else await repository.ReplaceAsync(setting, cancellationToken);

        // Yalnızca bir paket öne çıkarılır. Hiç düzenlenmemiş (varsayılanı öne çıkan) paketin
        // veritabanında satırı yoktur; işareti kaldırmak için mevcut haliyle bir satır açılır.
        if (request.IsHighlighted)
        {
            foreach (var other in PlanCatalog.All.Where(definition => definition.IsHighlighted && definition.Plan != request.Plan))
            {
                var otherSetting = await repository.GetByIdAsync(other.Code, cancellationToken);
                if (otherSetting is null)
                {
                    otherSetting = FromDefinition(other);
                    otherSetting.IsHighlighted = false;
                    await repository.InsertAsync(otherSetting, cancellationToken);
                }
                else
                {
                    otherSetting.IsHighlighted = false;
                    await repository.ReplaceAsync(otherSetting, cancellationToken);
                }
            }
        }

        await PlanAdminGuard.TouchGlobalAsync(unitOfWork, cancellationToken);
        await PlanCatalogLoader.LoadAsync(unitOfWork, cancellationToken);
        await auditLogService.RecordAsync(
            "PlanUpdated", nameof(PlanSetting), setting.Id,
            $"{setting.DisplayName}: {setting.MonthlyPrice / 100m:N2} TL/ay, indirim %{setting.DiscountPercent}, görünür={setting.IsVisible}.",
            currentUserService.UserId, cancellationToken);

        var catalog = await mediator.Send(new GetPlanCatalogAdminQuery(), cancellationToken);
        return catalog.Plans.First(plan => plan.Plan == request.Plan);
    }

    private static PlanSetting FromDefinition(PlanDefinition definition) => new()
    {
        Id = definition.Code,
        Plan = definition.Plan,
        DisplayName = definition.DisplayName,
        Summary = definition.Summary,
        MonthlyPrice = definition.MonthlyPrice,
        DiscountPercent = definition.DiscountPercent,
        IsVisible = definition.IsVisible,
        IsHighlighted = definition.IsHighlighted,
        Bullets = PlanBullets.Join(definition.BulletList),
        HasOrdering = definition.Features.HasOrdering,
        MaxQrOrdersPerPeriod = definition.Features.MaxQrOrdersPerPeriod,
        MaxKitchenPanels = definition.Features.MaxKitchenPanels,
        MaxWaiterPanels = definition.Features.MaxWaiterPanels,
        HasDetailedReports = definition.Features.HasDetailedReports,
        HasEvents = definition.Features.HasEvents,
        MaxTables = definition.Features.MaxTables,
        UpdatedAt = DateTime.UtcNow,
    };
}

// --- Varsayılana döndürme ------------------------------------------------------------------

public sealed record ResetPlanCommand(SubscriptionPlan Plan) : IRequest<PlanAdminResponse>;

public sealed class ResetPlanCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IAuditLogService auditLogService,
    IMediator mediator) : IRequestHandler<ResetPlanCommand, PlanAdminResponse>
{
    public async Task<PlanAdminResponse> Handle(ResetPlanCommand request, CancellationToken cancellationToken)
    {
        PlanAdminGuard.Ensure(currentUserService);
        var fallback = PlanCatalog.Defaults.FirstOrDefault(definition => definition.Plan == request.Plan)
            ?? throw new InvalidOperationException("Paket bulunamadı.");

        var repository = unitOfWork.Repository<PlanSetting>();
        if (await repository.GetByIdAsync(fallback.Code, cancellationToken) is not null)
        {
            await repository.DeleteAsync(fallback.Code, cancellationToken);
            await PlanAdminGuard.TouchGlobalAsync(unitOfWork, cancellationToken);
            await auditLogService.RecordAsync("PlanReset", nameof(PlanSetting), fallback.Code,
                $"{fallback.DisplayName} varsayılan ayarlara döndürüldü.", currentUserService.UserId, cancellationToken);
        }

        await PlanCatalogLoader.LoadAsync(unitOfWork, cancellationToken);
        var catalog = await mediator.Send(new GetPlanCatalogAdminQuery(), cancellationToken);
        return catalog.Plans.First(plan => plan.Plan == request.Plan);
    }
}

// --- Genel ayarlar (yıllık indirim, deneme süresi) -----------------------------------------

public sealed record UpdatePlanCatalogSettingsCommand(int AnnualDiscountPercent, int TrialDays) : IRequest<PlanCatalogAdminResponse>;

public sealed class UpdatePlanCatalogSettingsCommandValidator : AbstractValidator<UpdatePlanCatalogSettingsCommand>
{
    public UpdatePlanCatalogSettingsCommandValidator()
    {
        RuleFor(x => x.AnnualDiscountPercent).InclusiveBetween(0, 90).WithMessage("Yıllık indirim %0 ile %90 arasında olmalı.");
        RuleFor(x => x.TrialDays).InclusiveBetween(0, 90).WithMessage("Deneme süresi 0 ile 90 gün arasında olmalı.");
    }
}

public sealed class UpdatePlanCatalogSettingsCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IAuditLogService auditLogService,
    IMediator mediator) : IRequestHandler<UpdatePlanCatalogSettingsCommand, PlanCatalogAdminResponse>
{
    public async Task<PlanCatalogAdminResponse> Handle(UpdatePlanCatalogSettingsCommand request, CancellationToken cancellationToken)
    {
        PlanAdminGuard.Ensure(currentUserService);
        var global = await PlanAdminGuard.TouchGlobalAsync(unitOfWork, cancellationToken);
        global.AnnualDiscountPercent = request.AnnualDiscountPercent;
        global.TrialDays = request.TrialDays;
        await unitOfWork.Repository<PlanCatalogSettings>().ReplaceAsync(global, cancellationToken);

        await PlanCatalogLoader.LoadAsync(unitOfWork, cancellationToken);
        await auditLogService.RecordAsync("PlanCatalogSettingsUpdated", nameof(PlanCatalogSettings), global.Id,
            $"Yıllık indirim %{global.AnnualDiscountPercent}, deneme {global.TrialDays} gün.", currentUserService.UserId, cancellationToken);

        return await mediator.Send(new GetPlanCatalogAdminQuery(), cancellationToken);
    }
}
