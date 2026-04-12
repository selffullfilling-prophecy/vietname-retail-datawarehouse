using Analytics.Application.Sales;
using Analytics.Contracts.Sales;
using Microsoft.AspNetCore.Mvc;

namespace Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SalesController : ControllerBase
{
    private readonly ISalesAnalyticsService _salesAnalyticsService;

    public SalesController(ISalesAnalyticsService salesAnalyticsService)
    {
        _salesAnalyticsService = salesAnalyticsService;
    }

    [HttpGet("summary/by-year")]
    [ProducesResponseType(typeof(YearSalesSummaryResponse), StatusCodes.Status200OK)]
    public ActionResult<YearSalesSummaryResponse> GetSummaryByYear()
    {
        return Ok(_salesAnalyticsService.GetSummaryByYear());
    }

    [HttpGet("time-breakdown")]
    [ProducesResponseType(typeof(SalesTimeBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesTimeBreakdownResponse> GetTimeBreakdown(
        [FromQuery] string level = "year",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null)
    {
        return Ok(_salesAnalyticsService.GetTimeBreakdown(level, year, quarter));
    }

    [HttpGet("store-breakdown")]
    [ProducesResponseType(typeof(SalesStoreBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesStoreBreakdownResponse> GetStoreBreakdown(
        [FromQuery] string level = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName));
    }
}
