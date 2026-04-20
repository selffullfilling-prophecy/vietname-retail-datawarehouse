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
        const string mdx = """
            SELECT
                {
                    [Measures].[Soluongtonkho]
                } ON COLUMNS,
                NON EMPTY
                    [Dim Time].[Nam].[Nam].Members
                ON ROWS
            FROM [InventoryCube]
            """;

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
            throw new InvalidOperationException(
                "Failed to query yearly inventory summary from SSAS. " +
                "Check the cube name, measure name, and the Dim Time year attribute path in the deployed model.",
                ex);
        }
    }

    public InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var normalizedLevel = NormalizeTimeLevel(level);
        var normalizedYear = NormalizeRequiredYear(year, normalizedLevel);
        var normalizedQuarter = NormalizeRequiredQuarter(quarter, normalizedLevel);
        var storeFilterExpression = BuildStoreFilterExpression(
            NormalizeOptionalUniqueName(stateMemberUniqueName),
            NormalizeOptionalUniqueName(cityMemberUniqueName));
        var mdx = BuildTimeBreakdownMdx(normalizedLevel, normalizedYear, normalizedQuarter, storeFilterExpression);

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
            throw new InvalidOperationException(
                "Failed to query time breakdown from InventoryCube. " +
                "Check the Dim Time hierarchy paths, current time level, and active store filter context.",
                ex);
        }
    }

    public InventoryStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter)
    {
        var normalizedLevel = NormalizeStoreLevel(level);
        var normalizedStateUniqueName = NormalizeStoreParentMember(stateMemberUniqueName, normalizedLevel, "state");
        var normalizedCityUniqueName = NormalizeStoreParentMember(cityMemberUniqueName, normalizedLevel, "city");
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var timeFilterExpression = BuildTimeFilterExpression(normalizedYear, normalizedQuarter);
        var mdx = BuildStoreBreakdownMdx(normalizedLevel, normalizedStateUniqueName, normalizedCityUniqueName, timeFilterExpression);

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
            throw new InvalidOperationException(
                "Failed to query store breakdown from InventoryCube. " +
                "Check the Dim Store hierarchy path, selected parent member, and active time filter context.",
                ex);
        }
    }

    public InventoryPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var normalizedTimeLevel = NormalizeTimeLevel(timeLevel);
        var normalizedYear = NormalizeRequiredYear(year, normalizedTimeLevel);
        var normalizedQuarter = NormalizeRequiredQuarter(quarter, normalizedTimeLevel);
        var normalizedStoreLevel = NormalizeStoreLevel(storeLevel);
        var normalizedStateUniqueName = NormalizeStoreParentMember(stateMemberUniqueName, normalizedStoreLevel, "state");
        var normalizedCityUniqueName = NormalizeStoreParentMember(cityMemberUniqueName, normalizedStoreLevel, "city");
        var mdx = BuildPivotMdx(
            normalizedTimeLevel,
            normalizedYear,
            normalizedQuarter,
            normalizedStoreLevel,
            normalizedStateUniqueName,
            normalizedCityUniqueName);

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
            throw new InvalidOperationException(
                "Failed to query pivot data from InventoryCube. " +
                "Check the combined time and store hierarchy paths used for the current OLAP context.",
                ex);
        }
    }

    private string BuildConnectionString()
    {
        return $"Data Source={_settings.DataSource};Catalog={_settings.Catalog};";
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

    private static string BuildTimeBreakdownMdx(string level, string? year, string? quarter, string? storeFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedTimeMembers] AS {BuildTimeSetExpression(level, year, quarter)}",
            "SELECT",
            "    {",
            "        [Measures].[Soluongtonkho]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedTimeMembers] ON ROWS",
            "FROM [InventoryCube]",
            BuildWhereClause(storeFilterExpression));
    }

    private static string BuildStoreBreakdownMdx(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? timeFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedStoreMembers] AS {BuildStoreSetExpression(level, stateMemberUniqueName, cityMemberUniqueName)}",
            "SELECT",
            "    {",
            "        [Measures].[Soluongtonkho]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedStoreMembers] ON ROWS",
            "FROM [InventoryCube]",
            BuildWhereClause(timeFilterExpression));
    }

    private static string BuildPivotMdx(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedTimeMembers] AS {BuildTimeSetExpression(timeLevel, year, quarter)}",
            $"    SET [SelectedStoreMembers] AS {BuildStoreSetExpression(storeLevel, stateMemberUniqueName, cityMemberUniqueName)}",
            "SELECT",
            "    {",
            "        [Measures].[Soluongtonkho]",
            "    } ON COLUMNS,",
            "    NON EMPTY CrossJoin([SelectedTimeMembers], [SelectedStoreMembers]) ON ROWS",
            "FROM [InventoryCube]");
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

    private static string BuildStoreSetExpression(string level, string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        return level switch
        {
            "state" => "[Dim Store].[Hierarchy].[Bang].Members",
            "city" => $"Descendants(StrToMember('{EscapeMdxString(stateMemberUniqueName!)}', CONSTRAINED), [Dim Store].[Hierarchy].[Thanhpho])",
            "store" => $"Descendants(StrToMember('{EscapeMdxString(cityMemberUniqueName!)}', CONSTRAINED), [Dim Store].[Hierarchy].[Macuahang])",
            _ => throw new ArgumentOutOfRangeException(nameof(level))
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

    private static string? BuildStoreFilterExpression(string? stateMemberUniqueName, string? cityMemberUniqueName)
    {
        var selectedMember = cityMemberUniqueName ?? stateMemberUniqueName;
        if (string.IsNullOrWhiteSpace(selectedMember))
        {
            return null;
        }

        return $"StrToMember('{EscapeMdxString(selectedMember)}', CONSTRAINED)";
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
