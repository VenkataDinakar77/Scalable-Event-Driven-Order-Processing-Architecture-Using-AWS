import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const ddbClient = new DynamoDBClient();
const sqsClient = new SQSClient();

export const handler = async (event) => {
  console.log("Received DynamoDB Stream event:", JSON.stringify(event, null, 2));

  const tableName = process.env.ORDERS_TABLE_NAME;
  const queueUrl = process.env.ORDER_QUEUE_URL;

  const records = event.Records || [];

  for (const record of records) {
    const eventName = record.eventName; // INSERT, MODIFY, REMOVE

    // Only care about new orders
    if (eventName !== "INSERT") {
      console.log(`Skipping event ${eventName}`);
      continue;
    }

    const newImage = record.dynamodb.NewImage;
    if (!newImage) {
      console.log("No NewImage found, skipping");
      continue;
    }

    const orderId = newImage.orderId.S;
    const customerName = newImage.customerName.S;
    const amount = Number(newImage.amount.N);
    const product = newImage.product.S;
    const notes = newImage.notes?.S || "";
    const createdAt = newImage.createdAt.S;

    console.log(
      `ProcessOrderFunction picked up order ${orderId} (${product}) amount: ${amount}`
    );

    // 1) Mark the order as PROCESSING
    const processingStartedAt = new Date().toISOString();

    const updateParams = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        orderId: { S: orderId },
      },
      UpdateExpression:
        "SET #s = :status, processingStartedAt = :processingStartedAt",
      ExpressionAttributeNames: {
        "#s": "status",
      },
      ExpressionAttributeValues: {
        ":status": { S: "PROCESSING" },
        ":processingStartedAt": { S: processingStartedAt },
      },
    });

    try {
      await ddbClient.send(updateParams);
      console.log(
        `Order ${orderId} marked as PROCESSING at ${processingStartedAt}`
      );
    } catch (error) {
      console.error(`Failed to update order ${orderId} to PROCESSING:`, error);
      // In a real system, you might stop here or send to a different queue.
      // For this lab we still try to send to SQS.
    }

    // 2) Publish a message to SQS for downstream processing
    const sqsPayload = {
      orderId,
      customerName,
      amount,
      product,
      notes,
      createdAt,
      processingStartedAt,
    };

    const sendCommand = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(sqsPayload),
    });

    try {
      await sqsClient.send(sendCommand);
      console.log(
        `Order ${orderId} sent to SQS queue for worker processing`
      );
    } catch (error) {
      console.error(`Failed to send order ${orderId} to SQS:`, error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Stream processed and sent to SQS" }),
  };
};