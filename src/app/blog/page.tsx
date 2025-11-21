"use client";
import React, { FC, useEffect } from "react";
import Herder from "./component/herder";
import Footer from "./component/footer";
import Content from "./component/content";
import styles from "./css/index.module.css";

const Blog: FC = () => {
  return (
    <div
      className={`flex flex-col h-screen overflow-y-auto ${styles.hideScrollbar}`}
    >
      <div className="flex flex-col flex-1">
        <div className=" h-[50px]">
          <Herder />
        </div>
        <div className=" flex-1">
          <Content />
        </div>
      </div>
      <div className=" h-[50px]">
        <Footer />
      </div>
    </div>
  );
};

export default Blog;
