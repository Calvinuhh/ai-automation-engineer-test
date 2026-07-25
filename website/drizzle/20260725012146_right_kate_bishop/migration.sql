CREATE TYPE "listicle_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "listicles" (
	"id" serial PRIMARY KEY,
	"product_url" varchar(2048) NOT NULL,
	"reference_url" varchar(2048) NOT NULL,
	"session_token" varchar(255) DEFAULT '' NOT NULL,
	"status" "listicle_status" DEFAULT 'pending'::"listicle_status" NOT NULL,
	"output_path" varchar(500),
	"error_message" varchar(2000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY,
	"session_token" varchar(255) NOT NULL UNIQUE,
	"file_name" varchar(500) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" varchar(100) NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
