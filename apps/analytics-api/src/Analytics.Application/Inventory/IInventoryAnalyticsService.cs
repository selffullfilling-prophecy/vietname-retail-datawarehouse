using Analytics.Contracts.Inventory;

namespace Analytics.Application.Inventory;

public interface IInventoryAnalyticsService
{
    YearInventorySummaryResponse GetSummaryByYear();
    InventoryTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
    InventoryStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName);
    InventoryProductBreakdownResponse GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    InventoryPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    InventoryAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
}
