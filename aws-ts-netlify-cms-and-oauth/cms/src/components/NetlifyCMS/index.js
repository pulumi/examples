import CMS from "netlify-cms-app";
import React from "react";

const NetlifyCMS = () => {
  React.useEffect(() => {
    console.log(`CMS [${process.env.NODE_ENV}]`, CMS );

    CMS.init();
  });

  return <div id="nc-root" />;
};

export default NetlifyCMS;
