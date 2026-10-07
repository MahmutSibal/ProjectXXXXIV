using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Complaints.Commands;

public sealed record UpdateComplaintCommand(string Id, ComplaintStatus Status, string Response) : IRequest;
