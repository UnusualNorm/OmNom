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
      // headers: {
      //   Accept: "application/json, text/javascript, */*;",
      //   "Accept-Encoding": "gzip, deflate, br",
      //   "Accept-Language": "en-US,en;",
      //   // Cookie: "sessionid=0flnbvm93ah6jpmkrp8flmbhrp; lang=en-US",
      //   Host: "virusscan.jotti.org",
      //   Origin: "https://virusscan.jotti.org",
      //   Referer: "https://virusscan.jotti.org/en-US/scan-file",
      //   "Content-Type": "multipart/form-data;",
      //   "User-Agent":
      //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      //   "X-Requested-With": "XMLHttpRequest",
      // },
    },
    FetchResultTypes.JSON
  );

  if (fileUploadResponse.redirecturl == "/en-US") throw new Error();

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
