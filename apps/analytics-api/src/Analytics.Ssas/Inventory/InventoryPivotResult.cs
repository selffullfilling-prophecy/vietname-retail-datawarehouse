using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public sealed record InventoryPivotResult(
    string TimeLevel,
    string? SelectedYear,
    string? SelectedQuarter,
    string StoreLevel,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    IReadOnlyList<InventoryPivotAxisMemberDto> TimeAxis,
    IReadOnlyList<InventoryPivotAxisMemberDto> StoreAxis,
    IReadOnlyList<InventoryPivotCellDto> Cells);
