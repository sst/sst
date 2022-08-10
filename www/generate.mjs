import fs from "fs/promises";
import {
  Application,
  TSConfigReader,
  JSONOutput,
  ProjectReflection,
  ReflectionKind,
} from "typedoc";
import path from "path";

const cmd = process.argv[2];

const CDK_DOCS_MAP = {
  AppProps: "",
  Duration: "",
  Stack: "",
  StackProps: "",
  CfnOutputProps: "",
  IVpc: "aws_ec2",
  LogGroup: "aws_logs",
  IHostedZone: "aws_route53",
  ISecret: "aws_secretsmanager",
  IApplicationListener: "IApplicationListener",
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
  SqsSubscriptionProps: "aws_sns",
  LambdaSubscriptionProps: "aws_sns",
  Runtime: "aws_lambda",
  Tracing: "aws_lambda",
  Function: "aws_lambda",
  IFunction: "aws_lambda",
  ILayerVersion: "aws_lambda",
  FunctionOptions: "aws_lambda",
  SqsEventSourceProps: "aws_lambda",
  DynamoEventSourceProps: "aws_lambda",
  KinesisEventSourceProps: "aws_lambda",
  ICommandHooks: "aws_lambda_nodejs",
  Distribution: "aws_cloudfront",
  ICachePolicy: "aws_cloudfront",
  CachePolicyProps: "aws_cloudfront",
  IOriginRequestPolicy: "aws_cloudfront",
  OriginRequestPolicyProps: "aws_cloudfront",
  AddBehaviorOptions: "aws_cloudfront",
};

