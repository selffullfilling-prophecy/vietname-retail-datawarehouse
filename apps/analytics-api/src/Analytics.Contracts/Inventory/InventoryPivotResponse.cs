namespace Analytics.Contracts.Inventory;

public sealed record InventoryPivotResponse(
    DateTime GeneratedAtUtc,
    string TimeLevel,
    string? SelectedYear,
    string? SelectedQuarter,
    string StoreLevel,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    IReadOnlyList<InventoryPivotAxisMemberDto> TimeAxis,
    IReadOnlyList<InventoryPivotAxisMemberDto> StoreAxis,
    IReadOnlyList<InventoryPivotCellDto> Cells);

public sealed record InventoryPivotAxisMemberDto(
    string Key,
    string Label,
    string? MemberUniqueName);

public sealed record InventoryPivotCellDto(
    string TimeKey,
    string StoreKey,
    decimal AverageInventory);
