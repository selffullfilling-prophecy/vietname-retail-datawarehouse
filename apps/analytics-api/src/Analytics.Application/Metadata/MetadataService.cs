using Analytics.Contracts.Metadata;
using Analytics.Ssas.Metadata;

namespace Analytics.Application.Metadata;

public sealed class MetadataService : IMetadataService
{
    private readonly ISsasMetadataProvider _ssasMetadataProvider;

    public MetadataService(ISsasMetadataProvider ssasMetadataProvider)
    {
        _ssasMetadataProvider = ssasMetadataProvider;
    }

    public MetadataOverviewResponse GetOverview()
    {
        var cubes = _ssasMetadataProvider.GetCubes();

        return new MetadataOverviewResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Cubes: cubes);
    }
}
