---
title: Migrate to v1.0
description: "Docs for the constructs in the @serverless-stack/resources package"
---

### App Changelog

app.setDefaultRemovalPolicy cdk.RemovalPolicy ⇒ “destroy” | “retain” | “snapshot”

### Permissions Changelog

PermissionType.ALL ⇒ “*”

### ALL CONSTRUCTS Change log

- defaultFunctionProps ⇒ defaults.function
- Functions ⇒ Does not take Props

### Function Change log

- Constructor
    
    FunctionProps.runtime “string | lambda.Runtime” ⇒ “string”
    
    FunctionProps.timeout number | cdk.Duration ⇒ number
    
    FunctionProps.tracing `lambda.tracing` ⇒ `"active | disabled | pass_through”`
    

### Api Change log

- Enums
    
    ApiAuthorizationType removed, use string union
    
    ApiPayloadFormatVersion removed, use string union
    
- Constructor
    
    ApiProps.httpApi => ApiProps.cdk.httpApi
    
    ApiProps.stages => ApiProps.cdk.httpStages
    
    ApiProps.cors.allowMethods: [CorsHttpMethod.GET] => ["GET"]
    
    ApiProps.cors.maxAge: cdk.Duration.days(3) => "3 days"
    
    ApiProps.accessLog.retention: logs.RetentionDays | "TWO WEEKS" => "two weeks"
    
- Constructor: defaults
    
    ApiProps.defaultFunctionProps => ApiProps.defaults.functionProps
    
    ApiProps.defaultAuthorizer => ApiProps.defaults.authorizer (takes string now)
    
    ApiProps.defaultAuthorizationType => removed
    
    ApiProps.defaultAuthorizationScopes => ApiProps.defaults.authorizationScopes
    
    ApiProps.defaultPayloadFormatVersion => ApiProps.defaults.payloadFormatVersion
    
    ApiProps.defaultThrottlingBurstLimit => ApiProps.defaults.throtte.burst
    
    ApiProps.defaultThrottlingRateLimit => ApiProps.defaults.throttle.rate
    
- Constructor: domain
    
    ApiProps.customDomain.domainName (imported) => ApiProps.customDomain.cdk.domainName
    
    ApiProps.customDomain.hostedZone (imported) => ApiProps.customDomain.cdk.hostedZone
    
    ApiProps.customDomain.acmCertificate => ApiProps.customDomain.cdk.certificate
    
- Constructor: authorizers
    
    ApiProps.authorizers: move authorizer creation inline
    
    ApiProps.authorizers NONE
    
    ApiProps.authorizers USER_POOL
    
    ApiProps.authorizers JWT
    
    ApiProps.authorizers IAM
    
    ApiProps.authorizers LAMBDA
    
    - resultsCacheTtl default 5min ⇒ 0
- Constructor: routes
    
    ApiProps.routes.[Function] => Does not take Props
    
    ApiProps.routes.[ApiAlbRouteProps].albListener => ApiProps.routes.[ApiAlbRouteProps].cdk.albListener
    
    ApiProps.routes.[ApiAlbRouteProps].method => ApiProps.routes.[ApiAlbRouteProps].cdk.integration.method
    
    ApiProps.routes.[ApiAlbRouteProps].vpcLink => ApiProps.routes.[ApiAlbRouteProps].cdk.integration.vpcLink
    
    ApiProps.routes.[ApiUrlRouteProps].method => ApiProps.routes.[ApiUrlRouteProps].cdk.method
    
    ApiProps.routes.[ALL].authorizer => takes string now
    
    ApiProps.routes.[ALL].authorizationType => removed
    
- Properties
    
    Api.httpApi => Api.cdk.httpApi
    
    Api.accessLogGroup => Api.cdk.accessLogGroup
    
    Api.apiGatewayDomain => Api.cdk.domainName
    
    Api.acmCertificate => Api.cdk.certificate
    

### GraphQLApi Change log

- Construct: defaults
    
    GraphQLApiProps.defaults.payloadFormatVersion `"1.0"` => `"2.0"` Set it to `"1.0"` explicitly
    

### ApiGatewayV1 Change log

