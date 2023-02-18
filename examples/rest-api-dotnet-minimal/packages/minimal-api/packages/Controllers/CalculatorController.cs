using Microsoft.AspNetCore.Mvc;

namespace packages.Controllers;

[ApiController]
[Route("[controller]")]
public class CalculatorController : ControllerBase
{
    private readonly ILogger<CalculatorController> _logger;

    public CalculatorController(ILogger<CalculatorController> logger)
    {
        _logger = logger;
    }

    public class CalculatorRequest
    {
        public int X { get; set; }
        public int Y { get; set; }
    }

    /// <summary>
    /// POST /calculator/add
    /// Example Request body:
    /// {
    ///     "x": 1,
    ///     "y": 2
    /// }
    /// Perform x + y
    /// </summary>
    /// <returns>Sum of x and y.</returns>
    [HttpPost("add")]
    public int Add([FromBody] CalculatorRequest request)
    {
        _logger.LogInformation($"{request.X} plus {request.Y} is {request.X + request.Y}");
        return request.X + request.Y;
    }
}
