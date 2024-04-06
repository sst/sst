import AWSLambdaEvents
import AWSLambdaRuntime

@main
struct App: SimpleLambdaHandler {
  func handle(
    _ event: APIGatewayV2Request, context: LambdaContext
  ) async throws -> APIGatewayV2Response {
    .init(
      statusCode: .ok,
      headers: ["Content-Type": "text/plain"],
      body: "Hello, Swift"
    )
  }
}
