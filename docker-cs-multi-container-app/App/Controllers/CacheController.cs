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
            var redisValue = await db.StringGetAsync(RedisKey);
            if (!redisValue.HasValue)
            {
                await db.StringSetAsync(RedisKey, JsonSerializer.Serialize(new Hits 
                {
                    Number = 1
                }));
                return Ok("I have been viewed 1 times");      
            }
            var hit = JsonSerializer.Deserialize<Hits>(redisValue);
            var value = $"I have been viewed {hit.Number} times";
            hit.Number++;
            await db.StringSetAsync(RedisKey, JsonSerializer.Serialize(hit));
            return Ok(value);
        }
    }
}