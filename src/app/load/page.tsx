import { FC } from "react";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const Page: FC = async () => {
  await sleep(1000);
  return <div>loading Page...</div>;
};

export default Page;
