'use client';
import { useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// Row Data Interface
interface IRow {
  make: string;
  model: string;
  price: number;
  electric: boolean;
}

export const GridExample = () => {
  const [rowData] = useState<IRow[]>([
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Mercedes", model: "EQA", price: 48890, electric: true },
    { make: "Fiat", model: "500", price: 15774, electric: false },
    { make: "Nissan", model: "Juke", price: 20675, electric: false },
  ]);

  const [colDefs] = useState<(ColDef<IRow> | ColGroupDef<IRow>)[]>([
    {
      headerName: "Car Info",
      children: [
        { field: "make" },
        { field: "model" },
      ],
    },
    {
      headerName: "Details",
      children: [
        { field: "price" },
        { field: "electric" },
      ],
    },
  ]);

  const defaultColDef: ColDef = {
    flex: 1,
  };

  return (
    <div
      className="ag-theme-alpine"
      style={{ width: "100%", height: "500px" }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
      />
    </div>
  );
};