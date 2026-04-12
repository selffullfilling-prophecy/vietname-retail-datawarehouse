namespace Analytics.Contracts.Sales;

public sealed record YearSalesSummaryResponse(
    DateTime GeneratedAtUtc,
    IReadOnlyList<YearSalesSummaryRowDto> Rows);

public sealed record YearSalesSummaryRowDto(
    string Year,
    decimal Revenue,
    decimal SalesVolume);
