namespace Analytics.Contracts.Sales;

public sealed record SalesCustomerBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<SalesCustomerBreakdownRowDto> Rows);

public sealed record SalesCustomerBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal Revenue,
    decimal SalesVolume,
    bool CanDrillDown);
