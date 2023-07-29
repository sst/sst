import { Metric, MetricOptions, Stats } from "aws-cdk-lib/aws-cloudwatch";
import { Duration, Resource } from "aws-cdk-lib/core";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";

/**
 * Shared implementation details of ICertificate implementations.
 *
 * @internal
 */
export abstract class CertificateBase extends Resource implements ICertificate {
  public abstract readonly certificateArn: string;

  /**
   * If the certificate is provisionned in a different region than the
   * containing stack, this should be the region in which the certificate lives
   * so we can correctly create `Metric` instances.
   */
  protected readonly region?: string;

  public metricDaysToExpiry(props?: MetricOptions): Metric {
    return new Metric({
      period: Duration.days(1),
      ...props,
      dimensionsMap: { CertificateArn: this.certificateArn },
      metricName: "DaysToExpiry",
      namespace: "AWS/CertificateManager",
      region: this.region,
      statistic: Stats.MINIMUM,
    });
  }
}
