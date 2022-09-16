// source: https://github.com/iiroj/iiro.fi/commit/bd43222032d0dbb765e1111825f64dbb5db851d9

import lambdaAtEdgeCompat from '@sls-next/next-aws-cloudfront'
import type { CloudFrontRequestHandler } from 'aws-lambda'
import type { NextConfig } from 'next'
import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node'
import type { NodeRequestHandler } from 'next/dist/server/next-server'
import NextNodeServer from 'next/dist/server/next-server'
import fs from 'node:fs/promises'
import path from 'node:path'

let requestHandler: NodeRequestHandler

export const handler: CloudFrontRequestHandler = async (event) => {
    const { req, res, responsePromise } = lambdaAtEdgeCompat(event.Records[0].cf, { enableHTTPCompression: false })

    if (!requestHandler) {
        const json = await fs.readFile('./.next/required-server-files.json', 'utf-8')
        const RequiredServerFiles = JSON.parse(json) as { version: number; config: NextConfig }

        requestHandler = new NextNodeServer({
            // Next.js compression should be disabled because of a bug
            // in the bundled `compression` package. See:
            // https://github.com/vercel/next.js/issues/11669
            conf: { ...RequiredServerFiles.config, compress: false },
            customServer: false,
            dev: false,
            dir: path.join(__dirname, 'web'),
            minimalMode: true,
        }).getRequestHandler()
    }

    const nextRequest = new NodeNextRequest(req)
    const nextResponse = new NodeNextResponse(res)

    await requestHandler(nextRequest, nextResponse)

    return responsePromise
}
