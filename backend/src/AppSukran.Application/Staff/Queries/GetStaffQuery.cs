using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Staff.Queries;

// Geçerli işletme sahibinin restoranına bağlı personeli listeler.
public sealed record GetStaffQuery : IRequest<IReadOnlyCollection<UserResponse>>;
