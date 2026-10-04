Employee Transaction Processing Platform

A Spring Boot based Employee Transaction Processing Platform for managing employee transactions, processing pending transactions using Spring Batch, generating daily summaries, and storing data in PostgreSQL.

The project is designed as a practical learning project covering:

Java 17
Spring Boot
Spring Web / REST APIs
Spring Data JPA
PostgreSQL
Spring Batch
Scheduled processing
Docker
Jenkins CI/CD
Azure PostgreSQL
Azure container deployment
PySpark for future data analysis
1. Project Overview

Employees submit expense or transaction records through REST APIs.

The Spring Boot application stores these transactions in PostgreSQL with an initial status of:

PENDING

Spring Batch processes the pending transactions and validates them.

The processing flow is:

Employee
|
v
Spring Boot REST API
|
v
PostgreSQL
|
| PENDING Transactions
v
Spring Batch
|
+----> Validate Transaction
|
+----> Calculate / Transform
|
+----> VALID / INVALID
|
v
PostgreSQL
|
v
Daily Summary
2. Architecture
   ┌─────────────────────┐
   │       Client        │
   │ Postman / React UI  │
   └──────────┬──────────┘
   │
   │ REST
   ▼
   ┌─────────────────────┐
   │    Spring Boot      │
   │      REST API       │
   └──────────┬──────────┘
   │
   ┌─────────────┴─────────────┐
   │                           │
   ▼                           ▼
   ┌─────────────────┐        ┌─────────────────┐
   │ Spring Data JPA │        │  Spring Batch   │
   └────────┬────────┘        └────────┬────────┘
   │                          │
   └────────────┬─────────────┘
   ▼
   ┌─────────────────────┐
   │ Azure PostgreSQL    │
   │    employee-db      │
   └─────────────────────┘
3. Technology Stack
   Technology	Purpose
   Java 17	Application development
   Spring Boot	Application framework
   Spring Web	REST APIs
   Spring Data JPA	Database access
   Hibernate	ORM
   PostgreSQL	Database
   Spring Batch	Transaction processing
   Gradle	Build tool
   Lombok	Reduce boilerplate code
   Docker	Containerization
   Jenkins	CI/CD
   Azure	Cloud infrastructure
   PySpark	Future data analysis
4. Project Structure
   employee-transaction-platform/
   │
   ├── src/
   │   ├── main/
   │   │   ├── java/
   │   │   │   └── com/
   │   │   │       └── example/
   │   │   │           └── transaction/
   │   │   │               │
   │   │   │               ├── EmployeeTransactionApplication.java
   │   │   │               │
   │   │   │               ├── controller/
   │   │   │               │   ├── EmployeeController.java
   │   │   │               │   ├── TransactionController.java
   │   │   │               │   ├── ReportController.java
   │   │   │               │   └── BatchController.java
   │   │   │               │
   │   │   │               ├── dto/
   │   │   │               │   ├── TransactionRequest.java
   │   │   │               │   ├── TransactionResponse.java
   │   │   │               │   └── DailySummaryResponse.java
   │   │   │               │
   │   │   │               ├── entity/
   │   │   │               │   ├── Employee.java
   │   │   │               │   ├── Transaction.java
   │   │   │               │   └── DailySummary.java
   │   │   │               │
   │   │   │               ├── repository/
   │   │   │               │   ├── EmployeeRepository.java
   │   │   │               │   ├── TransactionRepository.java
   │   │   │               │   └── DailySummaryRepository.java
   │   │   │               │
   │   │   │               ├── service/
   │   │   │               │   ├── EmployeeService.java
   │   │   │               │   ├── TransactionService.java
   │   │   │               │   ├── ReportService.java
   │   │   │               │   └── BatchService.java
   │   │   │               │
   │   │   │               └── batch/
   │   │   │                   ├── config/
   │   │   │                   │   └── BatchConfig.java
   │   │   │                   ├── processor/
   │   │   │                   │   └── TransactionItemProcessor.java
   │   │   │                   ├── writer/
   │   │   │                   │   └── TransactionItemWriter.java
   │   │   │                   └── listener/
   │   │   │                       └── BatchJobListener.java
   │   │   │
   │   │   └── resources/
   │   │       ├── application.yml
   │   │       └── schema.sql
   │   │
   │   └── test/
   │
   ├── Dockerfile
   ├── docker-compose.yml
   ├── Jenkinsfile
   ├── build.gradle
   ├── settings.gradle
   ├── gradlew
   ├── gradlew.bat
   └── README.md
5. Database Design

The application uses three primary tables.

Employees
employees

Columns:

id
employee_id
name
department
email
Transactions
transactions

Columns:

id
employee_id
amount
category
transaction_date
description
status
created_at
processed_at

Transaction status:

PENDING
VALID
INVALID
PROCESSED
Daily Summary
daily_summary

Columns:

id
report_date
total_transactions
valid_transactions
invalid_transactions
total_amount
6. Transaction Validation

Spring Batch validates each pending transaction.

Rule 1 - Amount

Transaction amount must be greater than zero.

