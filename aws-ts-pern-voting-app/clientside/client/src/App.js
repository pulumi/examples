import React, { Fragment } from "react";
import "./App.css";

//components

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
