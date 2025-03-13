import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { ApplicationConfig } from '../config/types';

export const parseApplicationConfig = async (): Promise<ApplicationConfig> => {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      config: {
        type: 'string',
        short: 'c',
      },
    },
    strict: false,
    allowPositionals: true,
  });

  const configPathFromArgs = values.config as string;
  let config: ApplicationConfig;

  if (existsSync(configPathFromArgs)) {
    console.log(`Bootstrapping Application using path provided from Args ${configPathFromArgs}`);
    config = await import(configPathFromArgs);
  } else {
    const defaultConfigPath = join(import.meta.dir, '../', 'config/config.toml');
    console.log(`Bootstrapping Application using Default path ${defaultConfigPath}`);

    if (existsSync(defaultConfigPath)) {
      config = await import(defaultConfigPath);
    } else {
      throw new Error(
        `Config passed from ARGS or default config cannot be found: Tried:\n- ${configPathFromArgs}\n- ${defaultConfigPath}`,
      );
    }
  }
  return config;
};
