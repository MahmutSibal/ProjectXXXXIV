using System.Linq.Expressions;

namespace AppSukran.Application.Common;

/// <summary>
/// İki filtre ifadesini VE ile birleştirir.
/// </summary>
/// <remarks>
/// Doğrudan <c>Expression.AndAlso(a.Body, b.Body)</c> yazmak çalışmaz: her lambda'nın
/// kendi parametre nesnesi vardır ve EF, gövdede tanınmayan bir parametre görünce
/// "variable of type ... referenced from scope, but it is not defined" hatası verir.
/// Bu yüzden ikinci ifadenin parametresi birincininkiyle değiştirilir.
/// </remarks>
public static class ExpressionComposer
{
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var parameter = left.Parameters[0];
        var reboundRight = new ParameterReplacer(right.Parameters[0], parameter).Visit(right.Body);
        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(left.Body, reboundRight!), parameter);
    }

    /// <summary>İlk filtre henüz yoksa ikincisini olduğu gibi kullanır.</summary>
    public static Expression<Func<T, bool>> AndNullable<T>(
        Expression<Func<T, bool>>? left,
        Expression<Func<T, bool>> right)
        => left is null ? right : left.And(right);

    private sealed class ParameterReplacer(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
            => node == from ? to : base.VisitParameter(node);
    }
}
