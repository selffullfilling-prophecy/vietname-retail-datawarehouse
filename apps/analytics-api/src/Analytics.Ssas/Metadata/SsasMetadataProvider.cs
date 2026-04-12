using Analytics.Contracts.Metadata;
using Microsoft.AnalysisServices.AdomdClient;
using System.Data;

namespace Analytics.Ssas.Metadata;

public sealed class SsasMetadataProvider : ISsasMetadataProvider
{
    private readonly SsasConnectionSettings _settings;

    public SsasMetadataProvider(SsasConnectionSettings settings)
    {
        _settings = settings;
    }

    public IReadOnlyList<CubeMetadataDto> GetCubes()
    {
        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            var cubeTable = GetSchemaTable(connection, AdomdSchemaGuid.Cubes);
            var dimensionTable = GetSchemaTable(connection, AdomdSchemaGuid.Dimensions);
            var hierarchyTable = GetSchemaTable(connection, AdomdSchemaGuid.Hierarchies);
            var levelTable = GetSchemaTable(connection, AdomdSchemaGuid.Levels);
            var measureTable = GetSchemaTable(connection, AdomdSchemaGuid.Measures);

            var cubes = cubeTable.Rows
                .Cast<DataRow>()
                .Where(IsVisibleUserCube)
                .Select(cubeRow => BuildCubeMetadata(cubeRow, dimensionTable, hierarchyTable, levelTable, measureTable))
                .OrderBy(cube => cube.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            return cubes;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Failed to read SSAS metadata from '{_settings.DataSource}' / catalog '{_settings.Catalog}'. " +
                "Check that SSAS is running, the catalog name is correct, and the current Windows account can access Analysis Services.",
                ex);
        }
    }

    private string BuildConnectionString()
    {
        return $"Data Source={_settings.DataSource};Catalog={_settings.Catalog};";
    }

    private static DataTable GetSchemaTable(AdomdConnection connection, Guid schemaGuid)
    {
        return connection.GetSchemaDataSet(schemaGuid, null).Tables[0];
    }

    private static bool IsVisibleUserCube(DataRow row)
    {
        var cubeName = GetString(row, "CUBE_NAME");
        if (string.IsNullOrWhiteSpace(cubeName) || cubeName.StartsWith("$", StringComparison.Ordinal))
        {
            return false;
        }

        var cubeSource = GetInt(row, "CUBE_SOURCE");
        return cubeSource is null or 1;
    }

    private static CubeMetadataDto BuildCubeMetadata(
        DataRow cubeRow,
        DataTable dimensionTable,
        DataTable hierarchyTable,
        DataTable levelTable,
        DataTable measureTable)
    {
        var cubeName = GetString(cubeRow, "CUBE_NAME") ?? string.Empty;
        var cubeCaption = GetString(cubeRow, "CUBE_CAPTION") ?? cubeName;

        var dimensions = BuildDimensions(cubeName, dimensionTable, hierarchyTable, levelTable);
        var measures = BuildMeasures(cubeName, measureTable);

        return new CubeMetadataDto(
            Name: cubeName,
            Caption: cubeCaption,
            Dimensions: dimensions,
            Measures: measures);
    }

    private static IReadOnlyList<DimensionMetadataDto> BuildDimensions(
        string cubeName,
        DataTable dimensionTable,
        DataTable hierarchyTable,
        DataTable levelTable)
    {
        var dimensions = dimensionTable.Rows
            .Cast<DataRow>()
            .Where(row => MatchesCube(row, cubeName))
            .Where(row => !IsMeasuresDimension(row))
            .Select(row => new
            {
                Name = GetString(row, "DIMENSION_NAME") ?? GetString(row, "DIMENSION_CAPTION") ?? string.Empty,
                Caption = GetString(row, "DIMENSION_CAPTION") ?? GetString(row, "DIMENSION_NAME") ?? string.Empty,
                UniqueName = GetString(row, "DIMENSION_UNIQUE_NAME") ?? string.Empty
            })
            .Where(dimension => !string.IsNullOrWhiteSpace(dimension.Name))
            .DistinctBy(dimension => dimension.UniqueName)
            .OrderBy(dimension => dimension.Name, StringComparer.OrdinalIgnoreCase)
            .Select(dimension =>
            {
                var hierarchyRows = hierarchyTable.Rows
                    .Cast<DataRow>()
                    .Where(row => MatchesCube(row, cubeName))
                    .Where(row => string.Equals(GetString(row, "DIMENSION_UNIQUE_NAME"), dimension.UniqueName, StringComparison.OrdinalIgnoreCase))
                    .Where(row => !IsMeasuresHierarchy(row))
                    .ToArray();

                var attributes = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
                var hierarchies = new List<string>();

                foreach (var hierarchyRow in hierarchyRows)
                {
                    var hierarchyUniqueName = GetString(hierarchyRow, "HIERARCHY_UNIQUE_NAME");
                    if (string.IsNullOrWhiteSpace(hierarchyUniqueName))
                    {
                        continue;
                    }

                    var levelCaptions = levelTable.Rows
                        .Cast<DataRow>()
                        .Where(row => MatchesCube(row, cubeName))
                        .Where(row => string.Equals(GetString(row, "HIERARCHY_UNIQUE_NAME"), hierarchyUniqueName, StringComparison.OrdinalIgnoreCase))
                        .OrderBy(row => GetInt(row, "LEVEL_NUMBER") ?? int.MaxValue)
                        .Select(row => GetString(row, "LEVEL_CAPTION") ?? GetString(row, "LEVEL_NAME") ?? string.Empty)
                        .Where(level => !string.IsNullOrWhiteSpace(level))
                        .Where(level => !string.Equals(level, "(All)", StringComparison.OrdinalIgnoreCase))
                        .ToArray();

                    foreach (var level in levelCaptions)
                    {
                        attributes.Add(level);
                    }

                    if (levelCaptions.Length > 1)
                    {
                        hierarchies.Add(string.Join(" > ", levelCaptions));
                    }
                }

                return new DimensionMetadataDto(
                    Name: dimension.Name,
                    Caption: dimension.Caption,
                    Attributes: attributes.ToArray(),
                    Hierarchies: hierarchies
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                        .ToArray());
            })
            .ToArray();

        return dimensions;
    }

    private static IReadOnlyList<MeasureMetadataDto> BuildMeasures(string cubeName, DataTable measureTable)
    {
        var measures = measureTable.Rows
            .Cast<DataRow>()
            .Where(row => MatchesCube(row, cubeName))
            .Select(row => new MeasureMetadataDto(
                Name: GetString(row, "MEASURE_NAME") ?? string.Empty,
                Caption: GetString(row, "MEASURE_CAPTION") ?? GetString(row, "MEASURE_NAME") ?? string.Empty,
                AggregateFunction: MapAggregator(GetInt(row, "MEASURE_AGGREGATOR"))))
            .Where(measure => !string.IsNullOrWhiteSpace(measure.Name))
            .DistinctBy(measure => measure.Name)
            .OrderBy(measure => measure.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return measures;
    }

    private static bool MatchesCube(DataRow row, string cubeName)
    {
        return string.Equals(GetString(row, "CUBE_NAME"), cubeName, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMeasuresDimension(DataRow row)
    {
        var uniqueName = GetString(row, "DIMENSION_UNIQUE_NAME");
        var caption = GetString(row, "DIMENSION_CAPTION");
        var name = GetString(row, "DIMENSION_NAME");

        return string.Equals(uniqueName, "[Measures]", StringComparison.OrdinalIgnoreCase)
            || string.Equals(caption, "Measures", StringComparison.OrdinalIgnoreCase)
            || string.Equals(name, "Measures", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMeasuresHierarchy(DataRow row)
    {
        var dimensionUniqueName = GetString(row, "DIMENSION_UNIQUE_NAME");
        var hierarchyUniqueName = GetString(row, "HIERARCHY_UNIQUE_NAME");
        var hierarchyCaption = GetString(row, "HIERARCHY_CAPTION");

        return string.Equals(dimensionUniqueName, "[Measures]", StringComparison.OrdinalIgnoreCase)
            || string.Equals(hierarchyUniqueName, "[Measures]", StringComparison.OrdinalIgnoreCase)
            || string.Equals(hierarchyCaption, "Measures", StringComparison.OrdinalIgnoreCase);
    }

    private static string MapAggregator(int? aggregator)
    {
        return aggregator switch
        {
            0 => "Unknown",
            1 => "Sum",
            2 => "Count",
            3 => "Min",
            4 => "Max",
            5 => "Avg",
            6 => "Var",
            7 => "Std",
            8 => "DistinctCount",
            9 => "None",
            10 => "AverageOfChildren",
            11 => "FirstChild",
            12 => "LastChild",
            13 => "FirstNonEmpty",
            14 => "LastNonEmpty",
            15 => "ByAccount",
            127 => "Calculated",
            null => "Unknown",
            _ => $"Unknown({aggregator})"
        };
    }

    private static string? GetString(DataRow row, string columnName)
    {
        var value = GetValue(row, columnName);
        return value is null or DBNull ? null : Convert.ToString(value);
    }

    private static int? GetInt(DataRow row, string columnName)
    {
        var value = GetValue(row, columnName);
        if (value is null or DBNull)
        {
            return null;
        }

        return Convert.ToInt32(value);
    }

    private static object? GetValue(DataRow row, string columnName)
    {
        var column = row.Table.Columns
            .Cast<DataColumn>()
            .FirstOrDefault(c => string.Equals(c.ColumnName, columnName, StringComparison.OrdinalIgnoreCase));

        return column is null ? null : row[column];
    }
}
