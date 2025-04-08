import { AppMongoClient } from './mongo-client';

const mongoDBHealthCheck = async (mongoClient: AppMongoClient): Promise<boolean> => {
  try {
    const ping = (await mongoClient
      .getDatabase()
      .command({ ping: 1 }, { timeoutMS: 2000 })) as Record<string, number>;

    if (ping.ok === 1) {
      return true;
    } else {
      throw new Error('MongoDB returned unexpected response');
    }
  } catch (err) {
    throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
  }
};

export const mongoDBHealthCheckRequest = async (mongoClient: AppMongoClient) => {
  try {
    await mongoDBHealthCheck(mongoClient);
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Health check error:', err);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: (err as Error).message,
      }),
      {
        status: 503, 
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