- Constructor
    
    ApiGatewayV1ApiProps.restApi => ApiGatewayV1ApiProps.cdk.restApi
    
    ApiGatewayV1ApiProps.importedPaths => ApiGatewayV1ApiProps.cdk.importedPaths
    
    ApiGatewayV1ApiProps.accessLog.retention: logs.RetentionDays | "TWO WEEKS" => "two weeks"
    
- Constructor: defaults
    
    ApiProps.defaultFunctionProps => ApiProps.defaults.functionProps
    
    ApiProps.defaultAuthorizer => ApiProps.defaults.authorizer (takes string now)
    
    ApiProps.defaultAuthorizationType => removed
    
    ApiProps.defaultAuthorizationScopes => ApiProps.defaults.authorizationScopes
    
- Constructor: domain
    
    ApiGatewayV1ApiProps.customDomain.domainName (imported) => ApiGatewayV1ApiProps.customDomain.cdk.domainName
    
    ApiGatewayV1ApiProps.customDomain.hostedZone (imported) => ApiGatewayV1ApiProps.customDomain.cdk.hostedZone
    
    ApiGatewayV1ApiProps.customDomain.acmCertificate => ApiGatewayV1ApiProps.customDomain.cdk.certificate
    
    ApiGatewayV1ApiProps.customDomain.endpointType (enum) ⇒ “edge | regional | private”
    
    ApiGatewayV1ApiProps.customDomain.securityPolicy (enum) ⇒ “TLS 1.0 | TLS 1.2”
    
    ApiGatewayV1ApiProps.customDomain.mtls.bucket ⇒ takes sst.Bucket
    
- Constructor: authorizers
    
    ApiProps.authorizers: move authorizer creation inline
    
    ApiProps.authorizers NONE
    
    ApiProps.authorizers `user_pools`
    
    ApiProps.authorizers `lambda_token`
    
    ApiProps.authorizers `lambda_request`
    
    ApiProps.authorizers IAM
    
    - resultsCacheTtl default 5min ⇒ 0
- Constructor: routes
    
    ApiGatewayV1ApiProps.routes.[Function] => Does not take Props
    
    ApiGatewayV1ApiProps.routes.[Function].methodOptions.authorizer => ApiGatewayV1ApiProps.routes.[Function].authorizer (takes string now)
    
    ApiGatewayV1ApiProps.routes.[Function].methodOptions.authorizationType => removed
    
    ApiGatewayV1ApiProps.routes.[Function].methodOptions.authorizationScopes => ApiGatewayV1ApiProps.routes.[Function].authorizationScopes
    
    ApiGatewayV1ApiProps.routes.[Function].methodOptions => ApiGatewayV1ApiProps.routes.[Function].cdk.method
    
    ApiGatewayV1ApiProps.routes.[Function].integrationOptions => ApiGatewayV1ApiProps.routes.[Function].cdk.integration
    
- Properties

### WebSocketApi Change log

- Constructor
    
    WebSocketApiProps.webSocketApi => WebSocketApiProps.cdk.webSocketApi
    
    WebSocketApiProps.webSocketStage => WebSocketApiProps.cdk.webSocketStage
    
    WebSocketApiProps.authorizer: move authorizer creation inline
    
    WebSocketApiProps.authorizer: none | iam | { type }
    
    WebSocketApiProps.accessLog.retention: logs.RetentionDays | "TWO WEEKS" => "two weeks"
    
- Constructor: domain
    
    WebSocketApiProps.customDomain.domainName (imported) => WebSocketApiProps.customDomain.cdk.domainName
    
    WebSocketApiProps.customDomain.hostedZone (imported) => WebSocketApiProps.customDomain.cdk.hostedZone
    
    WebSocketApiProps.customDomain.acmCertificate => WebSocketApiProps.customDomain.cdk.certificate
    
- Properties
    
    WebSocketApi.webSocketApi => WebSocketApi.cdk.webSocketApi
    
    WebSocketApi.webSocketStage => WebSocketApi.cdk.webSocketStage
    
    WebSocketApi.accessLogGroup => WebSocketApi.cdk.accessLogGroup
    
    WebSocketApi.apiGatewayDomain => WebSocketApi.cdk.domainName
    
    WebSocketApi.acmCertificate => WebSocketApi.cdk.certificate
    

