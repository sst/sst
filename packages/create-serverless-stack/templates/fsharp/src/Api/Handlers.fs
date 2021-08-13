namespace Api

open System.Collections.Generic
open System.Net

open Amazon.Lambda.Core
open Amazon.Lambda.APIGatewayEvents

[<assembly:LambdaSerializer(typeof<Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer>)>]

do ()

module Handlers =

    let Handler(request:APIGatewayHttpApiV2ProxyRequest) =
        let headers = Dictionary<string, string>()
        headers.Add("Content-Type", "text/plain")
        let response = APIGatewayHttpApiV2ProxyResponse()
        response.StatusCode <- int HttpStatusCode.OK
        response.Body <- sprintf "Hello, World! Your request was received at %s." request.RequestContext.Time
        response.Headers <- headers

        response
