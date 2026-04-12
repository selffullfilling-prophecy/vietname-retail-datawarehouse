using Analytics.Application.Inventory;
using Analytics.Contracts.Inventory;
using Microsoft.AspNetCore.Mvc;

namespace Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class InventoryController : ControllerBase
{
    private readonly IInventoryAnalyticsService _inventoryAnalyticsService;

    public InventoryController(IInventoryAnalyticsService inventoryAnalyticsService)
    {
        _inventoryAnalyticsService = inventoryAnalyticsService;
    }

    [HttpGet("summary/by-year")]
    [ProducesResponseType(typeof(YearInventorySummaryResponse), StatusCodes.Status200OK)]
    public ActionResult<YearInventorySummaryResponse> GetSummaryByYear()
    {
        return Ok(_inventoryAnalyticsService.GetSummaryByYear());
    }

    [HttpGet("time-breakdown")]
    [ProducesResponseType(typeof(InventoryTimeBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryTimeBreakdownResponse> GetTimeBreakdown(
        [FromQuery] string level = "year",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null)
    {
        return Ok(_inventoryAnalyticsService.GetTimeBreakdown(level, year, quarter));
    }

    [HttpGet("store-breakdown")]
    [ProducesResponseType(typeof(InventoryStoreBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryStoreBreakdownResponse> GetStoreBreakdown(
        [FromQuery] string level = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? year = null)
    {
        return Ok(_inventoryAnalyticsService.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year));
    }
}
