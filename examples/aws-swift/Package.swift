// swift-tools-version: 5.10

import PackageDescription

let package = Package(
  name: "swift",
  platforms: [
    .macOS(.v14)
  ],
  dependencies: [
    .package(url: "https://github.com/swift-server/swift-aws-lambda-runtime.git", branch: "main"),
    .package(url: "https://github.com/swift-server/swift-aws-lambda-events.git", branch: "main"),
  ],
  targets: [
    .executableTarget(
      name: "app",
      dependencies: [
        .product(name: "AWSLambdaRuntime", package: "swift-aws-lambda-runtime"),
        .product(name: "AWSLambdaEvents", package: "swift-aws-lambda-events"),
      ]
    )
  ]
)
