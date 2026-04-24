using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public interface ISalesAnalyticsProvider
{
    IReadOnlyList<YearSalesSummaryRowDto> GetSummaryByYear();
    SalesTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    SalesStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter);
    SalesPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
}
