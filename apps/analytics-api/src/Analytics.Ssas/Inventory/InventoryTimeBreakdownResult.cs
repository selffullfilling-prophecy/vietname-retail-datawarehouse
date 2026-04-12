using Analytics.Contracts.Inventory;

namespace Analytics.Ssas.Inventory;

public sealed record InventoryTimeBreakdownResult(
    string Level,
    string? SelectedYear,
    string? SelectedQuarter,
    string? DrillTargetLevel,
    IReadOnlyList<InventoryTimeBreakdownRowDto> Rows);
