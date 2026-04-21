using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public interface IInventoryAnalyticsProvider
{
    IReadOnlyList<YearInventorySummaryRowDto> GetSummaryByYear();
    InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    InventoryStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter);
    InventoryPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
}
