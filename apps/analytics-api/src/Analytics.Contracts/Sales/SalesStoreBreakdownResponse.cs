namespace Analytics.Contracts.Sales;

public sealed record SalesStoreBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<SalesStoreBreakdownRowDto> Rows);

public sealed record SalesStoreBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal Revenue,
    decimal SalesVolume,
    bool CanDrillDown);
