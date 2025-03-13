import Bun from 'bun';
import { renderAltairAssets } from '../graphql/altair';
import { bootstrapYoga, schema } from '../graphql/schema';
import { createWebsocketHandler } from '../graphql/ws';
import { parseApplicationConfig } from '../common/utils';

(async (): Promise<void> => {
  const appConfig = await parseApplicationConfig();
  const yoga = await bootstrapYoga(appConfig);

  try {
    Bun.serve({
      fetch: async (request: Request, server: Bun.Server): Promise<Response> => {
        if (server.upgrade(request)) {
          return new Response();
        }

        const url = new URL(request.url);

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
    `);

  } catch (error) {
    console.log(`An exception has occurred ${error}`);
  } 
})();
