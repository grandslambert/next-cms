import { promises as fs } from 'fs';

export async function LoadConfig() {
    let serverConfig = [];

    const defaultConfig = await JSON.parse(await fs.readFile(process.cwd() + '/config/default.config.json', 'utf8'));
    try {
        const serverConfigFile = await fs.readFile(process.cwd() + '/config/' + process.env.ENVIRONMENT + '.config.json', 'utf8');
        serverConfig = await JSON.parse(serverConfigFile);
    } catch {
        serverConfig = [];
    }

    if (Object.keys(serverConfig).length > 0) {
        return {...defaultConfig, ...serverConfig};
    } else {
        return defaultConfig;
    }
}
