import { db } from "..";
import { feedFollows, feeds, users } from "../schema";
import { eq } from "drizzle-orm";

export async function createFeedFollow(userId: string, feedId: string) {
  const [newFollow] = await db
    .insert(feedFollows)
    .values({
      userId,
      feedId,
    })
    .returning();

  const result = await db
    .select({
      feedName: feeds.name,
      userName: users.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.id, newFollow.id));

  return result[0];
}

export async function getFeedFollowsForUser(userId: string) {
  return await db
    .select({
      feedName: feeds.name,
      userName: users.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.userId, userId));
}
export async function deleteFeedFollow(
  userId: string,
  url: string
) {
  const feed = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url));

  if (!feed[0]) {
    throw new Error("Feed not found");
  }

  await db
    .delete(feedFollows)
    .where(
      eq(feedFollows.userId, userId)
    );
}