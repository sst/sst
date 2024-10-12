import { Input, jsonStringify, output, UnwrappedObject } from "@pulumi/pulumi";
import { iam } from "@pulumi/aws";
import { Prettify } from "../component";

type PartialUnwrappedPolicyDocument = {
  Id?: string;
  Version: "2008-10-17" | "2012-10-17";
  Statement: Input<iam.PolicyStatement>[];
};

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
