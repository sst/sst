import fs from "fs/promises";
import {
  Application,
  TSConfigReader,
  JSONOutput,
  ProjectReflection,
  ReflectionKind,
} from "typedoc";
import path from "path";
import { exit } from "process";

const cmd = process.argv[2];

const CDK_DOCS_MAP = {
  AppProps: "",
  Duration: "",
  Stack: "",
  StackProps: "",
  CfnOutputProps: "",
  IVpc: "aws_ec2",
  ISecurityGroup: "aws_ec2",
  SubnetSelection: "aws_ec2",
  LogGroup: "aws_logs",
  LogGroupProps: "aws_logs",
  ILogGroup: "aws_logs",
  IHostedZone: "aws_route53",
  ISecret: "aws_secretsmanager",
  IApplicationListener: "aws_elasticloadbalancingv2",
  INetworkListener: "aws_elasticloadbalancingv2",
  Certificate: "aws_certificatemanager",
  ICertificate: "aws_certificatemanager",
  DnsValidatedCertificate: "aws_certificatemanager",
  RestApi: "aws_apigateway",
  IRestApi: "aws_apigateway",
  Endpoint: "aws_apigateway",
  DomainName: "aws_apigateway",
  IDomainName: "aws_apigateway",
  RestApiProps: "aws_apigateway",
  MethodOptions: "aws_apigateway",
  TokenAuthorizer: "aws_apigateway",
  LambdaIntegrationOptions: "aws_apigateway",
  CognitoUserPoolsAuthorizer: "aws_apigateway",
  ServerlessCluster: "aws_rds",
  IServerlessCluster: "aws_rds",
  Role: "aws_iam",
  IRole: "aws_iam",
  IUserPool: "aws_cognito",
  SignInAliases: "aws_cognito",
  UserPoolProps: "aws_cognito",
  CfnIdentityPool: "aws_cognito",
  CfnIdentityPoolRoleAttachment: "aws_cognito",
  IUserPoolClient: "aws_cognito",
  UserPoolClientOptions: "aws_cognito",
  Bucket: "aws_s3",
  BucketProps: "aws_s3",
  IBucket: "aws_s3",
  Rule: "aws_events",
  RuleProps: "aws_events",
  IEventBus: "aws_events",
  CronOptions: "aws_events",
  EventBusProps: "aws_events",
  SqsQueueProps: "aws_events_targets",
  LambdaFunctionProps: "aws_events_targets",
  IStream: "aws_kinesis",
  StreamProps: "aws_kinesis",
  Queue: "aws_sqs",
  IQueue: "aws_sqs",
  QueueProps: "aws_sqs",
  Table: "aws_dynamodb",
  ITable: "aws_dynamodb",
  TableProps: "aws_dynamodb",
  LocalSecondaryIndexProps: "aws_dynamodb",
  GlobalSecondaryIndexProps: "aws_dynamodb",
  ITopic: "aws_sns",
  TopicProps: "aws_sns",
  Subscription: "aws_sns",
  SqsSubscriptionProps: "aws_sns_subscriptions",
  LambdaSubscriptionProps: "aws_sns_subscriptions",
  Runtime: "aws_lambda",
  Tracing: "aws_lambda",
  Function: "aws_lambda",
  IFunction: "aws_lambda",
  ILayerVersion: "aws_lambda",
  FunctionProps: "aws_lambda",
  FunctionOptions: "aws_lambda",
  SqsEventSourceProps: "aws_lambda_event_sources",
  DynamoEventSourceProps: "aws_lambda",
  KinesisEventSourceProps: "aws_lambda",
  ICommandHooks: "aws_lambda_nodejs",
  Distribution: "aws_cloudfront",
  IDistribution: "aws_cloudfront",
  ICachePolicy: "aws_cloudfront",
  CachePolicyProps: "aws_cloudfront",
  IOriginRequestPolicy: "aws_cloudfront",
  OriginRequestPolicyProps: "aws_cloudfront",
  AddBehaviorOptions: "aws_cloudfront",
  IResponseHeadersPolicy: "aws_cloudfront",
  GraphqlApi: "aws_appsync",
  IGraphqlApi: "aws_appsync",
  ResolverProps: "aws_appsync",
  AwsIamConfig: "aws_appsync",
  IDomain: "aws_opensearchservice",
};

