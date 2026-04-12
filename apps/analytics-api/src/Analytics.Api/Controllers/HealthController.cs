using Analytics.Api.Options;
using Analytics.Contracts.Health;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly SsasOptions _ssasOptions;

    public HealthController(IOptions<SsasOptions> ssasOptions)
    {
        _ssasOptions = ssasOptions.Value;
    }

    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse(
            Status: "ok",
            Service: "analytics-api",
            TimeUtc: DateTime.UtcNow,
            Ssas: new SsasConnectionInfo(_ssasOptions.DataSource, _ssasOptions.Catalog)));
    }
}
