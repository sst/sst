import udp from "dgram";
import stun from "stun";
import S3 from "aws-sdk/clients/s3";

const s3 = new S3();

type ReqMessage = {
  type: "ping";
  body: any;
};

type RetryMessage = {
  type: "retry";
  body: {
    id: string;
    indexes: number[];
  };
};

type SuccessMessage = {
  type: "success";
  body: any;
};

type FailureMessage = {
  type: "failure";
  body: {
    errorMessage: string;
    errorType: string;
    stackTrace: any[];
  };
};

type BigMessage = {
  type: "big";
  body: {
    bucket: string;
    key: string;
  };
};

type RequestMessage = {
  type: "request";
  body: any;
};

export type Message =
  | ReqMessage
  | RetryMessage
  | BigMessage
  | RequestMessage
  | SuccessMessage
  | FailureMessage;
type RequestHandler = (
  message: RequestMessage["body"]
) => Promise<SuccessMessage | FailureMessage>;

export class Server {
  private peers: Record<string, PeerEntry> = {};
  private readonly socket: udp.Socket;
  private pinger?: NodeJS.Timeout;
  private handleRequest?: RequestHandler;
  private bucket?: string;

  constructor() {
    this.socket = udp.createSocket("udp4");
  }

  public async start(bucket: string) {
    this.pinger = setInterval(() => this.ping(), 5000);
    this.bucket = bucket;
    this.socket.bind(10280);
    const result = await stun.request("stun.l.google.com:19302", {
      socket: this.socket,
    });
    const xor = result.getXorAddress();
    this.socket.on("message", (buf, from) => this.handleMessage(buf, from));
    return `${xor.address}:${xor.port}`;
  }

  public stop() {
    this.socket.close();
    if (this.pinger) clearInterval(this.pinger);
  }

  public addPeer(addr: Address) {
    const key = addr.host + ":" + addr.port;
    const peer: PeerEntry = {
      addr,
      lastSeen: Date.now(),
    };
    this.peers[key] = peer;
    return peer;
  }

  public async ping() {
    const msg = await this.encode({
      type: "ping",
      body: "ping",
    });

    for (const key in this.peers) {
      const peer = this.peers[key];
      if (Date.now() - peer.lastSeen > 1000 * 60 * 5) {
        delete this.peers[key];
        continue;
      }
      this.send(msg, peer.addr.port, peer.addr.host);
    }
  }

  public onRequest(cb: RequestHandler) {
    this.handleRequest = cb;
  }

  private async handleMessage(buf: Buffer, from: udp.RemoteInfo) {
    const msg = this.decode(buf);
    if (!msg) return;
    switch (msg.type) {
      case "request": {
        if (!this.handleRequest) return;
        const result = await this.handleRequest(msg.body);
        const bufs = await this.encode(result);
        this.send(bufs, from.port, from.address);
        break;
      }
      case "ping": {
        this.addPeer({
          host: from.address,
          port: from.port,
        });
        break;
      }
      case "retry": {
        const cache = this.sendCache[msg.body.id];
        if (!cache) break;
        const packets = msg.body.indexes.map((i) => cache[i]);
        this.send(packets, from.port, from.address);
        break;
      }
      default: {
        console.log("unknown message type", msg.type);
      }
    }
  }

  private send(parts: Buffer[], port: number, host: string) {
    for (const part of parts) {
      this.socket.send(part, port, host);
    }
  }

  private sendCache: Record<string, Buffer[]> = {};
  private async encode(msg: Message): Promise<Buffer[]> {
    const id = Math.random().toString().substring(2, 6);
    const json = JSON.stringify(msg);
    if (json.length > 1024 * 512) {
      await s3
        .upload({
          Bucket: this.bucket!,
          Key: id,
          Body: json,
        })
        .promise();
      return this.encode({
        type: "big",
        body: {
          bucket: this.bucket!,
          key: id,
        },
      });
    }

    const chunks = chunk(json, 1024 * 8);
    const length = Buffer.alloc(2);
    length.writeInt16BE(chunks.length);
    const idBytes = Buffer.from(id, "utf-8");
    const result: Buffer[] = [];

    for (const c of chunks) {
      const index = Buffer.alloc(2);
      index.writeUInt16BE(result.length);
      const buf = Buffer.concat([idBytes, length, index, Buffer.from(c)]);
      result.push(buf);
    }
    if (result.length > 1) {
      this.sendCache[id] = result;
      setTimeout(() => {
        delete this.sendCache[id];
      }, 1000 * 10);
    }

    return result;
  }

  private windows: Record<string, string[]> = {};
  private decode(buf: Buffer) {
    const id = buf.toString("utf8", 0, 4);
    const length = buf.readUInt16BE(4);
    const index = buf.readUInt16BE(6);
    const payload = buf.toString("utf8", 8);
    let parts = this.windows[id];
    if (!parts) {
      parts = Array(length).fill(null);
      this.windows[id] = parts;
    }
    parts[index] = payload;

    // Check if all parts have been received
    if (!parts.every((x) => x)) return false;
    delete this.windows[id];

    const msg = JSON.parse(parts.join("")) as Message;
    return msg;
  }
}

type PeerEntry = {
  addr: Address;
  lastSeen: number;
};

type Address = {
  host: string;
  port: number;
};

function chunk(str: string, size: number) {
  const num = Math.ceil(str.length / size);
  const chunks: string[] = new Array(num);

  for (let i = 0, o = 0; i < num; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}
