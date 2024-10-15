import { Input, jsonStringify, output, UnwrappedObject } from "@pulumi/pulumi";
import { iam } from "@pulumi/aws";
import { Prettify } from "../component";

type PartialUnwrappedPolicyDocument = {
  Id?: string;
  Version: "2008-10-17" | "2012-10-17";
  Statement: Input<iam.PolicyStatement>[];
};

/**
 * The AWS IAM Edit helper is used to modify the AWS IAM policy.
 *
 * The IAM policy document is normally in the form of a JSON string. This helper decodes
 * the string into a JSON object and allows you to modify the policy document in a type-safe
 * manner.
 *
 * @example
 *
 * ```ts {4}
 * new sst.aws.Bucket("MyBucket", {
 *   transform: {
 *     policy: (args) => {
 *       args.policy = sst.aws.iamEdit(args.policy, (policy) => {
 *         policy.Statement.push({
 *           Effect: "Allow",
 *           Principal: { Service: "ses.amazonaws.com" },
 *           Action: "s3:PutObject",
 *           Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
 *         });
 *       });
 *     },
 *   },
 * });
 * ```
 */
export function iamEdit(
  policy: Input<iam.PolicyDocument | string>,
  cb: (doc: Prettify<PartialUnwrappedPolicyDocument>) => void,
) {
  return output(policy).apply((v) => {
    const json = typeof v === "string" ? JSON.parse(v) : v;
    cb(json);
    return iam.getPolicyDocumentOutput({
      sourcePolicyDocuments: [jsonStringify(json)],
    }).json;
  });
}
