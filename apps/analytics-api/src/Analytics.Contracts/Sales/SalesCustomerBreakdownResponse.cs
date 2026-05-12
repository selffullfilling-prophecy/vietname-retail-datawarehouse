namespace Analytics.Contracts.Sales;

public sealed record SalesCustomerBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    IReadOnlyList<SalesCustomerBreakdownRowDto> Rows);

public sealed record SalesCustomerBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal Revenue,
    decimal SalesVolume);
