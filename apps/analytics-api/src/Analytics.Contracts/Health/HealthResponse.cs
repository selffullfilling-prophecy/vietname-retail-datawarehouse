namespace Analytics.Contracts.Health;

public sealed record HealthResponse(
    string Status,
    string Service,
    DateTime TimeUtc,
    SsasConnectionInfo Ssas);

public sealed record SsasConnectionInfo(
    string DataSource,
    string Catalog,
    string Cube);
