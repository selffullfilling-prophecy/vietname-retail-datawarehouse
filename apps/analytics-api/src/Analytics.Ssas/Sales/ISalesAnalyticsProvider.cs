using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public interface ISalesAnalyticsProvider
{
    IReadOnlyList<YearSalesSummaryRowDto> GetSummaryByYear();
    SalesTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter);
    SalesStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName);
}
