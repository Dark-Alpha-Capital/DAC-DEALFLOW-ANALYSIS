import { FlowProducer } from "bullmq";
import { connection } from "./bullmq-connection";

/**
 * FlowProducer singleton for creating job flows.
 * Flows allow parent-child job relationships where the parent
 * waits for all children to complete before processing.
 */
export const flowProducer = new FlowProducer({ connection });

flowProducer.on("error", (err) => {
  console.error("[FlowProducer] Error:", err);
});
