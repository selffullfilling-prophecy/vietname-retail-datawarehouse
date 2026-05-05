using Analytics.Contracts.Metadata;

namespace Analytics.Ssas.Metadata;

public interface ISsasMetadataProvider
{
    IReadOnlyList<CubeMetadataDto> GetCubes();
    SsasSmokeTestResponse RunSmokeTest();
}
