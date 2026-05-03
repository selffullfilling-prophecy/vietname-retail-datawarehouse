namespace Analytics.Ssas;

public sealed class SsasConnectionSettings
{
    public required string DataSource { get; init; }
    public required string Catalog { get; init; }
    public required string Cube { get; init; }

    public string ConnectionString => $"Data Source={DataSource};Catalog={Catalog};";

    public string CubeMdxIdentifier => ToMdxIdentifier(Cube);

    private static string ToMdxIdentifier(string value)
    {
        return $"[{value.Replace("]", "]]", StringComparison.Ordinal)}]";
    }
}
