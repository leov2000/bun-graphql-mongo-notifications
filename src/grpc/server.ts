import * as grpc from '@grpc/grpc-js';
import { notificationServiceDefinition } from './proto/generated/notifications.grpc-server';
import { notificationServiceImpl } from './handlers';
import { AppMongoClient } from '../mongodb/mongo-client';
import * as protoLoader from '@grpc/proto-loader';
import * as reflection from '@grpc/reflection';
import * as path from 'path';

export async function initializeGrpcServer(
  mongoClient: AppMongoClient,
  port: string,
): Promise<grpc.Server> {
  const server = new grpc.Server();
  const PROTO_PATHS = path.join(__dirname, '../grpc/proto/notifications.proto');
  const packageDefinition = protoLoader.loadSync(PROTO_PATHS);
  const reflectionService = new reflection.ReflectionService(packageDefinition);

  server.addService(notificationServiceDefinition, notificationServiceImpl(mongoClient));
  reflectionService.addToServer(server);

  await new Promise<number>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`gRPC server started on port ${boundPort}`);
        resolve(boundPort);
      },
    );
  });

  return server;
}
