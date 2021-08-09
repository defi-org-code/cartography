import { Indexer } from "./indexer";

class Static extends Indexer {
  prefix(): string {
    return "cartography:static";
  }

  async updateIndex() {}

  kTokens() {
    return `${this.prefix()}:tokens`;
  }
}
