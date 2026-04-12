using Analytics.Contracts.Inventory;

namespace Analytics.Application.Inventory;

public interface IInventoryAnalyticsService
{
    YearInventorySummaryResponse GetSummaryByYear();
    InventoryTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter);
}
