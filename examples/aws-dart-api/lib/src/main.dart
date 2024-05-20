import 'package:aws_lambda_dart_runtime/aws_lambda_dart_runtime.dart';
import 'package:aws_lambda_dart_runtime/runtime/context.dart';

void main() async {
  /// This demo's handling an API Gateway request.
  hello(Context context, AwsApiGatewayEvent event) async {
    final response = {
      "message": "Hello from Dart!",
    };
    return AwsApiGatewayResponse.fromJson(response);
  }

  /// The Runtime is a singleton. You can define the handlers as you wish.
  Runtime()
    ..registerHandler<AwsApiGatewayEvent>(
      'hello',
      hello,
    )
    ..invoke();
}