amount <= 0
|
v
INVALID
Rule 2 - Employee

The employee must exist in the employees table.

Employee does not exist
|
v
INVALID
Valid transaction

If all validation rules pass:

PENDING
|
v
VALID
7. REST API
   Employee APIs
   Create Employee
   POST /api/employees

Example:

{
"employeeId": "EMP1001",
"name": "Amol Nahire",
"department": "IT",
"email": "amol@example.com"
}
Get All Employees
GET /api/employees
Get Employee
GET /api/employees/{id}

Example:

GET /api/employees/1
Update Employee
PUT /api/employees/{id}
Delete Employee
DELETE /api/employees/{id}
8. Transaction APIs
   Create Transaction
   POST /api/transactions

Example:

{
"employeeId": "EMP1001",
"amount": 2500.50,
"category": "TRAVEL",
"transactionDate": "2026-10-02",
"description": "Client visit"
}

The initial status will be:

PENDING
Get All Transactions
GET /api/transactions
Get Transaction
GET /api/transactions/{id}

Example:

GET /api/transactions/1
Update Transaction
PUT /api/transactions/{id}
Delete Transaction
DELETE /api/transactions/{id}
Get Pending Transactions
GET /api/transactions/pending
9. Report APIs
   Get Daily Reports
   GET /api/reports/daily
   Get Report by Date
   GET /api/reports/daily/{date}

Example:

GET /api/reports/daily/2026-10-02
10. Spring Batch

Spring Batch processes transactions having:

status = PENDING

Processing flow:

                PENDING
                   |
                   v
              ItemReader
                   |
                   v
            ItemProcessor
                   |
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
        VALID             INVALID
          │                 │
          └────────┬────────┘
                   ▼
              ItemWriter
                   |
                   ▼
              PostgreSQL

The main Spring Batch components are:

batch/
│
├── config/
│   └── BatchConfig.java
│
├── processor/
│   └── TransactionItemProcessor.java
│
├── writer/
│   └── TransactionItemWriter.java
│
└── listener/
└── BatchJobListener.java
11. Run Batch Manually

The batch job can initially be triggered manually.

POST /api/batch/run

Using curl:

curl -X POST http://localhost:8080/api/batch/run

Expected response:

Batch job started successfully
12. Azure PostgreSQL Configuration

The application is configured to connect to Azure Database for PostgreSQL.

Current server:

employee-db.postgres.database.azure.com

Default database:

postgres

Default user:

amol

The application uses environment variables instead of storing the password in Git.

13. Environment Variables

Linux/macOS:

export PGHOST=employee-db.postgres.database.azure.com
export PGUSER=amol
export PGDATABASE=postgres
export PGPASSWORD='YOUR_DATABASE_PASSWORD'

Verify:

echo $PGHOST
echo $PGUSER
echo $PGDATABASE

Do not print or commit:

PGPASSWORD
14. Azure PostgreSQL Connection

The application uses:

jdbc:postgresql://${PGHOST}:5432/${PGDATABASE}?sslmode=require

SSL is required for the Azure PostgreSQL connection.

Example:

jdbc:postgresql://employee-db.postgres.database.azure.com:5432/postgres?sslmode=require
15. Application Configuration

application.yml:

spring:

application:
name: employee-transaction-platform

datasource:
url: jdbc:postgresql://${PGHOST:employee-db.postgres.database.azure.com}:5432/${PGDATABASE:postgres}?sslmode=require
username: ${PGUSER:amol}
password: ${PGPASSWORD}
driver-class-name: org.postgresql.Driver

jpa:
hibernate:
ddl-auto: update

    show-sql: false

    properties:
      hibernate:
        format_sql: true

    open-in-view: false

batch:
jdbc:
initialize-schema: always

    job:
      enabled: false

server:
port: 8080

management:
endpoints:
web:
exposure:
include: health,info
16. Prerequisites

Install the following:

Java 17
Git
Gradle
Docker
PostgreSQL client (optional)

Verify Java:

java -version

Expected:

Java 17

Verify Git:

git --version

Verify Docker:

docker --version
17. Clone Repository
    git clone <YOUR_REPOSITORY_URL>

Go to the project:

cd employee-transaction-platform
18. Build Project

Using Gradle wrapper:

./gradlew clean build

For Linux/macOS, if necessary:

chmod +x gradlew

Then:

./gradlew clean build
19. Run Application

Set PostgreSQL variables:

export PGHOST=employee-db.postgres.database.azure.com
export PGUSER=amol
export PGDATABASE=postgres
export PGPASSWORD='YOUR_DATABASE_PASSWORD'

Run:

./gradlew bootRun

Application:

http://localhost:8080
20. Health Check

Spring Boot Actuator provides:

GET /actuator/health

Using curl:

curl http://localhost:8080/actuator/health

Expected:

