using System.Net;
using System.Text.Json;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Common.Security;
using FluentValidation;

namespace AppSukran.API.Middleware;

public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException validationException)
        {
            logger.LogWarning(validationException, "Validation failed.");
            await WriteProblemDetailsAsync(context, HttpStatusCode.BadRequest, "Validation failed", validationException.Errors.Select(error => error.ErrorMessage));
        }
        catch (InvalidOperationException invalidOperationException)
        {
            var (statusCode, title) = invalidOperationException.Message switch
            {
                "Invalid credentials." => (HttpStatusCode.Unauthorized, "Invalid credentials"),
                "Invalid refresh token." => (HttpStatusCode.Unauthorized, "Invalid refresh token"),
                "Email already exists." => (HttpStatusCode.Conflict, "Email already exists"),
                _ => (HttpStatusCode.BadRequest, "Request failed")
            };

            if (statusCode is HttpStatusCode.BadRequest && title == "Request failed")
            {
                logger.LogWarning(invalidOperationException, "Request failed.");
            }
            else
            {
                logger.LogInformation("{Title}: {Message}", title, invalidOperationException.Message);
            }

            await WriteProblemDetailsAsync(context, statusCode, title, [invalidOperationException.Message]);
        }
        catch (SubscriptionRequiredException subscriptionException)
        {
            // 402 Payment Required: istemci bu kodu görünce kullanıcıyı abonelik ekranına yönlendirir.
            logger.LogInformation("Subscription required: {Message}", subscriptionException.Message);
            await WriteProblemDetailsAsync(context, HttpStatusCode.PaymentRequired, "Subscription required", [subscriptionException.Message]);
        }
        catch (WhatsAppException whatsAppException)
        {
            // Mesajlar kullanıcıya gösterilmek üzere yazıldı ("numara WhatsApp'ta kayıtlı
            // değil" gibi); genel 500'e düşerse kullanıcı ne yapacağını bilemez.
            logger.LogWarning("WhatsApp: {Message}", whatsAppException.Message);
            await WriteProblemDetailsAsync(context, HttpStatusCode.BadRequest, "WhatsApp", [whatsAppException.Message]);
        }
        catch (UnauthorizedAccessException unauthorizedException)
        {
            logger.LogWarning("Forbidden: {Message}", unauthorizedException.Message);
            await WriteProblemDetailsAsync(context, HttpStatusCode.Forbidden, "Forbidden", [unauthorizedException.Message]);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled exception.");
            await WriteProblemDetailsAsync(context, HttpStatusCode.InternalServerError, "An unexpected error occurred");
        }
    }

    private static async Task WriteProblemDetailsAsync(HttpContext context, HttpStatusCode statusCode, string title, IEnumerable<string>? errors = null)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var payload = new
        {
            type = "about:blank",
            title,
            status = (int)statusCode,
            traceId = context.TraceIdentifier,
            errors = errors?.ToArray()
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}