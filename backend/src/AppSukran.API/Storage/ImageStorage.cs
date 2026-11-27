using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace AppSukran.API.Storage;

/// <summary>
/// Yüklenen görsellerin (menü, kategori, restoran) nerede tutulacağı (bölüm adı: "Storage").
///
/// Cloudflare R2 ayarları eksiksizse görseller R2'ye yüklenir ve Cloudflare'in ağından
/// (<see cref="PublicBaseUrl"/>) sunulur: backend görsel trafiği taşımaz ve görseller iki
/// sunucuda da aynıdır. Eksikse eskisi gibi sunucunun kendi diskine (wwwroot/uploads) yazılır.
///
/// Erişim anahtarları depoya yazılmaz; production'da SUKRAN_R2_ACCESS_KEY_ID ve
/// SUKRAN_R2_SECRET_ACCESS_KEY ortam değişkenlerinden okunur.
/// </summary>
public sealed class StorageSettings
{
    /// <summary>Cloudflare hesap numarası (R2 S3 adresindeki ilk parça).</summary>
    public string R2AccountId { get; set; } = string.Empty;

    public string R2Bucket { get; set; } = string.Empty;

    public string R2AccessKeyId { get; set; } = string.Empty;

    public string R2SecretAccessKey { get; set; } = string.Empty;

    /// <summary>
    /// Kovanın herkese açık adresi, ör. https://img.sukranapp.com (R2'ye bağlı özel alan adı).
    /// İsteğe bağlıdır: boşsa görseller R2'den okunup backend üzerinden (/uploads/...) sunulur.
    /// DİKKAT: https://pub-xxx.r2.dev adresleri Türkiye'de servis sağlayıcı düzeyinde engelli
    /// (TLS el sıkışması kesiliyor); müşteriye görsel göstermek için KULLANILMAZ.
    /// </summary>
    public string PublicBaseUrl { get; set; } = string.Empty;

    public bool IsR2Enabled =>
        !string.IsNullOrWhiteSpace(R2AccountId)
        && !string.IsNullOrWhiteSpace(R2Bucket)
        && !string.IsNullOrWhiteSpace(R2AccessKeyId)
        && !string.IsNullOrWhiteSpace(R2SecretAccessKey);
}

public sealed class ImageStorage(IOptions<StorageSettings> options, IWebHostEnvironment environment, ILogger<ImageStorage> logger) : IDisposable
{
    private readonly Lazy<AmazonS3Client> _client = new(() => CreateClient(options.Value));

    public bool IsRemote => options.Value.IsR2Enabled;

    public string PublicBaseUrl => options.Value.PublicBaseUrl.Trim().TrimEnd('/');

    /// <summary>Görseller doğrudan R2'nin herkese açık adresinden mi sunuluyor (yoksa backend üzerinden mi)?</summary>
    public bool HasPublicUrl => IsRemote && PublicBaseUrl.Length > 0;

    public string LocalUploadsRoot
    {
        get
        {
            var webRoot = string.IsNullOrEmpty(environment.WebRootPath)
                ? Path.Combine(environment.ContentRootPath, "wwwroot")
                : environment.WebRootPath;
            return Path.Combine(webRoot, "uploads");
        }
    }

