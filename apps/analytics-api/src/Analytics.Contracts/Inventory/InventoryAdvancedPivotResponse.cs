namespace Analytics.Contracts.Inventory;

public sealed record InventoryAdvancedPivotResponse(
    DateTime GeneratedAtUtc,
    string RowDimension,
    string RowLevel,
    string ColumnDimension,
    string ColumnLevel,
    string Measure,
    string MeasureLabel,
    IReadOnlyList<InventoryAdvancedPivotAxisMemberDto> RowAxis,
    IReadOnlyList<InventoryAdvancedPivotAxisMemberDto> ColumnAxis,
    IReadOnlyList<InventoryAdvancedPivotCellDto> Cells);

public sealed record InventoryAdvancedPivotAxisMemberDto(
    string Key,
    string Label,
    string MemberUniqueName);

public sealed record InventoryAdvancedPivotCellDto(
    string RowKey,
    string ColumnKey,
    decimal Value);
