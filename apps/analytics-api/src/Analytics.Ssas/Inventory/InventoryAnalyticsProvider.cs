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

    public InventoryTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter)
    {
        var normalizedLevel = NormalizeLevel(level);
        var normalizedYear = NormalizeYear(year, normalizedLevel);
        var normalizedQuarter = NormalizeQuarter(quarter, normalizedLevel);

        var mdx = BuildTimeBreakdownMdx(normalizedLevel, normalizedYear, normalizedQuarter);

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
                "Check the Dim Time hierarchy paths and current query context.",
                ex);
        }
    }

    private string BuildConnectionString()
    {
        return $"Data Source={_settings.DataSource};Catalog={_settings.Catalog};";
    }

    private static string NormalizeLevel(string level)
    {
        return level.Trim().ToLowerInvariant() switch
        {
            "year" => "year",
            "quarter" => "quarter",
            "month" => "month",
            _ => throw new ArgumentException("Level must be one of: year, quarter, month.", nameof(level))
        };
    }

    private static string? NormalizeYear(string? year, string level)
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

    private static string? NormalizeQuarter(string? quarter, string level)
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

    private static string BuildTimeBreakdownMdx(string level, string? year, string? quarter)
    {
        return level switch
        {
            "year" => """
                SELECT
                    {
                        [Measures].[Soluongtonkho]
                    } ON COLUMNS,
                    NON EMPTY
                        [Dim Time].[Nam].[Nam].Members
                    ON ROWS
                FROM [InventoryCube]
                """,
            "quarter" => string.Join(Environment.NewLine,
                "SELECT",
                "    {",
                "        [Measures].[Soluongtonkho]",
                "    } ON COLUMNS,",
                "    NON EMPTY",
                $"        Descendants([Dim Time].[Hierarchy].[Nam].&[{year}], [Dim Time].[Hierarchy].[Quy])",
                "    ON ROWS",
                "FROM [InventoryCube]"),
            "month" => string.Join(Environment.NewLine,
                "WITH",
                $"    SET [SelectedQuarter] AS {{ Descendants([Dim Time].[Hierarchy].[Nam].&[{year}], [Dim Time].[Hierarchy].[Quy]).Item({int.Parse(quarter!, CultureInfo.InvariantCulture) - 1}) }}",
                "SELECT",
                "    {",
                "        [Measures].[Soluongtonkho]",
                "    } ON COLUMNS,",
                "    NON EMPTY",
                "        Generate([SelectedQuarter], Descendants([Dim Time].[Hierarchy].CurrentMember, [Dim Time].[Hierarchy].[Thang]))",
                "    ON ROWS",
                "FROM [InventoryCube]"),
            _ => throw new ArgumentOutOfRangeException(nameof(level))
        };
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
            "month" => $"Month {normalizedKey}",
            _ => rawKey
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

        return Convert.ToDecimal(reader.GetValue(ordinal));
    }
}
