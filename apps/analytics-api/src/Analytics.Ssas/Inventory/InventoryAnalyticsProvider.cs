using Analytics.Contracts.Inventory;
using Microsoft.AnalysisServices.AdomdClient;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Analytics.Ssas.Inventory;

public sealed class InventoryAnalyticsProvider : IInventoryAnalyticsProvider
{
    private readonly SsasConnectionSettings _settings;

    public InventoryAnalyticsProvider(SsasConnectionSettings settings)
    {
        _settings = settings;
    }

    public IReadOnlyList<YearInventorySummaryRowDto> GetSummaryByYear()
    {
        var mdx = string.Join(
            Environment.NewLine,
            "SELECT",
            "    {",
            "        [Measures].[Inventory Average Quantity]",
            "    } ON COLUMNS,",
            "    NON EMPTY",
            "        [Dim Time].[Nam].[Nam].Members",
            "    ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}");

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            using var reader = command.ExecuteReader();

            var rows = new List<YearInventorySummaryRowDto>();
            while (reader.Read())
            {
                var year = Convert.ToString(reader[0]) ?? string.Empty;
                var averageInventory = ReadDecimal(reader, 1);

                rows.Add(new YearInventorySummaryRowDto(
                    Year: year,
                    AverageInventory: averageInventory));
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory yearly summary query", _settings, mdx, ex);
        }
    }

