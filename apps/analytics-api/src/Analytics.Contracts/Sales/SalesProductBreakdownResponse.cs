namespace Analytics.Contracts.Sales;

public sealed record SalesProductBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    IReadOnlyList<SalesProductBreakdownRowDto> Rows);

public sealed record SalesProductBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal Revenue,
    decimal SalesVolume);
