using Analytics.Api.Options;
using Analytics.Application;
using Analytics.Ssas;

var builder = WebApplication.CreateBuilder(args);

var ssasOptions = builder.Configuration
    .GetSection(SsasOptions.SectionName)
    .Get<SsasOptions>() ?? new SsasOptions();

ssasOptions.DataSource = ResolveSsasValue("SSAS_SERVER", ssasOptions.DataSource, SsasOptions.DefaultDataSource);
ssasOptions.Catalog = ResolveSsasValue("SSAS_CATALOG", ssasOptions.Catalog, SsasOptions.DefaultCatalog);
ssasOptions.Cube = ResolveSsasValue("SSAS_CUBE", ssasOptions.Cube, SsasOptions.DefaultCube);

builder.Services.Configure<SsasOptions>(options =>
{
    options.DataSource = ssasOptions.DataSource;
    options.Catalog = ssasOptions.Catalog;
    options.Cube = ssasOptions.Cube;
});

builder.Services.AddAnalyticsApplication();
builder.Services.AddSsasServices(ssasOptions.DataSource, ssasOptions.Catalog, ssasOptions.Cube);

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("WebClient");
app.UseAuthorization();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapControllers();

app.Run();

string ResolveSsasValue(string environmentKey, string? configuredValue, string defaultValue)
{
    var environmentValue = builder.Configuration[environmentKey];
    if (!string.IsNullOrWhiteSpace(environmentValue))
    {
        return environmentValue;
    }

    return string.IsNullOrWhiteSpace(configuredValue) ? defaultValue : configuredValue;
}
