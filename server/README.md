# Land of the Rair

This is the backend for Land of the Rair.

## Requirements

* Node.js 14+
* MongoDB (or MongoDB Atlas - easier)

## Installation

* `npm install`
* `npm run setup`
* `npm start`

## Environment Variables

Put any environment variables in a [`.env`](https://github.com/motdotla/dotenv) file.

* `DATABASE_URI` - the path to your mongodb database
* `ROLLBAR_TOKEN` - (optional) the POST token for Rollbar
* `WEBHOOK_SECRET` - (optional) the secret passed along to validate webhook pushes
* `BLOCK_REGISTER` - (optional) set this to any value to block registration of new accounts - useful if you require accounts to be manually created for some reason