    /// <summary>
    /// Görseli kaydeder ve herkese açık tam adresini döner.
    /// <paramref name="relativePath"/>: "restoranId/dosya.webp" (uploads/ öneki olmadan).
    /// </summary>
    public async Task<string> SaveAsync(Stream content, string relativePath, string contentType, string localBaseUrl, CancellationToken cancellationToken)
    {
        if (IsRemote)
        {
            await PutAsync(content, "uploads/" + relativePath, contentType, cancellationToken);
            // Herkese açık adres yoksa görsel bu backend'in /uploads yolundan (R2'den okunarak) sunulur.
            return HasPublicUrl
                ? $"{PublicBaseUrl}/uploads/{relativePath}"
                : $"{localBaseUrl.TrimEnd('/')}/uploads/{relativePath}";
        }

        var filePath = Path.Combine(LocalUploadsRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        await using (var stream = File.Create(filePath))
        {
            await content.CopyToAsync(stream, cancellationToken);
        }
        return $"{localBaseUrl.TrimEnd('/')}/uploads/{relativePath}";
    }

    public async Task PutAsync(Stream content, string key, string contentType, CancellationToken cancellationToken)
    {
        await _client.Value.PutObjectAsync(new PutObjectRequest
        {
            BucketName = options.Value.R2Bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType,
            // Dosya adları benzersiz (GUID) ve hiç değişmez: tarayıcı ve Cloudflare süresiz önbellekleyebilir.
            Headers = { CacheControl = "public, max-age=31536000, immutable" },
            // R2, AWS'nin akışlı imza/sağlama toplamı uzantılarını desteklemez.
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        }, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            await _client.Value.GetObjectMetadataAsync(options.Value.R2Bucket, key, cancellationToken);
            return true;
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <summary>R2'deki nesneyi okur; yoksa null.</summary>
    public async Task<GetObjectResponse?> GetAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            return await _client.Value.GetObjectAsync(options.Value.R2Bucket, key, cancellationToken);
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public static string ContentTypeFor(string extension) => extension.ToLowerInvariant() switch
    {
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".webp" => "image/webp",
        _ => "application/octet-stream",
    };

    private static AmazonS3Client CreateClient(StorageSettings settings)
    {
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{settings.R2AccountId.Trim()}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto",
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            Timeout = TimeSpan.FromSeconds(30),
        };
        return new AmazonS3Client(new BasicAWSCredentials(settings.R2AccessKeyId.Trim(), settings.R2SecretAccessKey.Trim()), config);
    }

    public void Dispose()
    {
        if (_client.IsValueCreated)
        {
            _client.Value.Dispose();
        }
        logger.LogDebug("ImageStorage kapatıldı.");
    }
}

/// <summary>
/// R2 açıkken, sunucunun diskinde kalmış eski görselleri (wwwroot/uploads) R2'ye bir kez kopyalar.
/// Her sunucu kendi diskindekileri gönderir (yedeğe geçişte oraya yüklenmiş görseller dahil);
/// R2'de zaten olan dosya atlanır, yani tekrar çalışması zararsızdır. Veritabanındaki eski adresler
/// (https://mahmutapp.../uploads/...) değişmez: o adrese gelen istek, dosya diskte yoksa R2'ye
/// yönlendirilir (Program.cs).
/// </summary>
public sealed class LocalUploadsToR2SyncWorker(ImageStorage storage, ILogger<LocalUploadsToR2SyncWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!storage.IsRemote || !Directory.Exists(storage.LocalUploadsRoot))
        {
            return;
        }

        // Uygulama açılışını yavaşlatmasın.
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        int uploaded = 0, skipped = 0, failed = 0;
        foreach (var file in Directory.EnumerateFiles(storage.LocalUploadsRoot, "*", SearchOption.AllDirectories))
        {
            if (stoppingToken.IsCancellationRequested) break;

            var key = "uploads/" + Path.GetRelativePath(storage.LocalUploadsRoot, file).Replace('\\', '/');
            try
            {
                if (await storage.ExistsAsync(key, stoppingToken))
                {
                    skipped++;
                    continue;
                }

                await using var stream = File.OpenRead(file);
                await storage.PutAsync(stream, key, ImageStorage.ContentTypeFor(Path.GetExtension(file)), stoppingToken);
                uploaded++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                failed++;
                logger.LogWarning(exception, "[R2] {Key} kopyalanamadı.", key);
            }
        }

        logger.LogInformation("[R2] Eski görseller: {Uploaded} kopyalandı, {Skipped} zaten vardı, {Failed} hata.", uploaded, skipped, failed);
    }
}
