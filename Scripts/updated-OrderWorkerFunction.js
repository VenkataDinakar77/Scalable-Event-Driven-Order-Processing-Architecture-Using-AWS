//This is the updated OrderWorkerFunction.js file that includes the new business rule for handling orders with an amount greater than 10,000. 
// It marks such orders as FAILED in DynamoDB without retrying, while still handling technical failures by throwing errors for SQS to retry and eventually send to DLQ.
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient();
const tableName = process.env.ORDERS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Received SQS event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const body = record.body;
    let order;

    try {
      order = JSON.parse(body);
    } catch (error) {
      console.error("Failed to parse message body as JSON:", body);
      // Throwing here will cause SQS to retry, then send to DLQ
      throw error;
    }

    const {
      orderId,
      customerName,
      amount,
      product,
      notes,
      processingStartedAt,
    } = order;

    console.log(
      `Worker processing order ${orderId} for ${customerName}, amount: ${amount}, product: ${product}`
    );

    // Simulated TECHNICAL failure: if notes contain "FAIL", throw an error.
    // This shows SQS retries + DLQ behavior.
    if (
      typeof notes === "string" &&
      notes.toUpperCase().includes("FAIL")
    ) {
      console.error(
        `Simulated technical failure for order ${orderId} (notes contained 'FAIL')`
      );
      // Throw error so SQS will retry and eventually move to DLQ
      throw new Error(`Simulated worker failure for order ${orderId}`);
    }

    // Simulated BUSINESS rule:
    // If amount > 10000, we mark the order as FAILED in DynamoDB
    // (but we don't retry, because this is not a transient error).
    const now = new Date().toISOString();

    if (amount > 10000) {
      const failCommand = new UpdateItemCommand({
        TableName: tableName,
        Key: {
          orderId: { S: orderId },
        },
        UpdateExpression:
          "SET #s = :status, failureReason = :reason, failedAt = :failedAt",
        ExpressionAttributeNames: {
          "#s": "status",
        },
        ExpressionAttributeValues: {
          ":status": { S: "FAILED" },
          ":reason": { S: "AMOUNT_ABOVE_LIMIT" },
          ":failedAt": { S: now },
        },
      });

      try {
        await ddbClient.send(failCommand);
        console.log(
          `Order ${orderId} marked as FAILED (amount above limit)`
        );
      } catch (error) {
        console.error(
          `Failed to update order ${orderId} to FAILED:`,
          error
        );
        // In a real system, you might still throw here. For this lab we'll log and continue.
      }

      // Continue to next message; this business failure should not be retried.
      continue;
    }

    // Normal SUCCESS path: mark order as COMPLETED
    const completeCommand = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        orderId: { S: orderId },
      },
      UpdateExpression:
        "SET #s = :status, completedAt = :completedAt",
      ExpressionAttributeNames: {
        "#s": "status",
      },
      ExpressionAttributeValues: {
        ":status": { S: "COMPLETED" },
        ":completedAt": { S: now },
      },
    });

    try {
      await ddbClient.send(completeCommand);
      console.log(`Order ${orderId} marked as COMPLETED by worker.`);
    } catch (error) {
      console.error(
        `Failed to update order ${orderId} to COMPLETED:`,
        error
      );
      // Throwing here would cause retries & possibly DLQ for a technical failure
      throw error;
    }
  }

  // If we reach here without throwing, SQS considers all records processed
  return {};
};