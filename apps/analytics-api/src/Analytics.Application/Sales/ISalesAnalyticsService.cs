using Analytics.Contracts.Sales;

namespace Analytics.Application.Sales;

public interface ISalesAnalyticsService
{
    YearSalesSummaryResponse GetSummaryByYear();
    SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName);
    SalesStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName, string? customerMemberUniqueName);
    SalesProductBreakdownResponse GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? customerMemberUniqueName);
    SalesCustomerBreakdownResponse GetCustomerBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName);
    SalesPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName);
    SalesAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName);
}
