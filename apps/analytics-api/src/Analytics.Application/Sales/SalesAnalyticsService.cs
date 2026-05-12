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

    public SalesTimeBreakdownResponse GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        var result = _salesAnalyticsProvider.GetTimeBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName, customerMemberUniqueName);

        return new SalesTimeBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedYear: result.SelectedYear,
            SelectedQuarter: result.SelectedQuarter,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesStoreBreakdownResponse GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        var result = _salesAnalyticsProvider.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter, productMemberUniqueName, customerMemberUniqueName);

        return new SalesStoreBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: result.Level,
            SelectedStateLabel: result.SelectedStateLabel,
            SelectedCityLabel: result.SelectedCityLabel,
            DrillTargetLevel: result.DrillTargetLevel,
            Rows: result.Rows);
    }

    public SalesProductBreakdownResponse GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? customerMemberUniqueName)
    {
        var rows = _salesAnalyticsProvider.GetProductBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, customerMemberUniqueName);

        return new SalesProductBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: level,
            Rows: rows);
    }

    public SalesCustomerBreakdownResponse GetCustomerBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName)
    {
        var rows = _salesAnalyticsProvider.GetCustomerBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName);

        return new SalesCustomerBreakdownResponse(
            GeneratedAtUtc: DateTime.UtcNow,
            Level: level,
            Rows: rows);
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

    public SalesAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        return _salesAnalyticsProvider.GetAdvancedPivot(rowDimension, rowLevel, columnDimension, columnLevel, measure, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName, customerMemberUniqueName);
    }
}
