import { getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feeds.js";
import { fetchFeed } from "./rss.js";
import { createPost } from "./lib/db/queries/posts.js";

export async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    console.log("No feeds available");
    return;
  }

  console.log(`Fetching feed: ${feed.name}`);

  await markFeedFetched(feed.id);

  const rss = await fetchFeed(feed.url);

for (const item of rss.channel.item) {
  try {
    const published = item.pubDate
      ? new Date(item.pubDate)
      : null;

    await createPost(
      item.title,
      item.link,
      item.description ?? null,
      published,
      feed.id
    );
  } catch (err) {
    // ignore duplicate posts
  }
}
}