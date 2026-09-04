
# Event-Driven Order Processing System on AWS

To build a serverless, event-driven order pipeline using AWS services.

## Overview

A growing e-commerce company processes hundreds of customer orders each day. Each order requires multiple backend operations, including recording the order, performing business validations, processing tasks asynchronously, handling failures and retries, and notifying the team when issues occur. Currently, a single backend server is responsible for handling all of these operations.

This centralized approach creates several challenges:

- The system becomes slow and less responsive during peak traffic.
- Failed orders are difficult to identify and track.
- A single failure can interrupt or block the entire request.
- There is no automated retry mechanism for failed operations.
- High-value orders are not given any priority or special handling.
- There are no automated alerts to notify the team when failures occur.

I have redesigned the entire order workflow using AWS managed services that support:

- Instant order submission
- Asynchronous processing
- Dead-letter handling
- Event-based routing
- High-value order isolation
- Alerts when failures occur

To achieve the above mentioned solution, deployed serverless, event-driven order pipeline using AWS services. Orders flow through API Gateway and Lambda into DynamoDB, trigger downstream processing via Streams, move through SQS for retries, route high-value items with EventBridge Pipes, and surface failures through a DLQ, CloudWatch alarms, and SNS alerts. The result is a scalable, reliable backend with no servers to manage. 


## About this project

In this hands-on project, I performed the following tasks:

- Build a **frontend order submission app** (hosted on local system)
- Store orders and track their status in **DynamoDB**
- Add **SQS** to handle retries and background processing
- Build worker Lambdas that update order status and enforce business rules
- Route high-value orders using **EventBridge Pipes**
- Add a **DLQ** to capture unprocessed messages
- Configure **CloudWatch Alarms & SNS** for real-time alerts

## AWS services used:

- **Amazon API Gateway** - Order submission endpoint
- **AWS Lambda** - Business logic and workers
- **Amazon DynamoDB** - Order storage
- **DynamoDB Streams** - Real-time event triggers
- **Amazon SQS** - Queueing and retries
- **Dead-Letter Queue (DLQ)** - Failure isolation
- **Amazon EventBridge Pipes** - Conditional routing
- **Amazon SNS** - Failure notifications
- **Amazon CloudWatch** - Metrics and alarms










## Architectural Diagram

![App Screenshot](https://github.com/VenkataDinakar77/Scalable-Event-Driven-Order-Processing-Architecture-Using-AWS/blob/91ad31bfba6e09845665fd4ba2dc162721dd7111/Event-Driven-Order-Processing-Architecture.png)


## End-to-End Order Processing Workflow

The application follows a fully serverless, event-driven architecture in which each component performs a specific responsibility and communicates with the next stage through events or queues.

1. **Customer Submits an Order**

The customer uses the frontend web application to enter and submit their order details. The frontend sends the order request to an Amazon API Gateway endpoint, which provides the public HTTP interface for the application.

2. **API Gateway Invokes Lambda**

API Gateway receives the HTTP request and invokes an AWS Lambda function. The Lambda function validates the incoming request, generates an order ID, applies initial business logic, and prepares the order for storage.

3. **Order Stored in DynamoDB**

The Lambda function stores the order in Amazon DynamoDB. The order record contains important information such as the order ID, customer details, order value, and current processing status.

For example:

PENDING → PROCESSING → COMPLETED

If the order is created successfully, the API returns a response to the frontend so the customer can see that their order has been received.

4. **DynamoDB Streams Capture Changes**

When an order is inserted or updated in DynamoDB, DynamoDB Streams captures the database change as an event.

This allows downstream components to react to order changes automatically without the application having to directly invoke each processing component.

5. **SQS Provides Asynchronous Processing**

The DynamoDB Stream event triggers downstream processing through Amazon SQS. The queue acts as a buffer between order creation and background processing.

Instead of forcing the customer request to wait for every backend operation, the order can be processed asynchronously.

This provides:

Decoupling between services
Better handling of traffic spikes
Reliable message delivery
Automatic retry capabilities
Failure isolation

6. **Worker Lambda Processes Orders**

A worker AWS Lambda function consumes messages from the SQS queue.

The worker performs the required business validations and processing logic. It then updates the order status in DynamoDB.

For example:

PENDING → PROCESSING → COMPLETED

If the order passes all business rules, the worker marks it as successfully processed.

7. **High-Value Orders Are Routed Separately**

When an order meets the configured high-value criteria, Amazon EventBridge Pipes provides conditional routing.

The Pipe reads the relevant events, applies filtering or enrichment rules, and routes qualifying high-value orders to the appropriate downstream processing target.

This allows high-value orders to receive specialized handling without adding complex routing logic to the main application.

8. **Failed Processing and Automatic Retries**

If a worker Lambda cannot successfully process an order, the message remains eligible for retry through Amazon SQS.

SQS automatically makes the message available for another processing attempt based on the configured retry and visibility-timeout settings.

This prevents temporary failures from immediately becoming permanent order failures.

9. **Dead-Letter Queue Captures Persistent Failures**

If a message continues to fail after the configured number of processing attempts, SQS moves it to a Dead-Letter Queue (DLQ).

The DLQ isolates problematic messages from the main processing queue.

This prevents one continuously failing order from repeatedly blocking or consuming resources from normal orders.

The operations team can later inspect the failed message, identify the root cause, correct the issue, and reprocess the order when appropriate.

10. **CloudWatch Monitors the Pipeline**

Amazon CloudWatch monitors the health and performance of the serverless pipeline.

Metrics can be used to monitor:

Lambda errors and invocations
SQS message counts
Queue processing behavior
Messages entering the DLQ
Processing failures
Overall system health

CloudWatch provides visibility into the system without requiring servers to be manually monitored.

11. **SNS Sends Real-Time Alerts**

Amazon CloudWatch Alarms can be configured to detect abnormal conditions, such as messages accumulating in the DLQ or Lambda errors exceeding a defined threshold.

When an alarm enters a configured alarm state, it publishes a notification to Amazon SNS.

SNS then delivers the alert to the subscribed operations or engineering team, allowing them to investigate failures quickly.

**Complete Workflow**

The overall architecture can be summarized as:

**Customer → Frontend → API Gateway → Lambda → DynamoDB**

**DynamoDB → DynamoDB Streams → SQS → Worker Lambda → DynamoDB**

**High-Value Orders → EventBridge Pipes → Specialized Processing**

**Processing Failure → SQS Retry → Worker Lambda**

**Repeated Failure → DLQ → CloudWatch Alarm → SNS → Operations Team**


## Conclusion

This architecture removes the dependency on a single backend server and distributes each responsibility across independent, scalable AWS services. API Gateway and Lambda handle incoming requests, DynamoDB stores order data, Streams and SQS enable event-driven background processing, EventBridge Pipes provide conditional routing, and the DLQ, CloudWatch, and SNS provide failure isolation, monitoring, and alerting.

The result is a scalable, resilient, and fully event-driven order processing system that can handle traffic spikes, isolate failures, automatically retry transient problems, provide special handling for high-value orders, and notify the engineering team when intervention is required.








## Author

- [@LinkedIn](https://www.github.com/octokatherine)
- Email Id: dinakar.kunduru0414@gmail.com




