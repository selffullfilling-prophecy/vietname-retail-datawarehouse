namespace Analytics.Contracts.Inventory;

public sealed record InventoryProductBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    IReadOnlyList<InventoryProductBreakdownRowDto> Rows);

public sealed record InventoryProductBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal AverageInventory);
