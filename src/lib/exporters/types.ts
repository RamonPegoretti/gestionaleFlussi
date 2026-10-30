import type { ISODate } from "../dates";
import type { MonthMovement } from "../movements";

export type ExportStructure = {
  name: string;
  istatCode: string;
  comune: string;
  beds: number;
};

export type ExportInput = {
  structure: ExportStructure;
  movement: MonthMovement;
  openingPeriods: { start: ISODate; end: ISODate }[];
};

export type ExportFile = {
  filename: string;
  contentType: string;
  data: Uint8Array;
};

// One exporter per region. v1 ships only Veneto (ISTAT IST_00139 layout); other
// regions (Trentino, Alto Adige, Lombardia...) get their own exporter later.
export type Exporter = {
  id: string;
  label: string;
  export(input: ExportInput): Promise<ExportFile>;
};
