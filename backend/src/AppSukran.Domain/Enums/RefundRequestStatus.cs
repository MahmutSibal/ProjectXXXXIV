namespace AppSukran.Domain.Enums;

public enum RefundRequestStatus
{
    /// <summary>Yeni; işletme henüz ilgilenmedi.</summary>
    Pending = 1,

    /// <summary>İade yapıldı.</summary>
    Completed = 2,

    /// <summary>İşletme talebi reddetti.</summary>
    Rejected = 3
}
