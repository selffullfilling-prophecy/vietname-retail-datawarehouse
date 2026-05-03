namespace Analytics.Contracts.Metadata;

public sealed record MetadataOverviewResponse(
    DateTime GeneratedAtUtc,
    IReadOnlyList<CubeMetadataDto> Cubes);

public sealed record CubeMetadataDto(
    string Name,
    string Caption,
    IReadOnlyList<DimensionMetadataDto> Dimensions,
    IReadOnlyList<MeasureMetadataDto> Measures);

public sealed record DimensionMetadataDto(
    string Name,
    string Caption,
    IReadOnlyList<string> Attributes,
    IReadOnlyList<string> Hierarchies);

public sealed record MeasureMetadataDto(
    string Name,
    string Caption,
    string AggregateFunction);

public sealed record SsasSmokeTestResponse(
    DateTime GeneratedAtUtc,
    string DataSource,
    string Catalog,
    string Cube,
    IReadOnlyList<SsasSmokeTestStepDto> Steps);

public sealed record SsasSmokeTestStepDto(
    string Name,
    string Mdx,
    bool Succeeded,
    string? Value,
    string? Error);
