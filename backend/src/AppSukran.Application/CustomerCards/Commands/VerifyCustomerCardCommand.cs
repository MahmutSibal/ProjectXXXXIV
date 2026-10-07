using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed record VerifyCustomerCardCommand(string CustomerCardId, string CardNumber) : IRequest<CustomerCardVerificationResponse>;