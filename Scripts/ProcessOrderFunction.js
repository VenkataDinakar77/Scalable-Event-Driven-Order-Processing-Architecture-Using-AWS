import {
  DynamoDBClient,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient();

export const handler = async (event) => {
  console.log(
    "Received DynamoDB Stream event:",
    JSON.stringify(event, null, 2)
  );

  const tableName = process.env.ORDERS_TABLE_NAME;

  if (!tableName) {
    throw new Error("ORDERS_TABLE_NAME environment variable is not set");
  }

  const records = event.Records || [];

  console.log(`Received ${records.length} DynamoDB stream record(s)`);

  for (const record of records) {
    console.log("Processing record:", JSON.stringify(record, null, 2));

    const eventName = record.eventName;

    console.log(`Event type: ${eventName}`);

    if (eventName !== "INSERT") {
      console.log(`Skipping event ${eventName}`);
      continue;
    }

    const newImage = record.dynamodb?.NewImage;

    if (!newImage) {
      console.log("No NewImage found, skipping");
      continue;
    }

    console.log(
      "NewImage:",
      JSON.stringify(newImage, null, 2)
    );

    const orderId = newImage.orderId?.S;
    const customerName = newImage.customerName?.S;
    const amount = newImage.amount?.N;
    const product = newImage.product?.S;

    if (!orderId) {
      throw new Error("orderId is missing from DynamoDB Stream NewImage");
    }

    console.log(
      `Processing new order: ${orderId}, ` +
      `customer: ${customerName}, ` +
      `product: ${product}, ` +
      `amount: ${amount}`
    );

    const processedAt = new Date().toISOString();

    const command = new UpdateItemCommand({
      TableName: tableName,

      Key: {
        orderId: {
          S: orderId
        }
      },

      UpdateExpression:
        "SET #s = :status, processedAt = :processedAt",

      ExpressionAttributeNames: {
        "#s": "status"
      },

      ExpressionAttributeValues: {
        ":status": {
          S: "PROCESSED"
        },
        ":processedAt": {
          S: processedAt
        }
      }
    });

    try {
      console.log(`Updating order ${orderId}...`);

      await ddbClient.send(command);

      console.log(
        `SUCCESS: Order ${orderId} marked as PROCESSED at ${processedAt}`
      );
    } catch (error) {
      console.error(
        `FAILED: Could not update order ${orderId}`,
        error
      );

      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Stream processed"
    })
  };
};
