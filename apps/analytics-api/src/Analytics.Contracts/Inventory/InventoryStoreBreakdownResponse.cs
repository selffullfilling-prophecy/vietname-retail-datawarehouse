namespace Analytics.Contracts.Inventory;

public sealed record InventoryStoreBreakdownResponse(
    DateTime GeneratedAtUtc,
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<InventoryStoreBreakdownRowDto> Rows);

public sealed record InventoryStoreBreakdownRowDto(
    string Key,
    string Label,
    string MemberUniqueName,
    decimal AverageInventory,
    bool CanDrillDown);
