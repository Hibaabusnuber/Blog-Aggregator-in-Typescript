import {createUser,getUserByName,deleteAllUsers,getUsers} from "./lib/db/queries/users.js";
import { setUser, readConfig } from "./config.js";
import { fetchFeed } from "./rss.js";
import { Feed } from "./lib/db/schema.js";
import { User } from "./lib/db/schema.js";
import { getFeedByUrl, getFeedsWithUsers } from "./lib/db/queries/feeds.js";
import { createFeed } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./lib/db/queries/feedFollows.js";
import { scrapeFeeds } from "./aggregator.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";


type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type CommandsRegistry = Record<string, CommandHandler>;
type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;


function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
) {
  registry[cmdName] = handler;
}


async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

function printFeed(feed: Feed, user: User) {
  console.log(`Feed ID: ${feed.id}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
}


async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const limit = args.length > 0 ? parseInt(args[0]) : 2;

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`${post.title}`);
    console.log(post.url);
    console.log("");
  }
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("time_between_reqs required");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(`Collecting feeds every ${args[0]}`);

  await scrapeFeeds().catch(console.error);

  const interval = setInterval(() => {
    scrapeFeeds().catch(console.error);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}


async function handlerFeeds(cmdName: string, ...args: string[]) {
  const feeds = await getFeedsWithUsers();

  for (const feed of feeds) {
    console.log(`Name: ${feed.feedName}`);
    console.log(`URL: ${feed.feedUrl}`);
    console.log(`User: ${feed.userName}`);
    console.log("");
  }
}

async function handlerAddFeed(cmdName: string, ...args: string[]) {
  if (args.length < 2) {
    throw new Error("addfeed requires name and url");
  }

  const name = args[0];
  const url = args[1];

  const config = readConfig();

  if (!config.currentUserName) {
    throw new Error("Current user not set");
  }

  const user = await getUserByName(config.currentUserName);

  if (!user) {
    throw new Error("Current user not found");
  }

  const feed = await createFeed(name, url, user.id);

  printFeed(feed, user);


await createFeedFollow(user.id, feed.id);

console.log(`${user.name} added feed ${feed.name}`);



}

async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("Username required");
  }

  const name = args[0];

  const user = await getUserByName(name);

  if (!user) {
    throw new Error("User does not exist");
  }

  setUser(name);

  console.log(`Logged in as ${name}`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("Username required");
  }

  const name = args[0];

  const existingUser = await getUserByName(name);

  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await createUser(name);

  setUser(name);

  console.log("User created:");
  console.log(user);
}

async function handlerReset(cmdName: string, ...args: string[]) {
  await deleteAllUsers();

  console.log("Database reset.");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const users = await getUsers();

  const config = readConfig();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("URL required");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("Feed not found");
  }

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(`${follow.userName} is now following ${follow.feedName}`);
}

async function handlerFollowing(
  cmdName: string,
  user: User
) {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(follow.feedName);
  }
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("URL required");
  }

  const url = args[0];

  await deleteFeedFollow(user.id, url);

  console.log("Unfollowed feed");
}

function middlewareLoggedIn(
  handler: UserCommandHandler
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("Current user not set");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error("User not found");
    }

    await handler(cmdName, user, ...args);
  };
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration format");
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("Invalid unit");
  }
}

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", handlerAddFeed);
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "unfollow",middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry,"browse",middlewareLoggedIn(handlerBrowse));

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Not enough arguments");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  process.exit(0);

}

main();