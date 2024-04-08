using System.Reflection;
using System.Threading.Tasks;
using Amazon.Lambda.RuntimeSupport;

namespace dotnet_bootstrap
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Assembly asm = Assembly.LoadFrom(args[0]);
            var r = new RuntimeSupportInitializer(args[1]);
            await r.RunLambdaBootstrap();
        }
    }
}