### AppSyncApi Change log

- Constructor
    
    AppSyncApiProps.graphqlApi.schema `string | string[]` => AppSyncApiProps.schema
    
    AppSyncApiProps.graphqlApi => AppSyncApiProps.cdk.graphqlApi
    
    AppSyncApiProps.dataSources[lambda].options.name ⇒ AppSyncApiProps.dataSources[lambda].name
    
    AppSyncApiProps.dataSources[lambda].options.description ⇒ AppSyncApiProps.dataSources[lambda].description
    
    AppSyncApiProps.dataSources[dynamodb].options.name ⇒ AppSyncApiProps.dataSources[dynamodb].name
    
    AppSyncApiProps.dataSources[dynamodb].options.description ⇒ AppSyncApiProps.dataSources[dynamodb].description
    
    AppSyncApiProps.dataSources[dynamodb].options.table (when is dynamodb.Table) ⇒ AppSyncApiProps.dataSources[dynamodb].cdk.dataSource.table
    
    AppSyncApiProps.dataSources[rds].options.name ⇒ AppSyncApiProps.dataSources[rds].name
    
    AppSyncApiProps.dataSources[rds].options.description ⇒ AppSyncApiProps.dataSources[rds].description
    
    AppSyncApiProps.dataSources[rds].options.serverlessCluster ⇒ AppSyncApiProps.dataSources[rds].cdk.dataSource.serverlessCluster
    
    AppSyncApiProps.dataSources[rds].options.secretStore ⇒ AppSyncApiProps.dataSources[rds].cdk.dataSource.secretStore
    
    AppSyncApiProps.dataSources[rds].options.databaseName ⇒ AppSyncApiProps.dataSources[rds].cdk.dataSource.databaseName
    
    AppSyncApiProps.dataSources[http].options.name ⇒ AppSyncApiProps.dataSources[http].name
    
    AppSyncApiProps.dataSources[http].options.description ⇒ AppSyncApiProps.dataSources[http].description
    
    AppSyncApiProps.dataSources[http].options.authorizationConfig ⇒ AppSyncApiProps.dataSources[http].cdk.dataSource.authorizationConfig
    
    AppSyncApiProps.resolvers[any].resolverProps ⇒ AppSyncApiProps.resolvers[any].cdk.resolver
    
- Properties
    
    Api.graphqlApi => Api.cdk.graphqlApi
    

### Auth Change log

- Constructor
    
    AuthCognitoProps.userPool => AuthProps.cdk.userPool
    
    AuthCognitoProps.userPoolClient => AuthProps.cdk.userPoolClient
    
- Properties
    
    Auth.cognitoUserPool => Auth.cdk.userPool
    
    Auth.cognitoUserPoolClient => Auth.cdk.userPoolClient
    
    Auth.cognitoCfnIdentityPool => Auth.cdk.cfnIdentityPool
    
    Auth.iamAuthRole => Auth.cdk.authRole
    
    Auth.iamUnauthRole => Auth.cdk.unauthRole
    

### Bucket Change log

- Constructor
    
    BucketProps.s3Bucket => BucketProps.cdk.bucket
    
    BucketProps.notifications[] => BucketProps.notifications{}
    
    ```jsx
    new Bucket(this, "Bucket", {
      notifications: [
        "src/function1.main",
        "src/function2.main",
      ],
    });
    
    // to
    new Bucket(this, "Bucket", {
      notifications: {
        "0": "src/function1.main",
        "1": "src/function2.main",
      },
    });
    ```
    
    BucketProps.notifications[ANY].notificationProps.events ⇒ BucketProps.notifications[ANY].events
    
    BucketProps.notifications[ANY].notificationProps.events s3.EventType ⇒ "object_created”
    
    BucketProps.notifications[ANY].notificationProps.filters ⇒ BucketProps.notifications[ANY].filters
    
    BucketProps.notifications[ANY].notificationProps.filters ⇒ BucketProps.notifications[ANY].filters
    
