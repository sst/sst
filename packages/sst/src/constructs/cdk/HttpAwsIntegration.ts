import {
  HttpIntegrationSubtype,
  HttpIntegrationType,
  HttpRouteIntegrationBindOptions,
  HttpRouteIntegrationConfig,
  HttpRouteIntegration,
  ParameterMapping,
  PayloadFormatVersion,
  IntegrationCredentials,
} from "@aws-cdk/aws-apigatewayv2-alpha";

/**
 * Properties to initialize a new `HttpProxyIntegration`.
 */
export interface HttpAwsIntegrationProps {
  /**
   * Specifies the AWS service action to invoke
   */
  readonly subtype: HttpIntegrationSubtype;

  /**
   * Specifies how to transform HTTP requests before sending them to the backend
   */
  readonly parameterMapping: ParameterMapping;

  /**
   * The credentials with which to invoke the integration.
   *
   * @default - no credentials, use resource-based permissions on supported AWS services
   */
  readonly credentials: IntegrationCredentials;
}

/**
 * The HTTP Proxy integration resource for HTTP API
 */
export class HttpAwsIntegration extends HttpRouteIntegration {
  /**
   * @param id id of the underlying integration construct
   * @param props properties to configure the integration
   */
  constructor(id: string, private readonly props: HttpAwsIntegrationProps) {
    super(id);
  }

  public bind(_: HttpRouteIntegrationBindOptions): HttpRouteIntegrationConfig {
    return {
      payloadFormatVersion: PayloadFormatVersion.VERSION_1_0, // 1.0 is required and is the only supported format
      type: HttpIntegrationType.AWS_PROXY,
      subtype: this.props.subtype,
      parameterMapping: this.props.parameterMapping,
      credentials: this.props.credentials,
    };
  }
}
