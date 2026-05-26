// Note: These imports expect that you have already run the protoc generation 
// step defined in HANDOFF_GRPC_WEB.md
// @ts-ignore
import { DashboardClient } from './generated/telemetry_grpc_web_pb';
// @ts-ignore
import { StreamRequest } from './generated/telemetry_pb';

export class GRPCService {
  private client: any;

  constructor(envoyUrl: string = 'http://localhost:8081') {
    // Connect to the Envoy proxy port
    this.client = new DashboardClient(envoyUrl, null, null);
  }

  public streamTelemetry(onData: (data: any) => void, onError: (err: any) => void) {
    const request = new StreamRequest();
    
    // Attempting to stream
    const stream = this.client.streamTelemetry(request, {});

    stream.on('data', (response: any) => {
      // toObject() unpacks the protobuf message into a standard JS object
      onData(response.toObject());
    });

    stream.on('error', (err: any) => {
      onError(err);
    });

    stream.on('end', () => {
      console.log('gRPC-Web telemetry stream ended gracefully');
    });

    return stream;
  }
}

export const grpcService = new GRPCService();
