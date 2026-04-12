namespace Analytics.Contracts.Inventory;

public sealed record InventoryTimeBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    string? SelectedYear,
    string? SelectedQuarter,
    string? DrillTargetLevel,
    IReadOnlyList<InventoryTimeBreakdownRowDto> Rows);

public sealed record InventoryTimeBreakdownRowDto(
    string Key,
    string Label,
    decimal AverageInventory,
    bool CanDrillDown);
