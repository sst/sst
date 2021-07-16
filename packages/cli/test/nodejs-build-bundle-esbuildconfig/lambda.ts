import { APIGatewayProxyResult } from "aws-lambda";

function LogMethod(
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  console.log(propertyKey);
  console.log(descriptor);
}

class Demo {
  @LogMethod
  public foo(bar: number) {
    console.log(bar);
  }
}

const demo = new Demo();

export async function main(): Promise<APIGatewayProxyResult> {
  console.log(demo);
  return {
    statusCode: 200,
    body: "Hello",
    headers: { "Content-Type": "text/plain" },
  };
}
