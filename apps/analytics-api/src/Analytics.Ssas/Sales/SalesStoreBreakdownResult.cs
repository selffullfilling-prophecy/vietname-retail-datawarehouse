using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public sealed record SalesStoreBreakdownResult(
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<SalesStoreBreakdownRowDto> Rows);
