import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
  if (!rawConfig.db_url) {
    throw new Error("Invalid config file: missing db_url");
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}

function writeConfig(cfg: Config): void {
  const filePath = getConfigFilePath();

  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  fs.writeFileSync(filePath, JSON.stringify(rawConfig, null, 2));
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();

  const data = fs.readFileSync(filePath, { encoding: "utf-8" });

  const rawConfig = JSON.parse(data);

  return validateConfig(rawConfig);
}

export function setUser(username: string): void {
  const cfg = readConfig();
  cfg.currentUserName = username;
  writeConfig(cfg);
}