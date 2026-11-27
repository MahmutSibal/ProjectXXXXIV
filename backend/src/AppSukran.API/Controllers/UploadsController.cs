using AppSukran.API.Storage;
using AppSukran.Application.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,RestaurantOwner")]
public sealed class UploadsController(ImageStorage storage, IRestaurantAccessGuard restaurantAccessGuard) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase) { ".png", ".jpg", ".jpeg", ".webp" };
    private const long MaxFileSizeBytes = 5 * 1024 * 1024;

    [HttpPost]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<IActionResult> Upload([FromForm] string restaurantId, IFormFile file, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            return BadRequest(new { error = "restaurantId is required." });
        }

        restaurantAccessGuard.EnsureCanAccess(restaurantId);

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { error = "File exceeds the 5MB limit." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { error = "Only PNG, JPG and WEBP images are allowed." });
        }

        // Restoran kimliği dosya yolunun parçası: yol dışına çıkmaya yarayacak karakter kabul edilmez.
        if (restaurantId.IndexOfAny(['/', '\\', '.']) >= 0)
        {
            return BadRequest(new { error = "Invalid restaurantId." });
        }

        await using var content = new MemoryStream();
        await file.CopyToAsync(content, cancellationToken);

        // Uzantı değil içerik belirleyicidir: görsel gibi adlandırılmış başka bir dosya reddedilir.
        if (!LooksLikeImage(content.GetBuffer().AsSpan(0, (int)content.Length), extension))
        {
            return BadRequest(new { error = "Only PNG, JPG and WEBP images are allowed." });
        }
        content.Position = 0;

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var url = await storage.SaveAsync(
            content, $"{restaurantId}/{fileName}", ImageStorage.ContentTypeFor(extension),
            $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new { url });
    }

    private static bool LooksLikeImage(ReadOnlySpan<byte> data, string extension) => extension.ToLowerInvariant() switch
    {
        ".png" => data.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        ".jpg" or ".jpeg" => data.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]),
        ".webp" => data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data.Slice(8, 4).SequenceEqual("WEBP"u8),
        _ => false,
    };
}
