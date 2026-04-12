namespace Analytics.Api.Options;

public sealed class SsasOptions
{
    public const string SectionName = "Ssas";

    public string DataSource { get; set; } = string.Empty;
    public string Catalog { get; set; } = string.Empty;
}
