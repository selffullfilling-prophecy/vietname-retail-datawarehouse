using Analytics.Contracts.Sales;

namespace Analytics.Ssas.Sales;

public sealed record SalesTimeBreakdownResult(
    string Level,
    string? SelectedYear,
    string? SelectedQuarter,
    string? DrillTargetLevel,
    IReadOnlyList<SalesTimeBreakdownRowDto> Rows);
