import * as grpc from '@grpc/grpc-js';
import { NotificationServiceService } from './proto/generated/notifications';
import { notificationServiceImpl } from './handlers';
import { AppMongoClient } from '../mongodb/mongo-client';

export async function initializeGrpcServer(
  mongoClient: AppMongoClient,
  port: string,
): Promise<grpc.Server> {
  const server = new grpc.Server();
  server.addService(NotificationServiceService, notificationServiceImpl(mongoClient));

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
