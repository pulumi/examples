import React from 'react';
import CMS from 'netlify-cms-app';

const NetlifyCMS = () => {
  React.useEffect(() => {
    console.log(`CMS [${process.env.NODE_ENV}]`, CMS, )

    CMS.init()
  })

  return <div id="nc-root" />
};

export default NetlifyCMS;
