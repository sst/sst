import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DeleteLogGroupCommand,
  PutRetentionPolicyCommand,
  DeleteRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { useClient } from "../helpers/client.js";

interface Inputs {
  logGroupName: string;
  retentionInDays: number;
  region: aws.Region;
}

interface Outputs {
  logGroupArn: string;
  logGroupName: string;
}

export interface LogGroupInputs {
  logGroupName: Input<Inputs["logGroupName"]>;
  retentionInDays: Input<Inputs["retentionInDays"]>;
  region: Input<Inputs["region"]>;
}

export interface LogGroup {
  logGroupArn: Output<Outputs["logGroupArn"]>;
  logGroupName: Output<Outputs["logGroupName"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    await this.createLogGroup(inputs);
    await this.setRetentionPolicy(inputs);
    return {
      id: inputs.logGroupName,
      outs: {
        logGroupArn: `arn:aws:logs:${inputs.region}:*:log-group:${inputs.logGroupName}`,
        logGroupName: inputs.logGroupName,
      },
    };
  }

  async update(
    id: string,
    olds: Outputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    await this.createLogGroup(news);
    await this.setRetentionPolicy(news);
    return {
      outs: {
        logGroupArn: `arn:aws:logs:${news.region}:*:log-group:${news.logGroupName}`,
        logGroupName: news.logGroupName,
      },
    };
  }

  async delete(id: string, props: Inputs) {
    await this.deleteLogGroup(props);
  }

  async createLogGroup(inputs: Inputs) {
    const client = useClient(CloudWatchLogsClient, {
      region: inputs.region,
    });
    try {
      await client.send(
        new CreateLogGroupCommand({ logGroupName: inputs.logGroupName }),
      );
    } catch (error: any) {
      if (error.name === "ResourceAlreadyExistsException") return;
      throw error;
    }
  }

  async deleteLogGroup(inputs: Inputs) {
    const client = useClient(CloudWatchLogsClient, {
      region: inputs.region,
    });
    try {
      await client.send(
        new DeleteLogGroupCommand({ logGroupName: inputs.logGroupName }),
      );
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") return;
      throw error;
    }
  }

  async setRetentionPolicy(inputs: Inputs) {
    const client = useClient(CloudWatchLogsClient, {
      region: inputs.region,
    });
    const logGroupName = inputs.logGroupName;
    const retentionInDays = inputs.retentionInDays;
    if (retentionInDays === 0) {
      await client.send(new DeleteRetentionPolicyCommand({ logGroupName }));
    } else {
      await client.send(
        new PutRetentionPolicyCommand({ logGroupName, retentionInDays }),
      );
    }
  }
}

export class LogGroup extends dynamic.Resource {
  constructor(
    name: string,
    args: LogGroupInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new Provider(),
      `${name}.sst.aws.LogGroup`,
      { ...args, logGroupArn: undefined },
      opts,
    );
  }
}
