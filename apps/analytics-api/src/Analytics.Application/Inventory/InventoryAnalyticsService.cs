using Analytics.Contracts.Inventory;
using Analytics.Ssas.Inventory;

namespace Analytics.Application.Inventory;

public sealed class InventoryAnalyticsService : IInventoryAnalyticsService
{
    private readonly IInventoryAnalyticsProvider _inventoryAnalyticsProvider;

    public InventoryAnalyticsService(IInventoryAnalyticsProvider inventoryAnalyticsProvider)
    {
        _inventoryAnalyticsProvider = inventoryAnalyticsProvider;
    }

    public YearInventorySummaryResponse GetSummaryByYear()
    {
        var rows = _inventoryAnalyticsProvider.GetSummaryByYear();

        return new YearInventorySummaryResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Rows: rows);
    }

    public InventoryTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter)
    {
        var result = _inventoryAnalyticsProvider.GetTimeBreakdown(level, year, quarter);

        return new InventoryTimeBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }
}
