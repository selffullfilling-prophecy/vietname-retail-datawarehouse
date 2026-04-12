using Analytics.Application.Metadata;
using Analytics.Contracts.Metadata;
using Microsoft.AspNetCore.Mvc;

namespace Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MetadataController : ControllerBase
{
    private readonly IMetadataService _metadataService;

    public MetadataController(IMetadataService metadataService)
    {
        _metadataService = metadataService;
    }

    [HttpGet("overview")]
    [ProducesResponseType(typeof(MetadataOverviewResponse), StatusCodes.Status200OK)]
    public ActionResult<MetadataOverviewResponse> GetOverview()
    {
        return Ok(_metadataService.GetOverview());
    }
}
