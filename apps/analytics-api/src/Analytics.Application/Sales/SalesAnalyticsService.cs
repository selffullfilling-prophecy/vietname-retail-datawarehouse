using Analytics.Contracts.Sales;
using Analytics.Ssas.Sales;

namespace Analytics.Application.Sales;

public sealed class SalesAnalyticsService : ISalesAnalyticsService
{
    private readonly ISalesAnalyticsProvider _salesAnalyticsProvider;

    public SalesAnalyticsService(ISalesAnalyticsProvider salesAnalyticsProvider)
    {
        _salesAnalyticsProvider = salesAnalyticsProvider;
    }

    public YearSalesSummaryResponse GetSummaryByYear()
    {
        var rows = _salesAnalyticsProvider.GetSummaryByYear();

        return new YearSalesSummaryResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Rows: rows);
    }

    public SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter)
    {
        var result = _salesAnalyticsProvider.GetTimeBreakdown(level, year, quarter);

        return new SalesTimeBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var result = _salesAnalyticsProvider.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName);

        return new SalesStoreBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }
}
