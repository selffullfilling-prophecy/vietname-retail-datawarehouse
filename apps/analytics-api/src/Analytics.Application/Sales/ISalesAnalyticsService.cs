using Analytics.Contracts.Sales;

namespace Analytics.Application.Sales;

public interface ISalesAnalyticsService
{
    YearSalesSummaryResponse GetSummaryByYear();
    SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    SalesStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter);
    SalesPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
}
