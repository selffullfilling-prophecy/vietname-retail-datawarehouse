using Analytics.Contracts.Sales;
using Microsoft.AnalysisServices.AdomdClient;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Analytics.Ssas.Sales;

public sealed class SalesAnalyticsProvider : ISalesAnalyticsProvider
{
    private readonly SsasConnectionSettings _settings;

    public SalesAnalyticsProvider(SsasConnectionSettings settings)
    {
        _settings = settings;
    }

    public IReadOnlyList<YearSalesSummaryRowDto> GetSummaryByYear()
    {
        var mdx = string.Join(
            Environment.NewLine,
            "SELECT",
            "    {",
            "        [Measures].[Tongtien],",
            "        [Measures].[Soluongban]",
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

            var rows = new List<YearSalesSummaryRowDto>();
            while (reader.Read())
            {
                var year = Convert.ToString(reader[0]) ?? string.Empty;
                var revenue = ReadDecimal(reader, 1);
                var salesVolume = ReadDecimal(reader, 2);

                rows.Add(new YearSalesSummaryRowDto(
                    Year: year,
                    Revenue: revenue,
                    SalesVolume: salesVolume));
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Sales yearly summary query", _settings, mdx, ex);
        }
    }

    public SalesTimeBreakdownResult GetTimeBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        var normalizedLevel = NormalizeTimeLevel(level);
        var normalizedYear = NormalizeRequiredYear(year, normalizedLevel);
        var normalizedQuarter = NormalizeRequiredQuarter(quarter, normalizedLevel);
        var storeFilterExpression = BuildStoreFilterExpression(
            NormalizeOptionalUniqueName(stateMemberUniqueName),
            NormalizeOptionalUniqueName(cityMemberUniqueName),
            NormalizeOptionalUniqueName(storeMemberUniqueName));
        var productFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName));
        var customerFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(customerMemberUniqueName));
        var mdx = BuildTimeBreakdownMdx(normalizedLevel, normalizedYear, normalizedQuarter, storeFilterExpression, productFilterExpression, customerFilterExpression);

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            using var reader = command.ExecuteReader();

            var rows = new List<SalesTimeBreakdownRowDto>();
            var rowIndex = 0;
            while (reader.Read())
            {
                var rawKey = ReadAxisLabel(reader);
                var key = ResolveBreakdownKey(normalizedLevel, rawKey, normalizedQuarter, rowIndex);
                var label = ResolveBreakdownLabel(normalizedLevel, rawKey, key);
                var revenue = ReadDecimal(reader, reader.FieldCount - 2);
                var salesVolume = ReadDecimal(reader, reader.FieldCount - 1);

                rows.Add(new SalesTimeBreakdownRowDto(
                    Key: key,
                    Label: label,
                    Revenue: revenue,
                    SalesVolume: salesVolume,
                    CanDrillDown: normalizedLevel is "year" or "quarter"));

                rowIndex++;
            }

            return new SalesTimeBreakdownResult(
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
            throw SsasError.QueryFailed("Sales time breakdown query", _settings, mdx, ex);
        }
    }

    public SalesStoreBreakdownResult GetStoreBreakdown(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? year, string? quarter, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        var normalizedLevel = NormalizeStoreLevel(level);
        var normalizedStateUniqueName = NormalizeStoreParentMember(stateMemberUniqueName, normalizedLevel, "state");
        var normalizedCityUniqueName = NormalizeStoreParentMember(cityMemberUniqueName, normalizedLevel, "city");
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var timeFilterExpression = BuildTimeFilterExpression(normalizedYear, normalizedQuarter);
        var productFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName));
        var customerFilterExpression = BuildMemberFilterExpression(NormalizeOptionalUniqueName(customerMemberUniqueName));
        var mdx = BuildStoreBreakdownMdx(normalizedLevel, normalizedStateUniqueName, normalizedCityUniqueName, timeFilterExpression, productFilterExpression, customerFilterExpression);

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rows = new List<SalesStoreBreakdownRowDto>();
            if (cellSet.Axes.Count < 2)
            {
                return new SalesStoreBreakdownResult(
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
                var revenue = ReadCellDecimal(cellSet, rowIndex, 0, columnsCount);
                var salesVolume = ReadCellDecimal(cellSet, rowIndex, 1, columnsCount);

                rows.Add(new SalesStoreBreakdownRowDto(
                    Key: member.Caption,
                    Label: member.Caption,
                    MemberUniqueName: member.UniqueName,
                    Revenue: revenue,
                    SalesVolume: salesVolume,
                    CanDrillDown: normalizedLevel is "state" or "city"));
            }

            return new SalesStoreBreakdownResult(
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
            throw SsasError.QueryFailed("Sales store breakdown query", _settings, mdx, ex);
        }
    }

    public IReadOnlyList<SalesProductBreakdownRowDto> GetProductBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? customerMemberUniqueName)
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
                NormalizeOptionalUniqueName(storeMemberUniqueName)),
            BuildMemberFilterExpression(NormalizeOptionalUniqueName(customerMemberUniqueName)));

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rows = new List<SalesProductBreakdownRowDto>();
            if (cellSet.Axes.Count < 2)
            {
                return rows;
            }

            var columnsCount = cellSet.Axes[0].Set.Tuples.Count;
            var rowTuples = cellSet.Axes[1].Set.Tuples;

            for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
            {
                var member = rowTuples[rowIndex].Members[0];
                rows.Add(new SalesProductBreakdownRowDto(
                    Key: member.UniqueName,
                    Label: member.Caption,
                    MemberUniqueName: member.UniqueName,
                    Revenue: ReadCellDecimal(cellSet, rowIndex, 0, columnsCount),
                    SalesVolume: ReadCellDecimal(cellSet, rowIndex, 1, columnsCount)));
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Sales product breakdown query", _settings, mdx, ex);
        }
    }

    public IReadOnlyList<SalesCustomerBreakdownRowDto> GetCustomerBreakdown(string level, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName)
    {
        var normalizedLevel = NormalizeCustomerLevel(level);
        var normalizedYear = NormalizeOptionalYear(year);
        var normalizedQuarter = NormalizeOptionalQuarter(quarter, normalizedYear);
        var mdx = BuildOneAxisBreakdownMdx(
            BuildCustomerSetExpression(normalizedLevel),
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

            var rows = new List<SalesCustomerBreakdownRowDto>();
            if (cellSet.Axes.Count < 2)
            {
                return rows;
            }

            var columnsCount = cellSet.Axes[0].Set.Tuples.Count;
            var rowTuples = cellSet.Axes[1].Set.Tuples;

            for (var rowIndex = 0; rowIndex < rowTuples.Count; rowIndex++)
            {
                var member = rowTuples[rowIndex].Members[0];
                rows.Add(new SalesCustomerBreakdownRowDto(
                    Key: member.UniqueName,
                    Label: member.Caption,
                    MemberUniqueName: member.UniqueName,
                    Revenue: ReadCellDecimal(cellSet, rowIndex, 0, columnsCount),
                    SalesVolume: ReadCellDecimal(cellSet, rowIndex, 1, columnsCount)));
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Sales customer breakdown query", _settings, mdx, ex);
        }
    }

    public SalesPivotResult GetPivot(string timeLevel, string? year, string? quarter, string storeLevel, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName)
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

            var timeAxis = new Dictionary<string, SalesPivotAxisMemberDto>();
            var storeAxis = new Dictionary<string, SalesPivotAxisMemberDto>();
            var cells = new List<SalesPivotCellDto>();

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
                            new SalesPivotAxisMemberDto(
                                Key: timeMember.UniqueName,
                                Label: ResolvePivotTimeLabel(normalizedTimeLevel, timeMember),
                                MemberUniqueName: timeMember.UniqueName));
                    }

                    if (!storeAxis.ContainsKey(storeMember.UniqueName))
                    {
                        storeAxis.Add(
                            storeMember.UniqueName,
                            new SalesPivotAxisMemberDto(
                                Key: storeMember.UniqueName,
                                Label: storeMember.Caption,
                                MemberUniqueName: storeMember.UniqueName));
                    }

                    cells.Add(new SalesPivotCellDto(
                        TimeKey: timeMember.UniqueName,
                        StoreKey: storeMember.UniqueName,
                        Revenue: ReadCellDecimal(cellSet, rowIndex, 0, columnsCount),
                        SalesVolume: ReadCellDecimal(cellSet, rowIndex, 1, columnsCount)));
                }
            }

            return new SalesPivotResult(
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
            throw SsasError.QueryFailed("Sales pivot query", _settings, mdx, ex);
        }
    }

    public SalesAdvancedPivotResponse GetAdvancedPivot(string rowDimension, string rowLevel, string columnDimension, string columnLevel, string measure, string? year, string? quarter, string? stateMemberUniqueName, string? cityMemberUniqueName, string? storeMemberUniqueName, string? productMemberUniqueName, string? customerMemberUniqueName)
    {
        var normalizedRowDimension = NormalizePivotDimension(rowDimension, allowCustomer: true);
        var normalizedColumnDimension = NormalizePivotDimension(columnDimension, allowCustomer: true);
        if (normalizedRowDimension == normalizedColumnDimension)
        {
            throw new ArgumentException("Row dimension and column dimension must be different.");
        }

        var normalizedRowLevel = NormalizeDimensionLevel(normalizedRowDimension, rowLevel);
        var normalizedColumnLevel = NormalizeDimensionLevel(normalizedColumnDimension, columnLevel);
        var normalizedMeasure = NormalizeSalesMeasure(measure);
        var measureExpression = BuildSalesMeasureExpression(normalizedMeasure);
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
            BuildMemberFilterExpression(NormalizeOptionalUniqueName(productMemberUniqueName)),
            BuildMemberFilterExpression(NormalizeOptionalUniqueName(customerMemberUniqueName)));

        try
        {
            using var connection = new AdomdConnection(BuildConnectionString());
            connection.Open();

            using var command = new AdomdCommand(mdx, connection);
            var cellSet = command.ExecuteCellSet();

            var rowAxis = new Dictionary<string, SalesAdvancedPivotAxisMemberDto>();
            var columnAxis = new Dictionary<string, SalesAdvancedPivotAxisMemberDto>();
            var cells = new List<SalesAdvancedPivotCellDto>();

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
                    rowAxis.TryAdd(rowMember.UniqueName, new SalesAdvancedPivotAxisMemberDto(rowMember.UniqueName, rowMember.Caption, rowMember.UniqueName));
                    columnAxis.TryAdd(columnMember.UniqueName, new SalesAdvancedPivotAxisMemberDto(columnMember.UniqueName, columnMember.Caption, columnMember.UniqueName));
                    cells.Add(new SalesAdvancedPivotCellDto(rowMember.UniqueName, columnMember.UniqueName, ReadCellDecimal(cellSet, rowIndex, 0, 1)));
                }
            }

            return new SalesAdvancedPivotResponse(
                GeneratedAtUtc: DateTime.UtcNow,
                RowDimension: normalizedRowDimension,
                RowLevel: normalizedRowLevel,
                ColumnDimension: normalizedColumnDimension,
                ColumnLevel: normalizedColumnLevel,
                Measure: normalizedMeasure,
                MeasureLabel: normalizedMeasure == "salesVolume" ? "Sản lượng bán" : "Doanh thu",
                RowAxis: rowAxis.Values.ToList(),
                ColumnAxis: columnAxis.Values.ToList(),
                Cells: cells);
        }
        catch (Exception ex)
        {
            throw SsasError.QueryFailed("Sales advanced pivot query", _settings, mdx, ex);
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

    private static string NormalizeCustomerLevel(string level)
    {
        return level.Trim().ToLowerInvariant() switch
        {
            "state" or "bang" => "state",
            "city" or "thanhpho" => "city",
            "customer" or "makh" => "customer",
            "name" or "tenkh" => "name",
            "travel" or "iskhdulich" => "travel",
            "postal" or "iskhbuudien" => "postal",
            _ => throw new ArgumentException("Customer level must be one of: state, city, customer, name, travel, postal.", nameof(level))
        };
    }

    private static string NormalizePivotDimension(string dimension, bool allowCustomer)
    {
        var normalizedDimension = dimension.Trim().ToLowerInvariant();
        if (normalizedDimension is "time" or "store" or "product")
        {
            return normalizedDimension;
        }

        if (allowCustomer && normalizedDimension == "customer")
        {
            return normalizedDimension;
        }

        throw new ArgumentException(allowCustomer
            ? "Dimension must be one of: time, store, product, customer."
            : "Dimension must be one of: time, store, product.", nameof(dimension));
    }

    private static string NormalizeDimensionLevel(string dimension, string level)
    {
        return dimension switch
        {
            "time" => NormalizeTimeLevel(level),
            "store" => NormalizeStoreLevel(level),
            "product" => NormalizeProductLevel(level),
            "customer" => NormalizeCustomerLevel(level),
            _ => throw new ArgumentOutOfRangeException(nameof(dimension))
        };
    }

    private static string NormalizeSalesMeasure(string measure)
    {
        return measure.Trim().ToLowerInvariant() switch
        {
            "revenue" or "tongtien" => "revenue",
            "salesvolume" or "soluongban" => "salesVolume",
            _ => throw new ArgumentException("Sales measure must be one of: revenue, salesVolume.", nameof(measure))
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

    private string BuildTimeBreakdownMdx(string level, string? year, string? quarter, string? storeFilterExpression, string? productFilterExpression, string? customerFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedTimeMembers] AS {BuildTimeSetExpression(level, year, quarter)}",
            "SELECT",
            "    {",
            "        [Measures].[Tongtien],",
            "        [Measures].[Soluongban]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedTimeMembers] ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(storeFilterExpression, productFilterExpression, customerFilterExpression));
    }

    private string BuildStoreBreakdownMdx(string level, string? stateMemberUniqueName, string? cityMemberUniqueName, string? timeFilterExpression, string? productFilterExpression, string? customerFilterExpression)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedStoreMembers] AS {BuildStoreSetExpression(level, stateMemberUniqueName, cityMemberUniqueName)}",
            "SELECT",
            "    {",
            "        [Measures].[Tongtien],",
            "        [Measures].[Soluongban]",
            "    } ON COLUMNS,",
            "    NON EMPTY [SelectedStoreMembers] ON ROWS",
            $"FROM {_settings.CubeMdxIdentifier}",
            BuildWhereClause(timeFilterExpression, productFilterExpression, customerFilterExpression));
    }

    private string BuildOneAxisBreakdownMdx(string rowSetExpression, params string?[] filterExpressions)
    {
        return string.Join(
            Environment.NewLine,
            "WITH",
            $"    SET [SelectedMembers] AS {rowSetExpression}",
            "SELECT",
            "    {",
            "        [Measures].[Tongtien],",
            "        [Measures].[Soluongban]",
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
            "        [Measures].[Tongtien],",
            "        [Measures].[Soluongban]",
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

    private static string BuildCustomerSetExpression(string level)
    {
        return level switch
        {
            "state" => "[Dim Customer].[Hierarchy].[Bang].Members",
            "city" => "[Dim Customer].[Hierarchy].[Thanhpho].Members",
            "customer" => "[Dim Customer].[Hierarchy].[Makh].Members",
            "name" => "[Dim Customer].[Tenkh].[Tenkh].Members",
            "travel" => "[Dim Customer].[Iskhdulich].[Iskhdulich].Members",
            "postal" => "[Dim Customer].[Iskhbuudien].[Iskhbuudien].Members",
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
            "customer" => BuildCustomerSetExpression(level),
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

    private static string BuildSalesMeasureExpression(string measure)
    {
        return measure switch
        {
            "revenue" => "[Measures].[Tongtien]",
            "salesVolume" => "[Measures].[Soluongban]",
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
