namespace AppSukran.Application.Abstractions.Security;

public interface ICardNumberProtectionService
{
    string HashCardNumber(string cardNumber);
    bool VerifyCardNumber(string cardNumber, string cardHash);
    string NormalizeCardNumber(string cardNumber);
    bool IsValidCardNumber(string cardNumber);
    string DetectBrand(string cardNumber);
    string GetLast4(string cardNumber);
    bool IsExpiryValid(int expiryMonth, int expiryYear, DateTime? utcNow = null);
}