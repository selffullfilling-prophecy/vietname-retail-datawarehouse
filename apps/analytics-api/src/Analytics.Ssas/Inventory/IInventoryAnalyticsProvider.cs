using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public interface IInventoryAnalyticsProvider
{
    IReadOnlyList<YearInventorySummaryRowDto> GetSummaryByYear();
    InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter);
    InventoryStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName);
}
