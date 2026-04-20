namespace Analytics.Contracts.Sales;

public sealed record SalesPivotResponse(
    DateTime GeneratedAtUtc,
    string TimeLevel,
    string? SelectedYear,
    string? SelectedQuarter,
    string StoreLevel,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    IReadOnlyList<SalesPivotAxisMemberDto> TimeAxis,
    IReadOnlyList<SalesPivotAxisMemberDto> StoreAxis,
    IReadOnlyList<SalesPivotCellDto> Cells);

public sealed record SalesPivotAxisMemberDto(
    string Key,
    string Label,
    string? MemberUniqueName);

public sealed record SalesPivotCellDto(
    string TimeKey,
    string StoreKey,
    decimal Revenue,
    decimal SalesVolume);
