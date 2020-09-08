import React from "react";
import "./styles.css";
import { HorizonTable } from "./HorizonTable";
import faker from "faker";

export default function App() {
  const generateNames = (amount) => {
    const names = [];

    for (let i = 0; i < amount; i++) {
      names.push({
        first: faker.name.firstName(),
        last: faker.name.lastName()
      });
    }
    return names;
  };
  return (
    <div className="App">
      <HorizonTable
        data={generateNames(500)}
        pageSize={500}
        columns={[
          {
            Header: "First",
            accessor: "first"
          },
          {
            Header: "Last",
            accessor: "last"
          }
        ]}
      />
    </div>
  );
}
