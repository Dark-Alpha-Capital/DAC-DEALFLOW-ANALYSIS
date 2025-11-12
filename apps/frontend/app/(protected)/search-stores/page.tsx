import { googleGenAI } from "@/lib/ai/available-models";
import React from "react";

const SearchStorespage = async () => {
  const fileSearchStores = await googleGenAI.fileSearchStores.list();

  return (
    <div>
      <div>{JSON.stringify(fileSearchStores)}</div>
    </div>
  );
};

export default SearchStorespage;
