using Analytics.Ssas.Metadata;
using Microsoft.Extensions.DependencyInjection;

namespace Analytics.Ssas;

public static class DependencyInjection
{
    public static IServiceCollection AddSsasServices(this IServiceCollection services)
    {
        services.AddScoped<ISsasMetadataProvider, SsasMetadataProvider>();
        return services;
    }
}
