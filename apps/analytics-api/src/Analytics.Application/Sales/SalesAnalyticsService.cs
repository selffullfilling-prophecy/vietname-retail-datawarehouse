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

    public SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        var result = _salesAnalyticsProvider.GetTimeBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName);

        return new SalesTimeBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter)
    {
        var result = _salesAnalyticsProvider.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter);

        return new SalesStoreBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesCustomerBreakdownResponse GetCustomerBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter)
    {
        var result = _salesAnalyticsProvider.GetCustomerBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter);

        return new SalesCustomerBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesPivotResponse GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        var result = _salesAnalyticsProvider.GetPivot(timeLevel, year, quarter, storeLevel, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName);

        return new SalesPivotResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            TimeLevel: result.TimeLevel,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            StoreLevel: result.StoreLevel,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            TimeAxis: result.TimeAxis,
            StoreAxis: result.StoreAxis,
            Cells: result.Cells);
    }
}
