namespace Analytics.Contracts.Sales;

public sealed record SalesAdvancedPivotResponse(
    DateTime GeneratedAtUtc,
    string RowDimension,
    string RowLevel,
    string ColumnDimension,
    string ColumnLevel,
    string Measure,
    string MeasureLabel,
    IReadOnlyList<SalesAdvancedPivotAxisMemberDto> RowAxis,
    IReadOnlyList<SalesAdvancedPivotAxisMemberDto> ColumnAxis,
    IReadOnlyList<SalesAdvancedPivotCellDto> Cells);

public sealed record SalesAdvancedPivotAxisMemberDto(
    string Key,
    string Label,
    string MemberUniqueName);

public sealed record SalesAdvancedPivotCellDto(
    string RowKey,
    string ColumnKey,
    decimal Value);
