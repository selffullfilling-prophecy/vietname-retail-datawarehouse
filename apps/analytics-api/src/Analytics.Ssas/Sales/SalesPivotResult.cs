using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public sealed record SalesPivotResult(
    string TimeLevel,
    string? SelectedYear,
    string? SelectedQuarter,
    string StoreLevel,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    IReadOnlyList<SalesPivotAxisMemberDto> TimeAxis,
    IReadOnlyList<SalesPivotAxisMemberDto> StoreAxis,
    IReadOnlyList<SalesPivotCellDto> Cells);
