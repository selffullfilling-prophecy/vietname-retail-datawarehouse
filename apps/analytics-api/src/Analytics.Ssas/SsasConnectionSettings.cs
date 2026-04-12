namespace Analytics.Ssas;

public sealed class SsasConnectionSettings
{
    public required string DataSource { get; init; }
    public required string Catalog { get; init; }
}
