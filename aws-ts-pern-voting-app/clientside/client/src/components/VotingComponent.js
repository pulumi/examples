import React, { Fragment, useEffect, useState } from "react";
const fullServerUrl = "http://" + window.SERVER_URL + ":5000/voting";

const ListChoices = () => {
  const [choices, setChoices] = useState([]);

  const getChoices = async () => {
    try {
      const response = await fetch(fullServerUrl);
      const jsonData = await response.json();

      setChoices(jsonData);
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    getChoices();
  }, []);

  return (
    <Fragment>
      <h1 className="text-center mt-5">Pulumi Voting App</h1>
      {" "}
      <table className="table mt-5 text-center">
        <thead>
          <tr>
            <th>Choice</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          {choices.map(choice => (
            <tr key={choice.choice_id}>
              <td>{choice.text}</td>
              <td>{choice.vote_count}</td>
              <td>
                <button
                  className="btn btn-success"
                  onClick={() => castVote(choice.choice_id)}
                >
                  Vote
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Fragment>
  );
};

async function castVote(id) {
  try {
    await fetch(fullServerUrl +`/${id}`, {method: "POST"});
    window.location = "/";
  } catch (error) {
    console.error(error.message);
  }
}

export default ListChoices;
