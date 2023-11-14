import { Handler } from "aws-lambda"
import * as Sentry from "@sentry/serverless"

export function wrapSentryHandlerIfNeeded(handler: Handler): Handler {
    const SENTRY_DSN = process.env.SENTRY_DSN
    if (SENTRY_DSN) {
        Sentry.AWSLambda.init({
            dsn: SENTRY_DSN,
        })
        return Sentry.AWSLambda.wrapHandler(handler)
    }

    return handler
}
