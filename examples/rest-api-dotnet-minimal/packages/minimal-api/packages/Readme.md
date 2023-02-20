# ASP.NET Core Minimal API Serverless Application

This project shows how to run an ASP.NET Core Web Minimal API project as an AWS Lambda exposed through an HTTP Amazon API Gateway using SST. The NuGet package [Amazon.Lambda.AspNetCoreServer](https://www.nuget.org/packages/Amazon.Lambda.AspNetCoreServer) contains a Lambda function that is used to translate requests from API Gateway into the ASP.NET Core framework and then the responses from ASP.NET Core back to API Gateway.


For more information about how the Amazon.Lambda.AspNetCoreServer package works and how to extend its behavior view its [README](https://github.com/aws/aws-lambda-dotnet/blob/master/Libraries/src/Amazon.Lambda.AspNetCoreServer/README.md) file in GitHub.

## Executable Assembly ##

.NET Lambda projects that use C# top level statements like this project must be deployed as an executable assembly instead of a class library. To indicate to Lambda that the .NET function is an executable assembly the 
Lambda function handler value is set to the .NET Assembly name. This is different then deploying as a class library where the function handler string includes the assembly, type and method name.

To deploy as an executable assembly the Lambda runtime client must be started to listen for incoming events to process. For an ASP.NET Core application the Lambda runtime client is started by included the
`Amazon.Lambda.AspNetCoreServer.Hosting` NuGet package and calling `AddAWSLambdaHosting(LambdaEventSource.HttpApi)` passing in the event source while configuring the services of the application. 

### Project Files ###

* runtimeconfig.template.json - the config file is important for providing build time instructions necessary for the lambda to packaged correctly. Without this file, the deployment may succeed but the lambda may fail to execute.
* aws-lambda-tools-defaults.json - default argument settings for use with Visual Studio and command line deployment tools for AWS
* Program.cs - entry point to the application that contains all of the top level statements initializing the ASP.NET Core application.
The call to `AddAWSLambdaHosting` configures the application to work in Lambda when it detects Lambda is the executing environment. 
* Controllers\CalculatorController - example Web API controller

