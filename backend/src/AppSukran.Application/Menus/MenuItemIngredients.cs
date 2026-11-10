namespace AppSukran.Application.Menus;

/// <summary>
/// Malzeme adlarını ve fiyatlarını birlikte temizler. İkisi aynı sırada tutulduğu için
/// boş bir adı atarken onun fiyatını da atmak gerekir; aksi hâlde fiyatlar kayardı.
/// </summary>
public static class MenuItemIngredients
{
    public static (List<string> Names, List<long?> Prices) Normalize(
        IReadOnlyCollection<string> names, IReadOnlyCollection<long?>? prices)
    {
        var priceList = prices?.ToList() ?? [];
        var resultNames = new List<string>();
        var resultPrices = new List<long?>();

        var index = 0;
        foreach (var raw in names)
        {
            var name = raw?.Trim();
            var price = index < priceList.Count ? priceList[index] : null;
            index++;

            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            resultNames.Add(name);
            resultPrices.Add(price);
        }

        // Hiç ücretli malzeme yoksa boş liste: eski kayıtlarla aynı biçim.
        return (resultNames, resultPrices.Any(price => price.HasValue) ? resultPrices : []);
    }
}
