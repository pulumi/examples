import "./App.css";
import React, { Fragment } from "react";

// components

import VotingComponent from "./components/VotingComponent";

function App() {
  return (
    <Fragment>
      <div className="container">
        <VotingComponent />
      </div>
    </Fragment>
  );
}

export default App;