const app = new Application();
app.options.addReader(new TSConfigReader());
app.bootstrap({
  entryPoints: [
    "../packages/sst/src/constructs/Stack.ts",
    "../packages/sst/src/constructs/Api.ts",
    "../packages/sst/src/constructs/ApiGatewayV1Api.ts",
    "../packages/sst/src/constructs/App.ts",
    "../packages/sst/src/constructs/Auth.ts",
    "../packages/sst/src/constructs/Cognito.ts",
    "../packages/sst/src/constructs/Bucket.ts",
    "../packages/sst/src/constructs/Cron.ts",
    "../packages/sst/src/constructs/Config.ts",
    "../packages/sst/src/constructs/Job.ts",
    "../packages/sst/src/constructs/RDS.ts",
    "../packages/sst/src/constructs/Table.ts",
    "../packages/sst/src/constructs/Topic.ts",
    "../packages/sst/src/constructs/Parameter.ts",
    "../packages/sst/src/constructs/Script.ts",
    "../packages/sst/src/constructs/Secret.ts",
    "../packages/sst/src/constructs/Queue.ts",
    "../packages/sst/src/constructs/Function.ts",
    "../packages/sst/src/constructs/EventBus.ts",
    "../packages/sst/src/constructs/StaticSite.ts",
    "../packages/sst/src/constructs/NextjsSite.ts",
    "../packages/sst/src/constructs/AppSyncApi.ts",
    "../packages/sst/src/constructs/KinesisStream.ts",
    "../packages/sst/src/constructs/WebSocketApi.ts",
    "../packages/sst/src/constructs/AstroSite.tsdoc.ts",
    "../packages/sst/src/constructs/SolidStartSite.tsdoc.ts",
    "../packages/sst/src/constructs/SvelteKitSite.tsdoc.ts",
    "../packages/sst/src/constructs/RemixSite.tsdoc.ts",
  ],
  tsconfig: path.resolve("../packages/sst/tsconfig.json"),
  preserveWatchOutput: true,
});

if (cmd === "watch") {
  // Triggers twice on file change for some reason
  app.convertAndWatch(async (reflection) => {
    await app.generateJson(reflection, "out.json");
    const json = await fs.readFile("./out.json").then(JSON.parse);
    await run(json);
    console.log("Generated docs");
  });
}

if (cmd === "build") {
  console.log("Generating docs...");
  const reflection = app.convert();
  await app.generateJson(reflection, "out.json");
  const json = await fs.readFile("./out.json").then(JSON.parse);
  await run(json);
  console.log("Generated docs");
}

