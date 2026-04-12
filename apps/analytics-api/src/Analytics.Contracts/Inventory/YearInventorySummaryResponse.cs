namespace Analytics.Contracts.Inventory;

public sealed record YearInventorySummaryResponse(
    DateTime GeneratedAtUtc,
    IReadOnlyList<YearInventorySummaryRowDto> Rows);

public sealed record YearInventorySummaryRowDto(
    string Year,
    decimal AverageInventory);