const app = new Application();
app.options.addReader(new TSConfigReader());
app.bootstrap({
  entryPoints: [
    "../packages/resources/src/Stack.ts",
    "../packages/resources/src/Api.ts",
    "../packages/resources/src/ApiGatewayV1Api.ts",
    "../packages/resources/src/App.ts",
    "../packages/resources/src/Auth.ts",
    "../packages/resources/src/Bucket.ts",
    "../packages/resources/src/Cron.ts",
    "../packages/resources/src/Config.ts",
    "../packages/resources/src/RDS.ts",
    "../packages/resources/src/Table.ts",
    "../packages/resources/src/Topic.ts",
    "../packages/resources/src/Parameter.ts",
    "../packages/resources/src/Script.ts",
    "../packages/resources/src/Secret.ts",
    "../packages/resources/src/Queue.ts",
    "../packages/resources/src/Function.ts",
    "../packages/resources/src/EventBus.ts",
    "../packages/resources/src/StaticSite.ts",
    "../packages/resources/src/NextjsSite.ts",
    "../packages/resources/src/RemixSite.ts",
    "../packages/resources/src/AppSyncApi.ts",
    "../packages/resources/src/GraphQLApi.ts",
    "../packages/resources/src/ViteStaticSite.ts",
    "../packages/resources/src/KinesisStream.ts",
    "../packages/resources/src/WebSocketApi.ts",
    "../packages/resources/src/ReactStaticSite.ts",
    "../packages/resources/src/DebugApp.ts",
    "../packages/resources/src/DebugStack.ts",
  ],
  tsconfig: path.resolve("../packages/resources/tsconfig.json"),
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
    /** @type {(string | string[] | undefined)[]} */
    const lines = [];
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
    const isInternal = constructor.signatures[0].comment?.tags?.find(
      (t) => t.tag === "internal"
    );
    if (!isInternal) {
      lines.push("\n## Constructor");
      for (const signature of constructor.signatures) {
        lines.push("```ts");
        lines.push(
          `${signature.name}(${signature.parameters
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
    lines.push("## Properties");
    lines.push(
      `An instance of \`${construct.name}\` has the following properties.`
    );
    lines.push(
      ...renderProperties(file, json.children, construct.children, "", true)
    );

    // Methods
    const methods =
      construct.children?.filter(
        (c) =>
          c.kindString === "Method" &&
          c.flags.isPublic &&
          !c.flags.isExternal &&
          !c.implementationOf
      ) || [];
    if (methods.length) {
      lines.push("## Methods");
      lines.push(
        `An instance of \`${construct.name}\` has the following methods.`
      );
      for (const method of methods) {
        lines.push(`### ${method.name}\n`);
        for (const signature of method.signatures) {
          lines.push(
            ...signatureIsDeprecated(signature)
              ? renderSignatureForDeprecated(file, json.children, signature)
              : renderSignature(file, json.children, signature)
          );
        }
      }
    }

    for (const child of (file.children || []).sort(
      (a, b) => a.name.length - b.name.length
    )) {
      if (child.kindString === "Interface") {
        const hoisted = child.name === `${file.name}Props` ? props : lines;
        hoisted.push(`## ${child.name}`);
        hoisted.push(child.comment?.shortText);
        hoisted.push(child.comment?.text);
        const examples =
          child.comment?.tags?.filter((x) => x.tag === "example") || [];
        if (examples.length) {
          hoisted.push(...examples.map(renderTag));
        }
        hoisted.push(...renderProperties(file, json.children, child.children));
      }
    }

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
  return tag.text;
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
  if (!parameter) throw new Error("No parameter");
  if (!parameter.type) throw new Error(`No type for ${parameter}`);
  if (parameter.type === "conditional")
    return renderType(file, files, prefix, parameter.checkType);
  if (parameter.type === "array")
    return (
      "<span class='mono'>Array&lt;" +
      renderType(file, files, prefix, parameter.elementType) +
      "&gt;</span>"
    );
  if (parameter.type === "intrinsic")
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
    return (
      "<span class='mono'>" +
      parameter.types
        .map((t) => renderType(file, files, prefix, t))
        .filter((x) => x)
        .join(" | ") +
      "</span>"
    );
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
        !c.comment?.tags?.find((x) => x.tag === "internal")
    ) || [];
  const lines = [];
  for (const property of filtered.sort((a, b) => {
    if (a.name.startsWith("cdk")) return 1;
    if (b.name.startsWith("cdk")) return -1;
    return a.name.localeCompare(b.name);
  })) {
    const signature = property.getSignature?.[0] || property;
    const nextPrefix = [prefix, property.name].filter((x) => x).join(".");
    if (signature.type?.type !== "reflection")
      lines.push(`### ${nextPrefix}${signature.flags.isOptional ? "?" : ""}\n`);
    lines.push(
      (signature.type?.type === "reflection" ? "" : "_Type_ : ") +
        renderType(file, files, nextPrefix, signature.type) +
        "\n"
    );
    if (signature.comment) {
      const def = signature.comment.tags?.find((x) => x.tag === "default");
      if (def)
        lines.push(
          `_Default_ : <span class="mono">${def.text.trim()}</span>\n`
        );
      lines.push(signature.comment.shortText);
      lines.push(signature.comment.text);
      const tags = signature.comment.tags || [];
      const examples = tags.filter((x) => x.tag === "example");
      if (examples.length) {
        lines.push(
          ...examples
            .map(renderTag)
            .map((x) => x.replace(/new .+\(/g, `new ${file.name}(`))
        );
      }
      lines.push(
        ...tags
          .filter((x) => x.tag !== "example" && x.tag !== "default")
          .map(renderTag)
      );
    }
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
function renderSignature(file, children, signature) {
  const lines = [];
  lines.push("```ts");
  lines.push(
    `${signature.name}(${
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
    lines.push(signature.comment.shortText);
    lines.push(signature.comment.text);
    const tags = signature.comment.tags || [];
    const examples = tags.filter((x) => x.tag === "example");
    if (examples.length) {
      lines.push(...examples.map(renderTag));
    }
    lines.push(
      ...tags.filter((x) => x.tag !== "example").map(renderTag)
    );
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
function renderSignatureForDeprecated(file, children, signature) {
  const lines = [];
  lines.push(":::caution");
  lines.push("This function signature has been deprecated.");

  lines.push("```ts");
  lines.push(
    `${signature.name}(${
      signature.parameters?.map((p) => `${p.name}`).join(", ") || ""
    })`
  );
  lines.push("```");

  if (signature.comment) {
    lines.push("\n");
    lines.push(signature.comment.shortText);
    lines.push(signature.comment.text);
    const tags = signature.comment.tags || [];
    const examples = tags.filter((x) => x.tag === "example");
    if (examples.length) {
      lines.push(...examples.map(renderTag));
    }
    lines.push(
      ...tags.filter((x) => x.tag !== "example").map(renderTag)
    );
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
  return signature.comment?.tags?.some((y) => y.tag === "deprecated");
}