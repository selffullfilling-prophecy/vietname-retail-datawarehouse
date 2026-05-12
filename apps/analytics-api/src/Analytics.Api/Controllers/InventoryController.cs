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
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? productMemberUniqueName = null)
    {
        return Ok(_inventoryAnalyticsService.GetTimeBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName));
    }

    [HttpGet("store-breakdown")]
    [ProducesResponseType(typeof(InventoryStoreBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryStoreBreakdownResponse> GetStoreBreakdown(
        [FromQuery] string level = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? productMemberUniqueName = null)
    {
        return Ok(_inventoryAnalyticsService.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter, productMemberUniqueName));
    }

    [HttpGet("product-breakdown")]
    [ProducesResponseType(typeof(InventoryProductBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryProductBreakdownResponse> GetProductBreakdown(
        [FromQuery] string level = "mamh",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null)
    {
        return Ok(_inventoryAnalyticsService.GetProductBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName));
    }

    [HttpGet("pivot")]
    [ProducesResponseType(typeof(InventoryPivotResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryPivotResponse> GetPivot(
        [FromQuery] string timeLevel = "year",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string storeLevel = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null)
    {
        return Ok(_inventoryAnalyticsService.GetPivot(timeLevel, year, quarter, storeLevel, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName));
    }

    [HttpGet("pivot/advanced")]
    [ProducesResponseType(typeof(InventoryAdvancedPivotResponse), StatusCodes.Status200OK)]
    public ActionResult<InventoryAdvancedPivotResponse> GetAdvancedPivot(
        [FromQuery] string rowDimension = "time",
        [FromQuery] string rowLevel = "year",
        [FromQuery] string columnDimension = "store",
        [FromQuery] string columnLevel = "state",
        [FromQuery] string measure = "averageInventory",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? productMemberUniqueName = null)
    {
        return Ok(_inventoryAnalyticsService.GetAdvancedPivot(rowDimension, rowLevel, columnDimension, columnLevel, measure, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName));
    }
}
