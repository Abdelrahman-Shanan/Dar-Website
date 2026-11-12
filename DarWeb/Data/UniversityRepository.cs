using Microsoft.Data.SqlClient;

namespace DarWeb.Data;

public sealed record University(int Id, string Name, string? City);

/// <summary>
/// مثال على نمط ADO.NET المعتمد في المشروع (جدول University):
/// اتصال داخل using، أمر مُعامَل (parameterized)، قراءة بـ SqlDataReader.
/// انسخ هذا النمط لباقي الجداول (Users, Apartment, Rental_request ...).
/// </summary>
public sealed class UniversityRepository
{
    private readonly IDbConnectionFactory _db;

    public UniversityRepository(IDbConnectionFactory db) => _db = db;

    public async Task<List<University>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT university_id, name, city FROM University ORDER BY name;";
        var result = new List<University>();

        await using var conn = _db.Create();
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            result.Add(new University(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2)));
        }
        return result;
    }

    public async Task<University?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        const string sql = "SELECT university_id, name, city FROM University WHERE university_id = @id;";

        await using var conn = _db.Create();
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add("@id", System.Data.SqlDbType.Int).Value = id;
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        return await reader.ReadAsync(ct)
            ? new University(reader.GetInt32(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2))
            : null;
    }
}
