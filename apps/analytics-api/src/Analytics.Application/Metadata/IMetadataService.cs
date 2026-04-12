using Analytics.Contracts.Metadata;

namespace Analytics.Application.Metadata;

public interface IMetadataService
{
    MetadataOverviewResponse GetOverview();
}
