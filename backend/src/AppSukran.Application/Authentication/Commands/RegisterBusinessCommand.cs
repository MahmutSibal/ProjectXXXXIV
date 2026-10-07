using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

/// <summary>
/// Self-servis işletme kaydı: kullanıcı hesabı, restoran kaydı ve ücretsiz
/// deneme aboneliği tek adımda oluşturulur. SuperAdmin onayı gerektirmez.
/// </summary>
public sealed record RegisterBusinessCommand(
    string OwnerName,
    string Email,
    string Password,
    string BusinessName,
    string Phone,
    string Address,
    double Longitude,
    double Latitude,
    /// <summary>WhatsApp ile telefon doğrulandığında alınan tek kullanımlık jeton.</summary>
    string? PhoneVerificationTicket = null) : IRequest<TokenResponse>;
