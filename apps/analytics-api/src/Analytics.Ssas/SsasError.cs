namespace Analytics.Ssas;

internal static class SsasError
{
    public static string Describe(Exception exception)
    {
        return Classify(exception);
    }

    public static InvalidOperationException QueryFailed(
        string operation,
        SsasConnectionSettings settings,
        string mdx,
        Exception exception)
    {
        return new InvalidOperationException(
            $"{operation} failed. {Classify(exception)} " +
            $"SSAS server='{settings.DataSource}', catalog='{settings.Catalog}', cube='{settings.Cube}'. " +
            $"MDX: {NormalizeWhitespace(mdx)}",
            exception);
    }

    public static InvalidOperationException MetadataFailed(
        SsasConnectionSettings settings,
        Exception exception)
    {
        return new InvalidOperationException(
            $"Failed to read SSAS metadata. {Classify(exception)} " +
            $"SSAS server='{settings.DataSource}', catalog='{settings.Catalog}', cube='{settings.Cube}'.",
            exception);
    }

    private static string Classify(Exception exception)
    {
        var message = FlattenMessages(exception).ToLowerInvariant();

        if (ContainsAny(message, "authentication failed", "credentials", "security package", "login failed", "access denied"))
        {
            return "Cannot connect to SSAS server.";
        }

        if (ContainsAny(message, "syntax", "parser", "parse", "token"))
        {
            return "MDX syntax error.";
        }

        if (ContainsAny(message, "member", "measure", "dimension", "hierarchy", "level")
            && ContainsAny(message, "not found", "does not exist", "was not found", "cannot find"))
        {
            return "Measure/member not found.";
        }

        if (message.Contains("cube", StringComparison.Ordinal)
            && ContainsAny(message, "not found", "does not exist", "was not found", "cannot find"))
        {
            return "Cube not found.";
        }

        if (ContainsAny(message, "catalog", "database")
            && ContainsAny(message, "not found", "does not exist", "was not found", "cannot find", "doesn't exist"))
        {
            return "Catalog/database not found.";
        }

        if (ContainsAny(message, "connection", "connect", "server", "transport", "actively refused", "timeout", "network"))
        {
            return "Cannot connect to SSAS server.";
        }

        return "SSAS query failed.";
    }

    private static bool ContainsAny(string value, params string[] fragments)
    {
        return fragments.Any(fragment => value.Contains(fragment, StringComparison.Ordinal));
    }

    private static string FlattenMessages(Exception exception)
    {
        var messages = new List<string>();
        for (var current = exception; current is not null; current = current.InnerException)
        {
            messages.Add(current.Message);
        }

        return string.Join(" ", messages);
    }

    private static string NormalizeWhitespace(string value)
    {
        return string.Join(" ", value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }
}
