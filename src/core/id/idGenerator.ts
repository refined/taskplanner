import { ConfigManager } from '../config/configManager.js';

export class IdGenerator {
  constructor(private configManager: ConfigManager) {}

  next(): string {
    return this.configManager.getNextId();
  }

  parseId(id: string): { prefix: string; number: number } | null {
    const match = id.match(/^([A-Z]+)-(\d+)$/);
    if (!match) {
      return null;
    }
    return { prefix: match[1], number: parseInt(match[2], 10) };
  }
}
