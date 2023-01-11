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

export enum AVEngineName {
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
    [key in AVEngine]: {
      sigfiledate: string;
      resulttext: string;
      malwarename: string;
      cssresultclass: string;
    };
  };
  filescanjobmeta: unknown[]; // I was unable to get this to be a non-empty array
}

export async function createJob(file: Buffer, fileName: string) {
  const fileUploadData = new FormData();
  fileUploadData.append("sample-file[]", file, fileName);

  const fileUploadResponse: FileUploadResponse = await fetch(
    "https://virusscan.jotti.org/en-US/submit-file?isAjax=true",
    {
      method: "POST",
      body: fileUploadData,
    },
    FetchResultTypes.JSON
  );

  const jobId = path.basename(fileUploadResponse.redirecturl);
  await fetch(`https://virusscan.jotti.org/en-US/filescanjob/${jobId}`);

  return jobId;
}

export async function getProgress(jobId: string) {
  const jobProgress: JobProgress = await fetch(
    `https://virusscan.jotti.org/ajax/filescanjobprogress.php?id=${jobId}&lang=en-US&_=${Date.now()}`,
    FetchResultTypes.JSON
  );
  
  return jobProgress;
}

export function getResults(jobId: string) {
  return new Promise<JobProgress>((resolve) => {
    const jobRefreshInterval = setInterval(async () => {
      const jobProgress = await getProgress(jobId);

      if (
        knownEngines.every((engine) =>
          Object.keys(jobProgress.filescanner).includes(engine)
        )
      ) {
        clearInterval(jobRefreshInterval);
        resolve(jobProgress);
      }
    }, 1000);
  });
}
