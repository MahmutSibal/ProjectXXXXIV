namespace AppSukran.Domain.Enums;

public enum UserRole
{
    SuperAdmin = 1,
    RestaurantOwner = 2,
    Customer = 4,
    // Restoran personeli rolleri (işletme sahibine bağlı çalışanlar)
    Kitchen = 8,
    Waiter = 16
}