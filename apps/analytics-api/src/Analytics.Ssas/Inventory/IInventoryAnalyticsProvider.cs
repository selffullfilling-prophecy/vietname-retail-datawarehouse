using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public interface IInventoryAnalyticsProvider
{
    IReadOnlyList<YearInventorySummaryRowDto> GetSummaryByYear();
    InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
    InventoryStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName);
    IReadOnlyList<InventoryProductBreakdownRowDto> GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    InventoryPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    InventoryAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
}
