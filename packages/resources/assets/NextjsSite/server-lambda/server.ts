// source: https://github.com/iiroj/iiro.fi/commit/bd43222032d0dbb765e1111825f64dbb5db851d9

import { reqResMapper } from './lambdaNextCompat'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import type { NextConfig } from 'next'
import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node'
import type { NodeRequestHandler } from 'next/dist/server/next-server'
import * as nss from 'next/dist/server/next-server'
import fs from 'node:fs/promises'
import path from 'node:path'

// memoize
let requestHandler: NodeRequestHandler

// invoked by Lambda URL; the format is the same as API Gateway v2
// https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-payloads
type LambdaUrlFunctionHandler = APIGatewayProxyHandlerV2

// somehow the default export gets buried inside itself...
const NextNodeServer: typeof nss.default = (nss.default as any)?.default ?? nss.default

export const handler: LambdaUrlFunctionHandler = async (event, context, callback) => {
    const { req, res, responsePromise } = reqResMapper(event, callback)

    if (!requestHandler) {
        const nextDir = path.join(__dirname, '.next')
        const requiredServerFilesPath = path.join(nextDir, "required-server-files.json")
        const json = await fs.readFile(requiredServerFilesPath, 'utf-8')
        const requiredServerFiles = JSON.parse(json) as { version: number; config: NextConfig }

        requestHandler = new NextNodeServer({
            // Next.js compression should be disabled because of a bug
            // in the bundled `compression` package. See:
            // https://github.com/vercel/next.js/issues/11669
            conf: { ...requiredServerFiles.config, compress: false },
            customServer: false,
            dev: false,
            dir: __dirname,
            minimalMode: true,
        }).getRequestHandler()
    }

    const nextRequest = new NodeNextRequest(req)
    const nextResponse = new NodeNextResponse(res)

    await requestHandler(nextRequest, nextResponse)

    return responsePromise
}
