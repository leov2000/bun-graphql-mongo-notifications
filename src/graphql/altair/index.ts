import Bun from 'bun';
import { getDistDirectory, renderAltair } from 'altair-static';
import { ApplicationConfig } from '../../common/config/types';

const altairDistPath: string = getDistDirectory();

const altairHTML = (appConfig: ApplicationConfig): string => {
  return renderAltair({
    baseURL: appConfig.altair.altairBaseURL,
    endpointURL: appConfig.altair.graphQLEndpointURL,
    subscriptionsEndpoint: appConfig.altair.graphQLSubscriptionsEndpoint,
  });
};

export const renderAltairAssets = (
  url: URL,
  appConfig: ApplicationConfig,
): Promise<Response> | Response => {
  if (url.pathname === appConfig.altair.altairEndpointURL) {
    return new Response(altairHTML(appConfig), {
      headers: { 'Content-Type': 'text/html' },
    });
  } else {
    return (async () => {
      const relativePath = url.pathname.replace(appConfig.altair.altairBaseURL, '');
      const fileToServe = `${altairDistPath}/${relativePath}`;

      try {
        const data = await Bun.file(fileToServe).arrayBuffer();
        let contentType = 'application/octet-stream';
        if (relativePath.endsWith('.js')) contentType = 'application/javascript';
        if (relativePath.endsWith('.css')) contentType = 'text/css';
        if (relativePath.endsWith('.svg')) contentType = 'image/svg+xml';
        if (relativePath.endsWith('.png')) contentType = 'image/png';
        if (relativePath.endsWith('.ico')) contentType = 'image/x-icon';

        return new Response(data, {
          headers: { 'Content-Type': contentType },
        });
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    })();
  }
};
