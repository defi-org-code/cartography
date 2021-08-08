import { Indexer } from "./indexer";

class Static extends Indexer {
  prefix(): string {
    return "cartography:static";
  }

  async updateIndex() {
    await this.redis.send_command("HMSET");
  }

  kTokens() {
    return `${this.prefix()}:tokens`;
  }
}