- Methods
    
    Bucket.addNotifications[] ⇒Bucket.addNotifications{}
    
    ```jsx
    bucket.addNotifications(this, [
      "src/function1.main",
      "src/function2.main",
    ]);
    
    //to
    bucket.addNotifications(this, {
      "0": "src/function1.main",
      "1": "src/function2.main",
    });
    ```
    
    Bucket.attachPermissionsToNotification(index, permission) ⇒ Bucket.attachPermissionsToNotification(subscriberName, permission)
    
- Properties
    
    Bucket.s3Bucket => Bucket.cdk.bucket
    

### Cron Change log

- Constructor
    
    CronProps.eventsRule => CronProps.cdk.rule
    
    CronProps.schedule (if is events.CronOptions) ⇒ CronProps.cdk.rule.schedule
    
    CronProps.job[ANY].jobProps ⇒ CronProps.job[ANY].cdk.target
    
- Properties
    
    Cron.eventsRule => Cron.cdk.rule
    

### EventBus Change log

- Constructor
    
    EventBusProps.eventBridgeEventBus => EventBusProps.cdk.eventBus
    
    EventBusProps.rules[ANY].description => EventBusProps.rules[ANY].cdk.rule.description
    
    EventBusProps.rules[ANY].enabled => EventBusProps.rules[ANY].cdk.rule.enabled
    
    EventBusProps.rules[ANY].eventPattern => EventBusProps.rules[ANY].cdk.rule.eventPattern
    
    EventBusProps.rules[ANY].ruleName => EventBusProps.rules[ANY].cdk.rule.ruleName
    
    EventBusProps.rules[ANY].schedule => EventBusProps.rules[ANY].cdk.rule.schedule
    
    EventBusProps.rules[ANY].targets[] => EventBusProps.rules[ANY].targets{}
    
    ```jsx
    new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
    		  targets: [
    		    "src/function1.main",
    		    "src/function2.main",
    		  ],
    		},
    	},
    });
    
    // to
    new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
    		  targets: {
    		    "0": "src/function1.main",
    		    "1": "src/function2.main",
    		  },
    		},
    	},
    });
    ```
    
    EventBusProps.rules[ANY].targets[ANY].targetProps => EventBusProps.rules[ANY].targets[ANY].cdk.target
    
- Methods
    
    EventBus.addNotifications[] ⇒EventBus.addNotifications{}
    
    ```jsx
    bus.addRules(this, {
      rule2: {
        eventPattern: { source: ["myevent"] },
    	  targets: [
    	    "src/function3.main",
    	    "src/function4.main",
    	  ],
    	}
    });
    
    //to
    bus.addRules(this, {
      rule2: {
        eventPattern: { source: ["myevent"] },
    	  targets: {
    	    "2": "src/function3.main",
    	    "3": "src/function4.main",
    	  },
    	}
    });
    ```
    
    EventBus.attachPermissionsToTarget(ruleKey, targetIndex, permission) ⇒ EventBus.attachPermissionsToTarget(ruleKey, targetName, permission)
    
- Properties
    
    EventBus.eventBus => EventBus.cdk.eventBus
    

### KinesisStream Change log

- Constructor
    
    KinesisStreamProps.kinesisStream => KinesisStreamProps.cdk.stream
    
    KinesisStreamProps.consumers[ANY].consumerProps => KinesisStreamProps.consumers[ANY].cdk.eventSource
    
- Properties
    
    KinesisStream.kinesisStream => KinesisStream.cdk.stream
    

### Queue Change log

- Constructor
    
    QueueProps.sqsQueue => QueueProps.cdk.queue
    
    QueueProps.consumer.consumerProps => QueueProps.consumer.cdk.eventSource
    
- Properties
    
    Queue.sqsQueue => Queue.cdk.queue
    

### RDS Change log

- Constructor
    
    RDSProps.rdsServerlessCluster => RDSProps.cdk.cluster
    
- Properties
    
    RDS.rdsServerlessCluster => RDS.cdk.cluster
    

### Table Change log

