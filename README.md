# Gator CLI RSS Aggregator

Gator is a command line RSS feed aggregator built with Node.js, TypeScript, PostgreSQL, and Drizzle ORM.

It allows users to register, follow RSS feeds, aggregate posts from those feeds, and browse them directly from the terminal.

## Requirements

* Node.js 18+
* PostgreSQL
* npm
* drizzle-kit

## Installation

Clone the repository:

git clone https://github.com/Hibaabusnuber/Blog-Aggregator-in-Typescript.git
cd gator

Install dependencies:

npm install

## Database Setup

Create a PostgreSQL database:

createdb gator

Run migrations:

npx drizzle-kit generate
npx drizzle-kit migrate

## Configuration

Create a config file (example):

{
"dbUrl": "postgres://username:password@localhost:5432/gator",
"currentUserName": ""
}

## Running the CLI

npm run start <command>

## Commands

Register a user

npm run start register <username>

Login

npm run start login <username>

Add a feed

npm run start addfeed <name> <url>

Follow a feed

npm run start follow <url>

List feeds

npm run start feeds

Show followed feeds

npm run start following

Browse posts

npm run start browse

Run aggregator

npm run start agg 1m

## Example RSS Feeds

https://techcrunch.com/feed/
https://news.ycombinator.com/rss
https://www.boot.dev/blog/index.xml

## Author

Hiba – Computer Engineering student at An-Najah National University.

