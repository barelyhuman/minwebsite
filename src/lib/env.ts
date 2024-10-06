import process from "node:process"

export const appConfig = {
  updateDelay: Number(process.env.UPDATE_DELAY) ?? 10_000,
}
