import { Handler } from "aws-lambda"
import { parseUnits } from "ethers"
import * as Sentry from "@sentry/serverless"

export function wrapSentryHandlerIfNeeded(handler: Handler) {
    const SENTRY_DSN = process.env.SENTRY_DSN
    if (SENTRY_DSN) {
        Sentry.AWSLambda.init({
            dsn: SENTRY_DSN,
        })
        return Sentry.AWSLambda.wrapHandler(handler)
    }

    return handler
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getRandomNumber(min: number, max: number, percision = 18) {
    const fixed = (Math.random() * (max - min) + min).toFixed(percision)
    return Number(fixed)
}

export function getRandomAmount(min: number, max: number, decimals = 18, precision = 1) {
    const amount = parseUnits(getRandomNumber(min, max, precision).toString(), decimals)
    return amount
}
