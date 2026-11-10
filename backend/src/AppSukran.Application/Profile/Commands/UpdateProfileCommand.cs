using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Profile.Commands;

/// <param name="Phone">null gönderilirse kayıtlı değer korunur.</param>
/// <param name="Address">null gönderilirse kayıtlı değer korunur.</param>
/// <param name="MarketingConsent">null gönderilirse kayıtlı değer korunur.</param>
public sealed record UpdateProfileCommand(
    string Name,
    string? Phone = null,
    string? Address = null,
    bool? MarketingConsent = null) : IRequest<UserResponse>;