/** @param json {JSONOutput.ModelToObject<ProjectReflection>} */
async function run(json) {
  for (const file of json.children) {
    // Class
    /** @type {(string | string[] | undefined)[]} */
    const lines = [];

    // Handle classes that extend other class, ie. RemixSite extends SsrSite.
    // We need to create a new file ie. RemixSite.tsdoc.ts, export * from
    // both files, and generate docs for the new file.
    if (file.name.endsWith(".tsdoc")) {
      file.name = file.name.replace(".tsdoc", "");
    }

    // get the construct class object in file
    const construct = file.children?.find((c) => c.kindString === "Class");
    if (!construct) {
      console.log("Skipping", file.name);
      continue;
    }
    lines.push(
      `<!--`,
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`,
      `!!                                                           !!`,
      `!!  This file has been automatically generated, do not edit  !!`,
      `!!                                                           !!`,
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`,
      `-->`
    );

    // Constructor
    const constructor = construct.children?.find(
      (c) => c.kindString === "Constructor"
    );
    if (!constructor)
      throw new Error(`Could not find Constructor in ${file.name}`);
    const isInternal =
      constructor.signatures[0].comment?.modifierTags?.includes("@internal");
    if (!isInternal) {
      lines.push("\n## Constructor");
      for (const signature of constructor.signatures) {
        let constructorName = signature.name;
        if (constructorName === "new Secret") {
          constructorName = "new Config.Secret";
        } else if (constructorName === "new Parameter") {
          constructorName = "new Config.Parameter";
        }
        lines.push("```ts");
        lines.push(
          `${constructorName}(${signature.parameters
            .map((p) => `${p.name}`)
            .join(", ")})`
        );
        lines.push("```");

        lines.push("_Parameters_");
        lines.push();
        for (let parameter of signature.parameters) {
          lines.push(
            `- __${parameter.name}__ ${renderType(
              file,
              json.children,
              parameter.name,
              parameter.type
            )}`
          );
        }
      }
    }

    const props = [];
    lines.push(props);

    // Properties
    const classProperties = renderProperties(
      file,
      json.children,
      construct.children,
      "",
      true
    );
    if (classProperties.length > 0) {
      lines.push(
        "## Properties",
        `An instance of \`${construct.name}\` has the following properties.`,
        ...classProperties
      );
    }

    // Methods
    const methods = (construct.children || [])
      .filter((c) => c.kindString === "Method")
      .filter(
        (c) => c.flags.isPublic && !c.flags.isExternal && !c.implementationOf
      )
      .filter(
        (c) => !c.signatures[0].comment?.modifierTags?.includes("@internal")
      );
    if (methods.length) {
      lines.push("## Methods");
      lines.push(
        `An instance of \`${construct.name}\` has the following methods.`
      );
      for (const method of methods) {
        lines.push(`### ${method.name}\n`);
        for (const signature of method.signatures) {
          lines.push(
            ...(signatureIsDeprecated(signature)
              ? renderSignatureForDeprecated(file, method, signature)
              : renderSignature(file, json.children, method, signature))
          );
        }
      }
    }

    // Interfaces
    (file.children || [])
      .sort((a, b) => a.name.length - b.name.length)
      .filter((c) => c.kindString === "Interface")
      .filter((c) => !c.comment?.modifierTags?.includes("@internal"))
      .forEach((c) => {
        const hoisted = c.name === `${file.name}Props` ? props : lines;
        hoisted.push(`## ${c.name}`);
        hoisted.push(...(c.comment?.summary || []).map((e) => e.text));
        hoisted.push(...(c.comment?.blockTags || []).map(renderTag));
        hoisted.push(...renderProperties(file, json.children, c.children));
      });

    const output = lines.flat(100).join("\n");
    const path = `docs/constructs/${file.name}.tsdoc.md`;
    await fs.writeFile(path, output);
    console.log("Wrote file", path);
  }
}

/**
 * @param tag {JSONOutput.CommentTag}
 */
