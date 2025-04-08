import Bun from 'bun';
import { renderAltairAssets } from '../graphql/altair';
import { bootstrapYoga, schema } from '../graphql/schema';
import { createWebsocketHandler } from '../graphql/ws';
import { mongoSingletonClient, parseApplicationConfig } from '../common/utils';
import { initializeGrpcServer } from '../grpc/server';
import { mongoDBHealthCheckRequest } from '../mongodb/mongo-health-check';

(async (): Promise<void> => {
  const appConfig = await parseApplicationConfig();
  const mongoClient = mongoSingletonClient(appConfig);

  try {
    await mongoClient.connect();
  } catch (error) {
    console.log(`An exception has occurred while attempting to connect to MongoDB ${error}`);
  }

  const yoga = await bootstrapYoga(appConfig, mongoClient);

  try {
    Bun.serve({
      fetch: async (request: Request, server: Bun.Server): Promise<Response> => {
        if (server.upgrade(request)) {
          return new Response();
        }

        const url = new URL(request.url);

        if (url.pathname === '/health') {
          return await mongoDBHealthCheckRequest(mongoClient);
        }

        if (
          url.pathname === appConfig.altair.altairEndpointURL ||
          url.pathname.startsWith(appConfig.altair.altairBaseURL)
        ) {
          return renderAltairAssets(url, appConfig);
        }

        return yoga.fetch(request, server);
      },
      hostname: appConfig.server.hostname,
      port: appConfig.server.port,
      websocket: createWebsocketHandler(yoga, schema),
    });

    console.log(`
      Server running at http://${appConfig.server.hostname}:${appConfig.server.port}
      GraphQL endpoint: http://${appConfig.server.hostname}:${appConfig.server.port}${appConfig.altair.graphQLEndpointURL}
      Altair GraphQL client: http://${appConfig.server.hostname}:${appConfig.server.port}${appConfig.altair.altairEndpointURL}
      Health endpoint: http://${appConfig.server.hostname}:${appConfig.server.port}/health
    `);
  } catch (error) {
    console.log(`An exception has occurred while attempting to start Bun.serve ${error}`);
  }

  try {
    await initializeGrpcServer(mongoClient, '8500');
  } catch (error) {
    console.log(
      `An exception has occurred while attempting to start initializeGrpcServer ${error}`,
    );
  }
})();