- Constructor
    
    TableProps.dynamodbTable => TableProps.cdk.table
    
    TableProps.fields[ANY] dynamodb.AttributeType TableFieldType => “binary | number | string”
    
    TableProps.stream dynamodb.StreamViewType => “new_image | old_image | new_and_old_images | keys_only”
    
    TableProps.primaryIndex.indexProps => TableProps.primaryIndex.cdk.index
    
    TableProps.globalIndexes[ANY].indexProps => TableProps.globalIndexes[ANY].cdk.index
    
    TableProps.localIndexes[ANY].indexProps => TableProps.localIndexes[ANY].cdk.index
    
    QueueProps.consumers[ANY].consumerProps => QueueProps.consumers[ANY].cdk.eventSource
    
- Properties
    
    Table.dynamodbTable => Table.cdk.table
    

### Topic Change log

- Constructor
    
    TopicProps.snsTopic => TopicProps.cdk.table
    
    TopicProps.subscribers[] => TopicProps.subscribers{}
    
    ```jsx
    new Topic(this, "Topic", {
      subscribers: [
        "src/function1.main",
        "src/function2.main",
      ],
    });
    
    // to
    new Topic(this, "Topic", {
      subscribers: {
        "0": "src/function1.main",
        "1": "src/function2.main",
      },
    });
    ```
    
    TopicProps.subscribers[ANY].subscriberProps ⇒ TopicProps.subscribers[ANY].cdk.subscription
    
- Methods
    
    Topic.addSubscribers[] ⇒Topic.addSubscribers{}
    
    ```jsx
    topic.addSubscribers(this, [
      "src/function1.main",
      "src/function2.main",
    ]);
    
    //to
    topic.addSubscribers(this, {
      "0": "src/function1.main",
      "1": "src/function2.main",
    });
    ```
    
    Topic.attachPermissionsToSubscriber(index, permission) ⇒Topic.attachPermissionsToSubscriber(subscriberName, permission)
    
- Properties
    
    Topic.snsTopic => Topic.cdk.topic
    
    Topic.snsSubscriptions => Topic.subscriptions
    

### StaticSite/ReactStaticSite/ViteStaticSite Change log

- Constructor
    
    StaticSiteProps.s3Bucket ⇒ StaticSiteProps.cdk.bucket
    
    StaticSiteProps.cfDistribution ⇒ StaticSiteProps.cdk.distribution
    
    StaticSiteProps.customDomain.hostedZone (is construct) => StaticSiteProps.customDomain.cdk.hostedZone
    
    StaticSiteProps.customDomain.certificate => StaticSiteProps.customDomain.cdk.certificate
    
    StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE ⇒ “redirect_to_index_page”
    
- Properties
    
    StaticSite.s3Bucket => StaticSite.cdk.bucket
    
    StaticSite.cfDistribution => StaticSite.cdk.distribution
    
    StaticSite.hostedZone => StaticSite.cdk.hostedZone
    
    StaticSite.acmCertificate => StaticSite.cdk.certificate
    

### NextjsSite Change log

- Constructor
    
    NextjsSiteProps.s3Bucket ⇒ NextjsSiteProps.cdk.bucket
    
    NextjsSiteProps.cfDistribution ⇒ NextjsSiteProps.cdk.distribution
    
    NextjsSiteProps.cfCachePolicies ⇒ NextjsSiteProps.cdk.cachePolicies
    
    NextjsSiteProps.sqsRegenerationQueue ⇒ NextjsSiteProps.cdk.regenerationQueue
    
    NextjsSiteProps.customDomain.hostedZone (is construct) => NextjsSiteProps.customDomain.cdk.hostedZone
    
    NextjsSiteProps.customDomain.certificate => NextjsSiteProps.customDomain.cdk.certificate
    
- Properties
    
    NextjsSite.s3Bucket => NextjsSite.cdk.bucket
    
    NextjsSite.sqsRegenerationQueue => NextjsSite.cdk.regenerationQueue
    
    NextjsSite.cfDistribution => NextjsSite.cdk.distribution
    
    NextjsSite.hostedZone => NextjsSite.cdk.hostedZone
    
    NextjsSite.acmCertificate => NextjsSite.cdk.certificate
