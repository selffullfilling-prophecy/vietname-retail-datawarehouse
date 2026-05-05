using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public sealed record SalesCustomerBreakdownResult(
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<SalesCustomerBreakdownRowDto> Rows);
