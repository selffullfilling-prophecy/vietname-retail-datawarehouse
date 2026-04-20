using Analytics.Contracts.Inventory;

namespace Analytics.Application.Inventory;

public interface IInventoryAnalyticsService
{
    YearInventorySummaryResponse GetSummaryByYear();
    InventoryTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName);
    InventoryStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter);
    InventoryPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName);
}
