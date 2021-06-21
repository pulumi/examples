using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace App.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CacheController : ControllerBase
    {
        private readonly IConnectionMultiplexer _cache;
        private const string RedisKey = "numhits";

        public CacheController(IConnectionMultiplexer cache) 
        {
            _cache = cache;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            IDatabase db = _cache.GetDatabase();
            string value = db.StringGet(RedisKey);
            return Ok(value);
        }
    }
}