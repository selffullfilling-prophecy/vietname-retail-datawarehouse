namespace Analytics.Api.Options;

public sealed class SsasOptions
{
    public const string SectionName = "Ssas";
    public const string DefaultDataSource = "localhost";
    public const string DefaultCatalog = "RetailAnalytics_SSAS";
    public const string DefaultCube = "Retail Analytics Cube";

    public string DataSource { get; set; } = DefaultDataSource;
    public string Catalog { get; set; } = DefaultCatalog;
    public string Cube { get; set; } = DefaultCube;
}