{
"status": "UP"
}
21. Complete API Test Flow
    Step 1 - Create Employee
    curl -X POST http://localhost:8080/api/employees \
    -H "Content-Type: application/json" \
    -d '{
    "employeeId": "EMP1001",
    "name": "Amol Nahire",
    "department": "IT",
    "email": "amol@example.com"
    }'
    Step 2 - Create Transaction
    curl -X POST http://localhost:8080/api/transactions \
    -H "Content-Type: application/json" \
    -d '{
    "employeeId": "EMP1001",
    "amount": 2500.50,
    "category": "TRAVEL",
    "transactionDate": "2026-10-02",
    "description": "Client visit"
    }'
    Step 3 - Check Pending Transactions
    curl http://localhost:8080/api/transactions/pending
    Step 4 - Run Batch
    curl -X POST http://localhost:8080/api/batch/run
    Step 5 - Check Processed Transactions
    curl http://localhost:8080/api/transactions

The transaction should now have a validation status:

VALID

or:

INVALID
22. Docker

Build the application:

./gradlew clean build

Build Docker image:

docker build -t employee-transaction-platform:latest .

Run:

docker run \
-p 8080:8080 \
-e PGHOST=employee-db.postgres.database.azure.com \
-e PGUSER=amol \
-e PGDATABASE=postgres \
-e PGPASSWORD='YOUR_DATABASE_PASSWORD' \
employee-transaction-platform:latest
23. Docker Compose

The planned Docker architecture is:

┌─────────────────────────┐
│ Spring Boot Container   │
│        :8080            │
└────────────┬────────────┘
│
▼
┌─────────────────────────┐
│ PostgreSQL Container    │
│        :5432            │
└─────────────────────────┘

For the current Azure deployment, however, the Spring Boot application can connect directly to Azure PostgreSQL.

24. Jenkins CI/CD

Future Jenkins pipeline:

Git Push
|
v
Jenkins
|
├── Checkout
|
├── Unit Tests
|
├── Gradle Build
|
├── Docker Build
|
├── Docker Push
|
└── Deploy

Typical commands:

./gradlew clean test
./gradlew clean build
docker build -t employee-transaction-platform .
docker push <REGISTRY>/employee-transaction-platform:<TAG>
25. Azure Deployment

The planned deployment architecture is:

GitHub
|
v
Azure DevOps / Jenkins
|
v
Docker Image
|
v
Azure Container Registry
|
v
AKS
|
v
Spring Boot Application
|
v
Azure PostgreSQL
26. Future Spring Batch Scheduling

The current application is configured for manual batch execution.

Future implementation:

Every day at 11:00 PM
|
v
Spring Scheduler
|
v
Spring Batch
|
v
Process PENDING

Example:

@Scheduled(cron = "0 0 23 * * *")
public void runBatchJob() {
// Launch Spring Batch job
}
27. Future PySpark Integration

After Spring Batch processing, PySpark can be used for data analysis.

PostgreSQL
|
v
Processed Transactions
|
v
PySpark
|
├── Employee Spending
|
├── Department Spending
|
├── Monthly Trends
|
└── Category Analysis

Example analysis:

Department       Total Amount
--------------------------------
IT               1,250,000
HR                 450,000
Finance            780,000
Sales            1,850,000
28. Development Roadmap
    Phase 1
    Java
    |
    v
    Phase 2
    Spring Boot REST APIs
    |
    v
    Phase 3
    PostgreSQL
    |
    v
    Phase 4
    JPA / Hibernate
    |
    v
    Phase 5
    Spring Batch
    |
    v
    Phase 6
    Scheduling
    |
    v
    Phase 7
    Docker
    |
    v
    Phase 8
    Jenkins CI/CD
    |
    v
    Phase 9
    PySpark
    |
    v
    Phase 10
    Azure / Cloud Deployment
29. Security Notes

Never commit database credentials.

Do NOT put this in application.yml:

password: MyRealPassword

Instead:

password: ${PGPASSWORD}

Use environment variables:

export PGPASSWORD='YOUR_DATABASE_PASSWORD'

Also add sensitive files to .gitignore.

Example:

# Gradle
.gradle/
build/

# IDE
.idea/
*.iml
.vscode/

# Environment / secrets
.env
*.env

# Logs
*.log

# OS
.DS_Store
30. Useful Gradle Commands

Clean:

./gradlew clean

Build:

./gradlew build

Run tests:

./gradlew test

Run application:

./gradlew bootRun

Build without tests:

./gradlew build -x test
31. Useful Git Commands

Check status:

git status

Add files:

git add .

Commit:

git commit -m "Add employee transaction platform"

Push:

git push origin master
32. Project Goal

The final goal of this project is to build a production-style transaction processing platform:

                    GitHub
                       |
                       v
                    Jenkins
                       |
                       v
                Docker Image
                       |
                       v
                  Azure ACR
                       |
                       v
                     AKS
                       |
                       v
              Spring Boot REST API
                       |
             ┌─────────┴─────────┐
             │                   │
             v                   v
        REST CRUD           Spring Batch
             │                   │
             └─────────┬─────────┘
                       v
                Azure PostgreSQL
                       |
                       v
                  Processed Data
                       |
                       v
                    PySpark
                       |
                       v
                 Data Analysis

This project is intended to provide hands-on experience with application development, database integration, batch processing, containerization, CI/CD, cloud deployment, and data engineering.