    public InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName)
    {
        var normalizedLevel = NormalizeTimeLevel(level);
        var normalizedYear = NormalizeRequiredYear(year, normalizedLevel);
        var normalizedQuarter = NormalizeRequiredQuarter(quarter, normalizedLevel);
        var storeFilterExpression = BuildStoreFilterExpression(
            NormalizeOptionalUniqueName(stateMemberUniqueName),
            NormalizeOptionalUniqueName(cityMemberUniqueName),
            NormalizeOptionalUniqueName(storeMemberUniqueName));
        var productFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName));
        var mdx = BuildTimeBreakdownMdx(normalizedLevel, normalizedYear, normalizedQuarter, storeFilterExpression, productFilterExpression);

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            using var reader = command.ExecuteReader();

            var rows = new List<InventoryTimeBreakdownRowDto>();
            var rowIndex = 0;
            while (reader.Read())
            {
                var rawKey = ReadAxisLabel(reader);
                var key = ResolveBreakdownKey(normalizedLevel, rawKey, normalizedQuarter, rowIndex);
                var label = ResolveBreakdownLabel(normalizedLevel, rawKey, key);
                var averageInventory = ReadDecimal(reader, reader.FieldCount - 1);

                rows.Add(new InventoryTimeBreakdownRowDto(
                    Key: key,
                    Label: label,
                    AverageInventory: averageInventory,
                    CanDrillDown: normalizedLevel is "year" or "quarter"));

                rowIndex++;
            }

            return new InventoryTimeBreakdownResult(
                Level: normalizedLevel,
                SelectedYear: normalizedYear,
                SelectedQuarter: normalizedQuarter,
                DrillTargetLevel: normalizedLevel switch
                {
                    "year" => "quarter",
                    "quarter" => "month",
                    _ => null
                },
                Rows: rows);
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory time breakdown query", _settings, mdx, ex);
        }
    }

    public InventoryStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName)
    {
        var normalizedLevel = NormalizeStoreLevel(level);
        var normalizedStateUniqueName = NormalizeStoreParentMember(stateMemberUniqueName, normalizedLevel, "state");
        var normalizedCityUniqueName = NormalizeStoreParentMember(cityMemberUniqueName, normalizedLevel, "city");
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var timeFilterExpression = BuildTimeFilterExpression(normalizedYear, normalizedQuarter);
        var productFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName));
        var mdx = BuildStoreBreakdownMdx(normalizedLevel, normalizedStateUniqueName, normalizedCityUniqueName, timeFilterExpression, productFilterExpression);

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rows = new List<InventoryStoreBreakdownRowDto>();
            if (cellSet.Axes.Count < 2)
            {
                return new InventoryStoreBreakdownResult(
                    Level: normalizedLevel,
                    SelectedStateLabel: normalizedLevel is "city" or "store" ? ExtractLabelFromUniqueName(normalizedStateUniqueName) : null,
                    SelectedCityLabel: normalizedLevel == "store" ? ExtractLabelFromUniqueName(normalizedCityUniqueName) : null,
                    DrillTargetLevel: normalizedLevel switch
                    {
                        "state" => "city",
                        "city" => "store",
                        _ => null
                    },
                    Rows: rows);
            }

            var columnsCount = cellSet.Axes[0].Set.Tuples.Count;
            var rowTuples = cellSet.Axes[1].Set.Tuples;

            for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
            {
                var member = rowTuples[rowIndex].Members[0];
                var averageInventory = ReadCellDecimal(cellSet, rowIndex, 0, columnsCount);

                rows.Add(new InventoryStoreBreakdownRowDto(
                    Key: member.Caption,
                    Label: member.Caption,
                    MemberUniqueName: member.UniqueName,
                    AverageInventory: averageInventory,
                    CanDrillDown: normalizedLevel is "state" or "city"));
            }

            return new InventoryStoreBreakdownResult(
                Level: normalizedLevel,
                SelectedStateLabel: normalizedLevel is "city" or "store" ? ExtractLabelFromUniqueName(normalizedStateUniqueName) : null,
                SelectedCityLabel: normalizedLevel == "store" ? ExtractLabelFromUniqueName(normalizedCityUniqueName) : null,
                DrillTargetLevel: normalizedLevel switch
                {
                    "state" => "city",
                    "city" => "store",
                    _ => null
                },
                Rows: rows);
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory store breakdown query", _settings, mdx, ex);
        }
    }

    public IReadOnlyList<InventoryProductBreakdownRowDto> GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        var normalizedLevel = NormalizeProductLevel(level);
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var mdx = BuildOneAxisBreakdownMdx(
            BuildProductSetExpression(normalizedLevel),
            BuildTimeFilterExpression(normalizedYear, normalizedQuarter),
            BuildStoreFilterExpression(
                NormalizeOptionalUniqueName(stateMemberUniqueName),
                NormalizeOptionalUniqueName(cityMemberUniqueName),
                NormalizeOptionalUniqueName(storeMemberUniqueName)));

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rows = new List<InventoryProductBreakdownRowDto>();
            if (cellSet.Axes.Count < 2)
            {
                return rows;
            }

            var columnsCount = cellSet.Axes[0].Set.Tuples.Count;
            var rowTuples = cellSet.Axes[1].Set.Tuples;

            for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
            {
                var member = rowTuples[rowIndex].Members[0];
                rows.Add(new InventoryProductBreakdownRowDto(
                    Key: member.UniqueName,
                    Label: member.Caption,
                    MemberUniqueName: member.UniqueName,
                    AverageInventory: ReadCellDecimal(cellSet, rowIndex, 0, columnsCount)));
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory product breakdown query", _settings, mdx, ex);
        }
    }

    public InventoryPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        var normalizedTimeLevel = NormalizeTimeLevel(timeLevel);
        var normalizedYear = NormalizeRequiredYear(year, normalizedTimeLevel);
        var normalizedQuarter = NormalizeRequiredQuarter(quarter, normalizedTimeLevel);
        var normalizedStoreLevel = NormalizeStoreLevel(storeLevel);
        var normalizedStateUniqueName = NormalizeStoreParentMember(stateMemberUniqueName, normalizedStoreLevel, "state");
        var normalizedCityUniqueName = NormalizeStoreParentMember(cityMemberUniqueName, normalizedStoreLevel, "city");
        var normalizedStoreUniqueName = NormalizeOptionalUniqueName(storeMemberUniqueName);
        var mdx = BuildPivotMdx(
            normalizedTimeLevel,
            normalizedYear,
            normalizedQuarter,
            normalizedStoreLevel,
            normalizedStateUniqueName,
            normalizedCityUniqueName,
            normalizedStoreUniqueName);

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var timeAxis = new Dictionary<string, InventoryPivotAxisMemberDto>();
            var storeAxis = new Dictionary<string, InventoryPivotAxisMemberDto>();
            var cells = new List<InventoryPivotCellDto>();

            if (cellSet.Axes.Count >= 2)
            {
                var columnsCount = cellSet.Axes[0].Set.Tuples.Count;
                var rowTuples = cellSet.Axes[1].Set.Tuples;

                for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
                {
                    var tuple = rowTuples[rowIndex];
                    if (tuple.Members.Count < 2)
                    {
                        continue;
                    }

                    var timeMember = tuple.Members[0];
                    var storeMember = tuple.Members[1];

                    if (!timeAxis.ContainsKey(timeMember.UniqueName))
                    {
                        timeAxis.Add(
                            timeMember.UniqueName,
                            new InventoryPivotAxisMemberDto(
                                Key: timeMember.UniqueName,
                                Label: ResolvePivotTimeLabel(normalizedTimeLevel, timeMember),
                                MemberUniqueName: timeMember.UniqueName));
                    }

                    if (!storeAxis.ContainsKey(storeMember.UniqueName))
                    {
                        storeAxis.Add(
                            storeMember.UniqueName,
                            new InventoryPivotAxisMemberDto(
                                Key: storeMember.UniqueName,
                                Label: storeMember.Caption,
                                MemberUniqueName: storeMember.UniqueName));
                    }

                    cells.Add(new InventoryPivotCellDto(
                        TimeKey: timeMember.UniqueName,
                        StoreKey: storeMember.UniqueName,
                        AverageInventory: ReadCellDecimal(cellSet, rowIndex, 0, columnsCount)));
                }
            }

            return new InventoryPivotResult(
                TimeLevel: normalizedTimeLevel,
                SelectedYear: normalizedYear,
                SelectedQuarter: normalizedQuarter,
                StoreLevel: normalizedStoreLevel,
                SelectedStateLabel: normalizedStoreLevel is "city" or "store" ? ExtractLabelFromUniqueName(normalizedStateUniqueName) : null,
                SelectedCityLabel: normalizedStoreLevel == "store" ? ExtractLabelFromUniqueName(normalizedCityUniqueName) : null,
                TimeAxis: timeAxis.Values.ToList(),
                StoreAxis: storeAxis.Values.ToList(),
                Cells: cells);
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory pivot query", _settings, mdx, ex);
        }
    }

    public InventoryAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName)
    {
        var normalizedRowDimension = NormalizePivotDimension(rowDimension);
        var normalizedColumnDimension = NormalizePivotDimension(columnDimension);
        if (normalizedRowDimension == normalizedColumnDimension)
        {
            throw new ArgumentException("Row dimension and column dimension must be different.");
        }

        var normalizedRowLevel = NormalizeDimensionLevel(normalizedRowDimension, rowLevel);
        var normalizedColumnLevel = NormalizeDimensionLevel(normalizedColumnDimension, columnLevel);
        var normalizedMeasure = NormalizeInventoryMeasure(measure);
        var measureExpression = BuildInventoryMeasureExpression(normalizedMeasure);
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var mdx = BuildAdvancedPivotMdx(
            BuildDimensionSetExpression(normalizedRowDimension, normalizedRowLevel),
            BuildDimensionSetExpression(normalizedColumnDimension, normalizedColumnLevel),
            measureExpression,
            BuildTimeFilterExpression(normalizedYear, normalizedQuarter),
            BuildStoreFilterExpression(
                NormalizeOptionalUniqueName(stateMemberUniqueName),
                NormalizeOptionalUniqueName(cityMemberUniqueName),
                NormalizeOptionalUniqueName(storeMemberUniqueName)),
            BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName)));

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rowAxis = new Dictionary<string, InventoryAdvancedPivotAxisMemberDto>();
            var columnAxis = new Dictionary<string, InventoryAdvancedPivotAxisMemberDto>();
            var cells = new List<InventoryAdvancedPivotCellDto>();

            if (cellSet.Axes.Count >= 2)
            {
                var rowTuples = cellSet.Axes[1].Set.Tuples;
                for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
                {
                    var tuple = rowTuples[rowIndex];
                    if (tuple.Members.Count < 2)
                    {
                        continue;
                    }

                    var rowMember = tuple.Members[0];
                    var columnMember = tuple.Members[1];
                    rowAxis.TryAdd(rowMember.UniqueName, new InventoryAdvancedPivotAxisMemberDto(rowMember.UniqueName, rowMember.Caption, rowMember.UniqueName));
                    columnAxis.TryAdd(columnMember.UniqueName, new InventoryAdvancedPivotAxisMemberDto(columnMember.UniqueName, columnMember.Caption, columnMember.UniqueName));
                    cells.Add(new InventoryAdvancedPivotCellDto(rowMember.UniqueName, columnMember.UniqueName, ReadCellDecimal(cellSet, rowIndex, 0, 1)));
                }
            }

            return new InventoryAdvancedPivotResponse(
                GeneratedAtUtc: DateTime.UtcNow,
                RowDimension: normalizedRowDimension,
                RowLevel: normalizedRowLevel,
                ColumnDimension: normalizedColumnDimension,
                ColumnLevel: normalizedColumnLevel,
                Measure: normalizedMeasure,
                MeasureLabel: normalizedMeasure == "inventoryQuantity" ? "Tồn kho tổng" : "Tồn kho trung bình",
                RowAxis: rowAxis.Values.ToList(),
                ColumnAxis: columnAxis.Values.ToList(),
                Cells: cells);
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Inventory advanced pivot query", _settings, mdx, ex);
        }
    }

    private string BuildConnectionString()
    {
        return _settings.ConnectionString;
    }

    private static string NormalizeTimeLevel(string level)
    {
        return level.Trim().ToLowerInvariant() switch
        {
            "year" => "year",
            "quarter" => "quarter",
            "month" => "month",
            _ => throw new ArgumentException("Level must be one of: year, quarter, month.", nameof(level))
        };
    }

    private static string? NormalizeRequiredYear(string? year, string level)
    {
        if (level == "year")
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(year) || !int.TryParse(year, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedYear))
        {
            throw new ArgumentException("A numeric year is required for quarter and month breakdown.", nameof(year));
        }

        return parsedYear.ToString(CultureInfo.InvariantCulture);
    }

    private static string? NormalizeRequiredQuarter(string? quarter, string level)
    {
        if (level != "month")
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(quarter) || !int.TryParse(quarter, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedQuarter))
        {
            throw new ArgumentException("A numeric quarter is required for month breakdown.", nameof(quarter));
        }

        if (parsedQuarter is < 1 or > 4)
        {
            throw new ArgumentException("Quarter must be between 1 and 4.", nameof(quarter));
        }

        return parsedQuarter.ToString(CultureInfo.InvariantCulture);
    }

    private static string NormalizeStoreLevel(string level)
    {
        return level.Trim().ToLowerInvariant() switch
        {
            "state" => "state",
            "city" => "city",
            "store" => "store",
            _ => throw new ArgumentException("Store level must be one of: state, city, store.", nameof(level))
        };
    }

    private static string NormalizeProductLevel(string level)
    {
        return level.Trim().ToLowerInvariant() switch
        {
            "mamh" or "product" => "mamh",
            "mota" or "description" => "mota",
            "kichco" or "size" => "kichco",
            "trongluong" or "weight" => "trongluong",
            _ => throw new ArgumentException("Product level must be one of: mamh, mota, kichco, trongluong.", nameof(level))
        };
    }

    private static string NormalizePivotDimension(string dimension)
    {
        return dimension.Trim().ToLowerInvariant() switch
        {
            "time" => "time",
            "store" => "store",
            "product" => "product",
            "customer" => throw new ArgumentException("Inventory pivot does not support the Customer dimension.", nameof(dimension)),
            _ => throw new ArgumentException("Dimension must be one of: time, store, product.", nameof(dimension))
        };
    }

    private static string NormalizeDimensionLevel(string dimension, string level)
    {
        return dimension switch
        {
            "time" => NormalizeTimeLevel(level),
            "store" => NormalizeStoreLevel(level),
            "product" => NormalizeProductLevel(level),
            _ => throw new ArgumentOutOfRangeException(nameof(dimension))
        };
    }

    private static string NormalizeInventoryMeasure(string measure)
    {
        return measure.Trim().ToLowerInvariant() switch
        {
            "averageinventory" or "inventoryaveragequantity" => "averageInventory",
            "inventoryquantity" or "inventoryquantitysum" or "soluongtonkho" => "inventoryQuantity",
            _ => throw new ArgumentException("Inventory measure must be one of: averageInventory, inventoryQuantity.", nameof(measure))
        };
    }

    private static string? NormalizeOptionalYear(string? year)
    {
        if (string.IsNullOrWhiteSpace(year))
        {
            return null;
        }

        if (!int.TryParse(year, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedYear))
        {
            throw new ArgumentException("Year filter must be numeric when provided.", nameof(year));
        }

        return parsedYear.ToString(CultureInfo.InvariantCulture);
    }

    private static string? NormalizeOptionalQuarter(string? quarter, string? year)
    {
        if (string.IsNullOrWhiteSpace(quarter))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(year))
        {
            throw new ArgumentException("Quarter filter requires a year filter.", nameof(quarter));
        }

        if (!int.TryParse(quarter, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedQuarter))
        {
            throw new ArgumentException("Quarter filter must be numeric when provided.", nameof(quarter));
        }

        if (parsedQuarter is < 1 or > 4)
        {
            throw new ArgumentException("Quarter filter must be between 1 and 4.", nameof(quarter));
        }

        return parsedQuarter.ToString(CultureInfo.InvariantCulture);
    }

    private static string? NormalizeOptionalUniqueName(string? memberUniqueName)
    {
        return string.IsNullOrWhiteSpace(memberUniqueName) ? null : memberUniqueName;
    }

    private static string? NormalizeStoreParentMember(string? memberUniqueName, string level, string parentKind)
    {
        var isRequired =
            (level == "city" && parentKind == "state") ||
            (level == "store" && (parentKind == "state" || parentKind == "city"));

        if (!isRequired)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(memberUniqueName))
        {
            throw new ArgumentException($"A {parentKind} member unique name is required for {level} breakdown.", nameof(memberUniqueName));
        }

        return memberUniqueName;
    }

    private string BuildTimeBreakdownMdx(string level, string? year, string? quarter, string? storeFilterExpression, string? productFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedTimeMembers] AS {BuildTimeSetExpression(level, year, quarter)}",
            "SELECT",
            "    {",
            "        [Measures].[Inventory Average Quantity]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedTimeMembers] ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(storeFilterExpression, productFilterExpression));
    }

    private string BuildStoreBreakdownMdx(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? timeFilterExpression, string? productFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedStoreMembers] AS {BuildStoreSetExpression(level, stateMemberUniqueName, cityMemberUniqueName)}",
            "SELECT",
            "    {",
            "        [Measures].[Inventory Average Quantity]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedStoreMembers] ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(timeFilterExpression, productFilterExpression));
    }

    private string BuildOneAxisBreakdownMdx(string rowSetExpression, params string?[] filterExpressions)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedMembers] AS {rowSetExpression}",
            "SELECT",
            "    {",
            "        [Measures].[Inventory Average Quantity]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedMembers] ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(filterExpressions));
    }

    private string BuildAdvancedPivotMdx(string rowSetExpression, string columnSetExpression, string measureExpression, params string?[] filterExpressions)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [RowMembers] AS {rowSetExpression}",
            $"    SET [ColumnMembers] AS {columnSetExpression}",
            "SELECT",
            $"    {{ {measureExpression} }} ON COLUMNS,",
            "    NON EMPTY CrossJoin([RowMembers], [ColumnMembers]) ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(filterExpressions));
    }

    private string BuildPivotMdx(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedTimeMembers] AS {BuildTimeSetExpression(timeLevel, year, quarter)}",
            $"    SET [SelectedStoreMembers] AS {BuildStoreSetExpression(storeLevel, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName)}",
            "SELECT",
            "    {",
            "        [Measures].[Inventory Average Quantity]",
            "    } ON COLUMNS,",
            "    NON EMPTY CrossJoin([SelectedTimeMembers], [SelectedStoreMembers]) ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}");
    }

    private static string BuildTimeSetExpression(string level, string? year, string? quarter)
    {
        return level switch
        {
            "year" => "[Dim Time].[Nam].[Nam].Members",
            "quarter" => $"Descendants([Dim Time].[Hierarchy].[Nam].&[{year}], [Dim Time].[Hierarchy].[Quy])",
            "month" => $"Generate({{ Descendants([Dim Time].[Hierarchy].[Nam].&[{year}], [Dim Time].[Hierarchy].[Quy]).Item({int.Parse(quarter!, CultureInfo.InvariantCulture) - 1}) }}, Descendants([Dim Time].[Hierarchy].CurrentMember, [Dim Time].[Hierarchy].[Thang]))",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
    }

    private static string BuildStoreSetExpression(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName = null)
    {
        return level switch
        {
            "state" => "[Dim Store].[Hierarchy].[Bang].Members",
            "city" => $"Descendants(StrToMember('{EscapeMdxString(stateMemberUniqueName!)}', CONSTRAINED), [Dim Store].[Hierarchy].[Thanhpho])",
            "store" => string.IsNullOrWhiteSpace(storeMemberUniqueName)
                ? $"Descendants(StrToMember('{EscapeMdxString(cityMemberUniqueName!)}', CONSTRAINED), [Dim Store].[Hierarchy].[Macuahang])"
                : $"{{ StrToMember('{EscapeMdxString(storeMemberUniqueName)}', CONSTRAINED) }}",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
    }

    private static string BuildProductSetExpression(string level)
    {
        return level switch
        {
            "mamh" => "[Dim Product].[Mamh].[Mamh].Members",
            "mota" => "[Dim Product].[Mota].[Mota].Members",
            "kichco" => "[Dim Product].[Kichco].[Kichco].Members",
            "trongluong" => "[Dim Product].[Trongluong].[Trongluong].Members",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
    }

    private static string BuildDimensionSetExpression(string dimension, string level)
    {
        return dimension switch
        {
            "time" => BuildTimeAxisSetExpression(level),
            "store" => BuildStoreAxisSetExpression(level),
            "product" => BuildProductSetExpression(level),
            _ => throw new ArgumentOutOfRangeException(nameof(dimension))
        };
    }

    private static string BuildTimeAxisSetExpression(string level)
    {
        return level switch
        {
            "year" => "[Dim Time].[Nam].[Nam].Members",
            "quarter" => "[Dim Time].[Hierarchy].[Quy].Members",
            "month" => "[Dim Time].[Hierarchy].[Thang].Members",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
    }

    private static string BuildStoreAxisSetExpression(string level)
    {
        return level switch
        {
            "state" => "[Dim Store].[Hierarchy].[Bang].Members",
            "city" => "[Dim Store].[Hierarchy].[Thanhpho].Members",
            "store" => "[Dim Store].[Hierarchy].[Macuahang].Members",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
    }

    private static string BuildInventoryMeasureExpression(string measure)
    {
        return measure switch
        {
            "averageInventory" => "[Measures].[Inventory Average Quantity]",
            "inventoryQuantity" => "[Measures].[Inventory Quantity Sum]",
            _ => throw new ArgumentOutOfRangeException(nameof(measure))
        };
    }

    private static string? BuildTimeFilterExpression(string? year, string? quarter)
    {
        if (string.IsNullOrWhiteSpace(year))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(quarter))
        {
            return $"[Dim Time].[Hierarchy].[Nam].&[{year}]";
        }

        return $"Descendants([Dim Time].[Hierarchy].[Nam].&[{year}], [Dim Time].[Hierarchy].[Quy]).Item({int.Parse(quarter, CultureInfo.InvariantCulture) - 1})";
    }

    private static string? BuildStoreFilterExpression(string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
    {
        var selectedMember = storeMemberUniqueName ?? cityMemberUniqueName ?? stateMemberUniqueName;
        if (string.IsNullOrWhiteSpace(selectedMember))
        {
            return null;
        }

        return BuildMemberFilterExpression(selectedMember);
    }

    private static string? BuildMemberFilterExpression(string? memberUniqueName)
    {
        if (string.IsNullOrWhiteSpace(memberUniqueName))
        {
            return null;
        }

        return $"StrToMember('{EscapeMdxString(memberUniqueName)}', CONSTRAINED)";
    }

    private static string BuildWhereClause(params string?[] expressions)
    {
        var activeExpressions = expressions
            .Where(expression => !string.IsNullOrWhiteSpace(expression))
            .ToArray();

        if (activeExpressions.Length == 0)
        {
            return string.Empty;
        }

        return $"WHERE ({string.Join(", ", activeExpressions)})";
    }

    private static string ResolveBreakdownKey(string level, string rawKey, string? quarter, int rowIndex)
    {
        if (level == "month" && quarter is not null)
        {
            var monthNumber = ((int.Parse(quarter, CultureInfo.InvariantCulture) - 1) * 3) + rowIndex + 1;
            return monthNumber.ToString(CultureInfo.InvariantCulture);
        }

        return level switch
        {
            "year" => rawKey,
            "quarter" => ExtractLastNumber(rawKey) ?? rawKey,
            "month" => ExtractLastNumber(rawKey) ?? rawKey,
            _ => rawKey
        };
    }

    private static string ResolveBreakdownLabel(string level, string rawKey, string normalizedKey)
    {
        return level switch
        {
            "year" => normalizedKey,
            "quarter" => rawKey,
            "month" => $"Tháng {normalizedKey}",
            _ => rawKey
        };
    }

    private static string ResolvePivotTimeLabel(string timeLevel, Member member)
    {
        if (!string.IsNullOrWhiteSpace(member.Caption))
        {
            return member.Caption;
        }

        var fallbackLabel = ExtractLabelFromUniqueName(member.UniqueName);

        return timeLevel switch
        {
            "month" => $"Tháng {fallbackLabel}",
            _ => fallbackLabel
        };
    }

    private static string? ExtractLastNumber(string input)
    {
        var matches = Regex.Matches(input, @"\d+");
        if (matches.Count == 0)
        {
            return null;
        }

        return matches[^1].Value;
    }

    private static string ExtractLabelFromUniqueName(string? uniqueName)
    {
        if (string.IsNullOrWhiteSpace(uniqueName))
        {
            return string.Empty;
        }

        var matches = Regex.Matches(uniqueName, @"&\[(.*?)\]");
        if (matches.Count == 0)
        {
            return uniqueName;
        }

        return matches[^1].Groups[1].Value;
    }

    private static string EscapeMdxString(string value)
    {
        return value.Replace("'", "''", StringComparison.Ordinal);
    }

    private static string ReadAxisLabel(AdomdDataReader reader)
    {
        for (var ordinal = 0; ordinal < reader.FieldCount; ordinal++)
        {
            if (reader.IsDBNull(ordinal))
            {
                continue;
            }

            var value = reader.GetValue(ordinal);
            if (value is string text && !decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out _))
            {
                return text;
            }
        }

        return Convert.ToString(reader[0]) ?? string.Empty;
    }

    private static decimal ReadDecimal(AdomdDataReader reader, int ordinal)
    {
        if (reader.IsDBNull(ordinal))
        {
            return 0m;
        }

        return Convert.ToDecimal(reader.GetValue(ordinal), CultureInfo.InvariantCulture);
    }

    private static decimal ReadCellDecimal(CellSet cellSet, int rowIndex, int columnIndex, int columnsCount)
    {
        var cellOrdinal = (rowIndex * columnsCount) + columnIndex;
        var value = cellSet.Cells[cellOrdinal].Value;

        if (value is null or DBNull)
        {
            return 0m;
        }

        return Convert.ToDecimal(value, CultureInfo.InvariantCulture);
    }
}
