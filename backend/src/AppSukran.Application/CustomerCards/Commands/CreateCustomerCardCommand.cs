using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed record CreateCustomerCardCommand(
    string CardholderName,
    string CardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string Cvv,
    bool IsDefault) : IRequest<CustomerCardResponse>;