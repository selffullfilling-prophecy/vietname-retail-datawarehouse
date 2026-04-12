namespace Analytics.Contracts.Sales;

public sealed record SalesTimeBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    string? SelectedYear,
    string? SelectedQuarter,
    string? DrillTargetLevel,
    IReadOnlyList<SalesTimeBreakdownRowDto> Rows);

public sealed record SalesTimeBreakdownRowDto(
    string Key,
    string Label,
    decimal Revenue,
    decimal SalesVolume,
    bool CanDrillDown);
