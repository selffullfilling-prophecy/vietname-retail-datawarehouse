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

    public InventoryTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var result = _inventoryAnalyticsProvider.GetTimeBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName);

        return new InventoryTimeBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public InventoryStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter)
    {
        var result = _inventoryAnalyticsProvider.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter);

        return new InventoryStoreBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public InventoryPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var result = _inventoryAnalyticsProvider.GetPivot(timeLevel, year, quarter, storeLevel, stateMemberUniqueName, cityMemberUniqueName);

        return new InventoryPivotResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            TimeLevel: result.TimeLevel,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            StoreLevel: result.StoreLevel,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            TimeAxis: result.TimeAxis,
            StoreAxis: result.StoreAxis,
            Cells: result.Cells);
    }
}
