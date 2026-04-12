using Analytics.Contracts.Sales;

namespace Analytics.Application.Sales;

public interface ISalesAnalyticsService
{
    YearSalesSummaryResponse GetSummaryByYear();
    SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter);
}
