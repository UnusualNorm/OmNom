import FormData from "form-data";
import { fetch, FetchResultTypes } from "@sapphire/fetch";
import path from "path";

type FileUploadResponse = {
  redirecturl: string;
};

export const knownEngines = [
  "avast",
  "bitdefender",
  "clamav",
  "cyren",
  "drweb",
  "escan",
  "fortinet",
  "fsecure",
  "gdata",
  "ikarus",
  "k7",
  "kaspersky",
  "sophos",
  "trendmicro",
  "vba32",
] as const;

export enum EngineNames {
  "avast" = "Avast",
  "bitdefender" = "Bitdefender",
  "clamav" = "ClamAV",
  "cyren" = "Cyren",
  "drweb" = "Dr.WEB",
  "escan" = "'eScan",
  "fortinet" = "Fortinet",
  "fsecure" = "F-Secure",
  "gdata" = "GData",
  "ikarus" = "Ikarus",
  "k7" = "K7",
  "kaspersky" = "Kaspersky",
  "sophos" = "Sophos",
  "trendmicro" = "TrendMicro",
  "vba32" = "VBA32",
}

export type AVEngine = (typeof knownEngines)[number];

export interface JobProgress {
  id: string;
  meta: {
    startstamp: string;
    finishstamp: string;
    placeinqueue: number;
    statustext: string;
    noresulttext: string;
  };
  filescanner: {
    [key in AVEngine]?: {
      sigfiledate: string;
      resulttext: string;
      malwarename: string;
      cssresultclass: string;
    };
  };
  filescanjobmeta: unknown[]; // I was unable to get this to be a non-empty array
}

export async function createJob(filename: string, file: Buffer) {
  const form = new FormData();
  form.append("sample-file[]", file, { filename });

  const fileUploadResponse: FileUploadResponse = await fetch(
    "https://virusscan.jotti.org/en-US/submit-file?isAjax=true",
    {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    },
    FetchResultTypes.JSON
  );

  if (fileUploadResponse.redirecturl == "/en-US")
    throw new Error("Failed to upload file...");

  const jobId = path.basename(fileUploadResponse.redirecturl);
  await fetch(`https://virusscan.jotti.org/en-US/filescanjob/${jobId}`);

  return jobId;
}

export const getProgress = (jobId: string): Promise<JobProgress> =>
  fetch(
    `https://virusscan.jotti.org/ajax/filescanjobprogress.php?id=${jobId}&lang=en-US&_=${Date.now()}`,
    FetchResultTypes.JSON
  );

export const getResults = (jobId: string) =>
  new Promise<JobProgress>((resolve) => {
    const jobRefreshInterval = setInterval(async () => {
      const jobProgress = await getProgress(jobId);

      if (knownEngines.every((engine) => engine in jobProgress.filescanner)) {
        clearInterval(jobRefreshInterval);
        resolve(jobProgress);
      }
    }, 1000);
  });