function renderTag(tag) {
  return (tag.content || []).map((e) => e.text).join("\n");
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param files {JSONOutput.DeclarationReflection[]}
 * @param prefix {string}
 * @param parameter {JSONOutput.ParameterReflection["type"]}
 *
 * @returns {string}
 */
function renderType(file, files, prefix, parameter) {
  if (!parameter) {
    // TODO
    console.log("= = File", JSON.stringify({ prefix, file }, null, 2));
    console.log("= = = Parameter", JSON.stringify({ parameter }, null, 2));
    console.trace();
    throw new Error("No parameter");
    //return "";
  }
  if (!parameter.type) throw new Error(`No type for ${parameter}`);
  if (parameter.type === "conditional")
    return renderType(file, files, prefix, parameter.checkType);
  if (parameter.type === "array")
    return (
      "<span class='mono'>Array&lt;" +
      renderType(file, files, prefix, parameter.elementType) +
      "&gt;</span>"
    );
  // Note: intrinsic parameters can have type "reference",for now
  // manually exclude the names commonly used for intrinsic parameters
  if (parameter.type === "intrinsic" || parameter.name === "T")
    return `<span class="mono">${parameter.name}</span>`;
  if (parameter.type === "literal")
    return `<span class="mono">"${parameter.value}"</span>`;
  if (parameter.type === "template-literal") {
    const joined = [
      parameter.head,
      ...parameter.tail.map((x) => `$\{${x[0].name}\}${x[1]}`),
    ].join("");
    return `<span class="mono">${joined}</span>`;
  }
  if (
    parameter.type === "reflection" &&
    parameter.declaration &&
    parameter.declaration.signatures
  ) {
    const sig = parameter.declaration.signatures[0];
    if (sig.kind === ReflectionKind.CallSignature) {
      return `${sig.parameters
        .map((p) => renderType(file, files, prefix, p.type))
        .join(", ")} => ${renderType(file, files, prefix, sig.type)}`;
    }
  }
  if (parameter.type === "reflection" && prefix) {
    return (
      "\n" +
      renderProperties(
        file,
        files,
        parameter.declaration?.children,
        prefix
      ).join("\n")
    );
  }
  if (parameter.type === "union") {
    return parameter.types
      .map((t) => renderType(file, files, prefix, t))
      .filter((x) => x)
      .join("<span class='mono'> | </span>");
  }
  if (parameter.type === "reference") {
    if (parameter.package === "typescript")
      return `<span class="mono">${parameter.name}&lt;${parameter.typeArguments
        .map((x) => renderType(file, files, prefix, x))
        .join(", ")}&gt;</span>`;

    if (parameter.package) {
      if (parameter.package === "constructs")
        return `<span class="mono">[${parameter.name}](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.${parameter.name}.html)</span>`;
      if (parameter.package === "aws-cdk-lib") {
        const pkg = CDK_DOCS_MAP[parameter.name];
        if (pkg == null) throw new Error(`No package for ${parameter.name}`);
        if (!pkg)
          return `<span class="mono">[${parameter.name}](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.${parameter.name}.html)</span>`;
        if (pkg)
          return `<span class="mono">[${parameter.name}](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.${pkg}.${parameter.name}.html)</span>`;
      }
      if (parameter.package.startsWith("@aws-cdk")) {
        const [_, pkg] = parameter.package.split("/");
        return `<span class="mono">[${parameter.name}](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_${pkg}.${parameter.name}.html)</span>`;
      }
      if (parameter.package === "esbuild")
        return `<span class="mono">[${
          parameter.name
        }](https://esbuild.github.io/api/#${parameter.name.toLowerCase()})</span>`;
      if (parameter.package === ".pnpm") return "<span>.pnpm</span>";

      throw "Did not implement handler for package " + parameter.package;
    }

    // Find generic params
    const cls = file.children?.find((x) => x.kindString === "Class");
    if (cls) {
      const cons = cls.children?.find((x) => x.kindString === "Constructor");
      if (cons) {
        const sig = cons.signatures?.find(
          (x) => x.kindString === "Constructor signature"
        );
        if (sig) {
          const param = sig.typeParameter?.find(
            (x) => x.name === parameter.name
          );
          if (param) return renderType(file, files, prefix, param.type);
        }
      }
    }

    const id = parameter.id;
    const ref = files
      .flatMap((x) => x.children || [])
      .find((c) => c.id === id && c.kindString === "Type alias");
    if (ref?.kindString === "Type alias")
      return renderType(file, files, prefix, ref.type);

    const link = (() => {
      // Do not show link for "SSTConstruct" param type
      if (parameter.name === "SSTConstruct") {
        return undefined;
      }
      if (file.children?.find((c) => c.id === id))
        return `#${parameter.name.toLowerCase()}`;
      const otherFile = files.find((x) => x.children?.find((c) => c.id === id));
      if (otherFile) return otherFile.name + "#" + parameter.name.toLowerCase();
      return parameter.name;
    })();
    if (!link) return `<span class="mono">${parameter.name}</span>`;
    return `<span class="mono">[${parameter.name}](${link})</span>`;
  }
  return "";
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param files {JSONOutput.DeclarationReflection[]}
 * @param properties {JSONOutput.DeclarationReflection[]}
 * @param prefix {string}
 * @param onlyPublic {boolean}
 *
 * @returns {string}
 */
function renderProperties(file, files, properties, prefix, onlyPublic) {
  const filtered =
    properties?.filter(
      (c) =>
        !c.name.startsWith("_") &&
        (c.kindString === "Property" || c.kindString === "Accessor") &&
        !c.flags.isExternal &&
        (!onlyPublic || c.flags.isPublic) &&
        !c.comment?.modifierTags?.includes("@internal")
    ) || [];
  const lines = [];
  for (const property of filtered.sort((a, b) => {
    if (a.name.startsWith("cdk")) return 1;
    if (b.name.startsWith("cdk")) return -1;
    return a.name.localeCompare(b.name);
  })) {
    const signature = property.getSignature || property;
    const nextPrefix = [prefix, property.name].filter((x) => x).join(".");
    if (signature.type?.type !== "reflection")
      lines.push(`### ${nextPrefix}${signature.flags.isOptional ? "?" : ""}\n`);
    lines.push(
      (signature.type?.type === "reflection" ? "" : "_Type_ : ") +
        renderType(file, files, nextPrefix, signature.type) +
        "\n"
    );
    if (signature.comment) {
      const def = signature.comment.modifierTags?.find(
        (x) => x.tag === "@default"
      );
      if (def)
        lines.push(
          `_Default_ : <span class="mono">${def.content[0].text.trim()}</span>\n`
        );
      lines.push(...(signature.comment.summary || []).map((e) => e.text));
      const tags = signature.comment.blockTags || [];
      const examples = tags.filter((x) => x.tag === "@example");
      if (examples.length) {
        lines.push(
          ...examples
            .map(renderTag)
            .map((x) => x.replace(/new .+\(/g, `new ${file.name}(`))
        );
      }
      lines.push(
        ...tags
          .filter((x) => x.tag !== "@example" && x.tag !== "@default")
          .map(renderTag)
      );
    }
  }
  return lines;
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param children {JSONOutput.DeclarationReflection[]}
 * @param method {JSONOutput.DeclarationReflection}
 * @param signature {JSONOutput.DeclarationReflection}
 *
 * @returns {string}
 */
function renderSignature(file, children, method, signature) {
  const lines = [];
  lines.push("```ts");
  lines.push(
    `${method.flags.isStatic ? "static " : ""}${signature.name}(${
      signature.parameters?.map((p) => `${p.name}`).join(", ") || ""
    })`
  );
  lines.push("```");
  if (signature.parameters) {
    lines.push("_Parameters_");
    lines.push();
    for (let parameter of signature.parameters) {
      lines.push(
        `- __${parameter.name}__ ${renderType(
          file,
          children,
          parameter.name,
          parameter.type
        )}`
      );
    }
  }
  if (signature.comment) {
    lines.push("\n");
    lines.push(...(signature.comment.summary || []).map((e) => e.text));
    const tags = signature.comment.blockTags || [];
    const examples = tags.filter((x) => x.tag === "@example");
    if (examples.length) {
      lines.push(
        ...examples
          .map(renderTag)
          .map((x) => x.replace(/new .+\(/g, `new ${file.name}(`))
      );
    }
    lines.push(...tags.filter((x) => x.tag !== "@example").map(renderTag));
  }
  return lines;
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param children {JSONOutput.DeclarationReflection[]}
 * @param signature {JSONOutput.DeclarationReflection}
 *
 * @returns {string}
 */
function renderSignatureForDeprecated(file, method, signature) {
  const lines = [];
  lines.push(":::caution");
  lines.push("This function signature has been deprecated.");

  lines.push("```ts");
  lines.push(
    `${method.flags.isStatic ? "static " : ""}${signature.name}(${
      signature.parameters?.map((p) => `${p.name}`).join(", ") || ""
    })`
  );
  lines.push("```");

  if (signature.comment) {
    lines.push("\n");
    lines.push(...(signature.comment.summary || []).map((e) => e.text));
    const tags = signature.comment.blockTags || [];
    const examples = tags.filter((x) => x.tag === "@example");
    if (examples.length) {
      lines.push(
        ...examples
          .map(renderTag)
          .map((x) => x.replace(/new .+\(/g, `new ${file.name}(`))
      );
    }
    lines.push(...tags.filter((x) => x.tag !== "@example").map(renderTag));
  }

  lines.push(":::");

  return lines;
}

/**
 * @param signature {JSONOutput.DeclarationReflection}
 *
 * @returns {boolean}
 */
function signatureIsDeprecated(signature) {
  return signature.comment?.modifierTags?.includes("@deprecated");
}
