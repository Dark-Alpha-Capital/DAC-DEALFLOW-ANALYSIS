import React, { Suspense } from "react";
import ChatBotDemo from "./chatbot-demo";

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatBotDemo />
    </Suspense>
  );
};

export default page;
