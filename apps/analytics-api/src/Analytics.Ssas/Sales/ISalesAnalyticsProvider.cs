using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public interface ISalesAnalyticsProvider
{
    IReadOnlyList<YearSalesSummaryRowDto> GetSummaryByYear();
    SalesTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName);
    SalesStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName, string? customerMemberUniqueName);
    IReadOnlyList<SalesProductBreakdownRowDto> GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? customerMemberUniqueName);
    IReadOnlyList<SalesCustomerBreakdownRowDto> GetCustomerBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
    SalesPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    SalesAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName);
}
