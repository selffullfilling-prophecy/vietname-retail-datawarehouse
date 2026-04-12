using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public sealed record InventoryStoreBreakdownResult(
    string Level,
    string? SelectedStateLabel,
    string? SelectedCityLabel,
    string? DrillTargetLevel,
    IReadOnlyList<InventoryStoreBreakdownRowDto> Rows);
