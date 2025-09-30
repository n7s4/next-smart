import { FC, PropsWithChildren } from "react";
import Home from "./page";

const HomeLayout: FC<PropsWithChildren> = ({ children }) => {
  return <div>{children}</div>;
};

export default HomeLayout;
