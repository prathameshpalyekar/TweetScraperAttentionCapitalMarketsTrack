import { Scraper, SearchMode } from 'agent-twitter-client';
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";

dotenv.config();
const sqsClient = new SQSClient({ region: process.env.SQS_REGION });

const scraper = new Scraper({
  fetch: async (url, options) => {
    return fetch(url, {
      ...options,
      proxy: 'http://pcgDyYi4yXltashw:Xxm9k9jku5nga2Wh@geo.iproyal.com:12321',
    })
  },
});

export const handler = async (event) => {
  await scraper.login(
    'Pratham_bot',
    '1@3pratham',
    'prathameshsocial1991@gmail.com'
  );

  for (const record of event.Records) {
    console.log("Received message:", record.messageId);
    const users = JSON.parse(record.body);

    try {
      const tweets = [];
      let count = 0;
      if (Array.isArray(users)) {
        for (const user of users) {
          const userTweets = await processUser(user);
          console.log("counts ############", count++);
          tweets.push(...userTweets);
          console.log(`Added ${userTweets.length} tweets for user ${user.userId}`);
        }
      }

      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/add-tweets`, {
        method: 'POST',
        body: JSON.stringify({ tweets }),
      });

      console.log(response);
      await deleteMessage(record);
    } catch (error) {
      console.error(error);
      await deleteMessage(record);
    }
  }

  return { status: "Success" };
};

async function deleteMessage(record) {
  const deleteParams = {
    QueueUrl: process.env.SQS_QUEUE_URL,
    ReceiptHandle: record.receiptHandle,
  };
  await sqsClient.send(new DeleteMessageCommand(deleteParams));
  console.log("Message deleted successfully messageId:", record.messageId);
}

async function processUser(user) {
  const tweetsResponse = await scraper.getTweetsByUserId(user.userId, 10);

  const tweets = [];
  for await (const tweet of tweetsResponse) {
    console.log(tweet.text); 
    tweets.push(tweet);
  }

  return tweets?.map(tweet => ({
    id: tweet.id,
    createdAt: tweet.timeParsed,
    userId: tweet.userId,
    text: tweet.text,
    likes: tweet.likes,
    retweets: tweet.retweets,
    views: tweet.views,
  }));
}
