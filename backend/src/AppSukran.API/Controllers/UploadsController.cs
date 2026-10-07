using AppSukran.Application.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,RestaurantOwner")]
public sealed class UploadsController(IWebHostEnvironment environment, IRestaurantAccessGuard restaurantAccessGuard) : ControllerBase
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

        var webRoot = string.IsNullOrEmpty(environment.WebRootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot")
            : environment.WebRootPath;

        var restaurantFolder = Path.Combine(webRoot, "uploads", restaurantId);
        Directory.CreateDirectory(restaurantFolder);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(restaurantFolder, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var url = $"{Request.Scheme}://{Request.Host}/uploads/{restaurantId}/{fileName}";
        return Ok(new { url });
    }
}
