using Analytics.Api.Options;
using Analytics.Application;
using Analytics.Ssas;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SsasOptions>(
    builder.Configuration.GetSection(SsasOptions.SectionName));

builder.Services.AddAnalyticsApplication();
builder.Services.AddSsasServices();

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

app.UseHttpsRedirection();
app.UseCors("WebClient");
app.UseAuthorization();
app.MapControllers();

app.Run();
