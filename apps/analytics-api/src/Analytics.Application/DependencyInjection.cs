using Analytics.Application.Inventory;
using Analytics.Application.Metadata;
using Analytics.Application.Sales;
using Microsoft.Extensions.DependencyInjection;

namespace Analytics.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddAnalyticsApplication(this IServiceCollection services)
    {
        services.AddScoped<IInventoryAnalyticsService, InventoryAnalyticsService>();
        services.AddScoped<IMetadataService, MetadataService>();
        services.AddScoped<ISalesAnalyticsService, SalesAnalyticsService>();
        return services;
    }
}
