using Microsoft.Data.SqlClient;

namespace DarWeb.Data;

public interface IDbConnectionFactory
{
    /// <summary>ينشئ اتصالًا جديدًا (غير مفتوح). تأكد من تغليفه بـ using.</summary>
    SqlConnection Create();
}

public sealed class SqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DarDb")
            ?? throw new InvalidOperationException("Connection string 'DarDb' is missing from appsettings.json.");
    }

    public SqlConnection Create() => new(_connectionString);
}
