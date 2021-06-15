import fs from "fs-extra";
import path from "path";

export interface Storage {
  read(name: string): Promise<any>;

  write(name: string, value: any): Promise<void>;

  delete(name: string): Promise<void>;
}

export class FileStorage implements Storage {
  public dir: string;

  constructor(public homeDir: string) {
    this.dir = path.resolve(homeDir);
  }

  async read(name: string) {
    const file = path.resolve(this.dir, name);
    await fs.ensureFile(file);
    return (await fs.readJson(file, { throws: false })) || {};
  }

  async write(name: string, value: any) {
    const file = path.resolve(this.dir, name);
    await fs.ensureFile(file);
    await fs.writeJson(file, value);
  }

  async delete(name: string) {
    const file = path.resolve(this.dir, name);
    await fs.remove(file);
  }
}

export class MemStorage implements Storage {
  public store: any = {};

  async read(name: string) {
    return this.store[name];
  }

  async write(name: string, value: any) {
    this.store[name] = value;
  }

  async delete(name: string) {
    this.store[name] = {};
  }
}
