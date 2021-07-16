import { APIGatewayProxyResult } from "aws-lambda";

function LogMethod(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  console.log(target);
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
  return {
    statusCode: 200,
    body: "Hello",
    headers: { "Content-Type": "text/plain" },
  };
}
