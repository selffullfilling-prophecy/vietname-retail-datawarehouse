using Analytics.Ssas.Inventory;
using Analytics.Ssas.Metadata;
using Analytics.Ssas.Sales;
using Microsoft.Extensions.DependencyInjection;

namespace Analytics.Ssas;

public static class DependencyInjection
{
    public static IServiceCollection AddSsasServices(
        this IServiceCollection services,
        string dataSource,
        string catalog)
    {
        services.AddSingleton(new SsasConnectionSettings
        {
            DataSource = dataSource,
            Catalog = catalog
        });
        services.AddScoped<IInventoryAnalyticsProvider, InventoryAnalyticsProvider>();
        services.AddScoped<ISsasMetadataProvider, SsasMetadataProvider>();
        services.AddScoped<ISalesAnalyticsProvider, SalesAnalyticsProvider>();
        return services;
    }
}
