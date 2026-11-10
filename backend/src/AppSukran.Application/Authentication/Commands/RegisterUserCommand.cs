using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

/// <summary>
/// Herkese açık üyelik: QR menüden üye olan MÜŞTERİ hesabı açar.
///
/// Rol ve restoran istemciden ALINMAZ. Eskiden alınıyordu ve herkes istediği restoranın
/// "sahibi" ya da personeli olarak kayıt olup o restoranın ödeme bilgilerini
/// değiştirebiliyordu. İşletme hesabı register-business ile, personel ise işletme
/// sahibinin panelinden açılır.
/// </summary>
public sealed record RegisterUserCommand(
    string Name,
    string Email,
    string Password,
    string? Phone = null,
    string? Address = null,
    bool MarketingConsent = false) : IRequest<TokenResponse>;
