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
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? productMemberUniqueName = null,
        [FromQuery] string? customerMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetTimeBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName, customerMemberUniqueName));
    }

    [HttpGet("store-breakdown")]
    [ProducesResponseType(typeof(SalesStoreBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesStoreBreakdownResponse> GetStoreBreakdown(
        [FromQuery] string level = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? productMemberUniqueName = null,
        [FromQuery] string? customerMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetStoreBreakdown(level, stateMemberUniqueName, cityMemberUniqueName, year, quarter, productMemberUniqueName, customerMemberUniqueName));
    }

    [HttpGet("product-breakdown")]
    [ProducesResponseType(typeof(SalesProductBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesProductBreakdownResponse> GetProductBreakdown(
        [FromQuery] string level = "mamh",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? customerMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetProductBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, customerMemberUniqueName));
    }

    [HttpGet("customer-breakdown")]
    [ProducesResponseType(typeof(SalesCustomerBreakdownResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesCustomerBreakdownResponse> GetCustomerBreakdown(
        [FromQuery] string level = "customer",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? productMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetCustomerBreakdown(level, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName));
    }

    [HttpGet("pivot")]
    [ProducesResponseType(typeof(SalesPivotResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesPivotResponse> GetPivot(
        [FromQuery] string timeLevel = "year",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string storeLevel = "state",
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetPivot(timeLevel, year, quarter, storeLevel, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName));
    }

    [HttpGet("pivot/advanced")]
    [ProducesResponseType(typeof(SalesAdvancedPivotResponse), StatusCodes.Status200OK)]
    public ActionResult<SalesAdvancedPivotResponse> GetAdvancedPivot(
        [FromQuery] string rowDimension = "time",
        [FromQuery] string rowLevel = "year",
        [FromQuery] string columnDimension = "store",
        [FromQuery] string columnLevel = "state",
        [FromQuery] string measure = "revenue",
        [FromQuery] string? year = null,
        [FromQuery] string? quarter = null,
        [FromQuery] string? stateMemberUniqueName = null,
        [FromQuery] string? cityMemberUniqueName = null,
        [FromQuery] string? storeMemberUniqueName = null,
        [FromQuery] string? productMemberUniqueName = null,
        [FromQuery] string? customerMemberUniqueName = null)
    {
        return Ok(_salesAnalyticsService.GetAdvancedPivot(rowDimension, rowLevel, columnDimension, columnLevel, measure, year, quarter, stateMemberUniqueName, cityMemberUniqueName, storeMemberUniqueName, productMemberUniqueName, customerMemberUniqueName));
    }
}
